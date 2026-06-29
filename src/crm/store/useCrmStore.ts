import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Attachment, CrmData, Person, Report, Severity } from '../types';
import { deleteFile, saveDataUrl } from '../../lib/fileStore';
import { logChangelog } from '../../store/useChangelogStore';
import {
  assignInitial,
  dueDateFor,
  escalate,
  isOverdue,
  makeActivity,
} from '../lib/escalation';
import { buildSeed } from '../lib/seed';

const LS_KEY = 'inspection-crm:data:v1';
const LS_USER_KEY = 'inspection-crm:current-user:v1';

function pickCurrentUser(people: Person[], preferred?: string | null): string {
  if (preferred && people.some((p) => p.name === preferred)) return preferred;
  try {
    const stored = localStorage.getItem(LS_USER_KEY);
    if (stored && people.some((p) => p.name === stored)) return stored;
  } catch {
    /* ignore */
  }
  const sorted = [...people].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
  return sorted[0]?.name ?? '';
}

function persistCurrentUser(name: string) {
  try {
    if (name) localStorage.setItem(LS_USER_KEY, name);
  } catch {
    /* ignore */
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function load(): CrmData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CrmData;
      if (parsed?.version === 1 && Array.isArray(parsed.reports)) {
        // backfill attachments array for reports created before this field existed
        parsed.reports = parsed.reports.map((r) =>
          r.attachments ? r : { ...r, attachments: [] },
        );
        return parsed;
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
  return buildSeed();
}

function save(data: CrmData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

let refCounter = 1000;
function nextRef(reports: Report[]): string {
  const max = reports.reduce((m, r) => {
    const n = parseInt(r.ref.replace(/\D/g, ''), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, refCounter);
  refCounter = max + 1;
  return `INS-${refCounter}`;
}

export type View = 'reports' | 'team';

export interface NewReportInput {
  title: string;
  description: string;
  location: string;
  category: string;
  severity: Severity;
  reporter: string;
}

interface CrmState extends CrmData {
  view: View;
  selectedReportId: string | null;
  currentUser: string;

  setView: (v: View) => void;
  select: (id: string | null) => void;
  setCurrentUser: (name: string) => void;

  createReport: (input: NewReportInput) => void;
  startWork: (reportId: string) => void;
  resolveReport: (reportId: string, note?: string) => void;
  closeReport: (reportId: string) => void;
  reopenReport: (reportId: string) => void;
  escalateReport: (
    reportId: string,
    outcome: 'cannot_repair' | 'declined' | 'reassigned',
    note?: string,
  ) => void;
  addComment: (reportId: string, text: string) => void;
  addAttachment: (reportId: string, attachment: Attachment) => void;
  removeAttachment: (reportId: string, attachmentId: string) => void;

  addPerson: (p: Omit<Person, 'id'>) => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  toggleAvailability: (id: string) => void;

  runAutoEscalation: () => number;
  resetDemo: () => void;
  importData: (data: CrmData) => void;
  exportData: () => CrmData;
}

const initial = load();

export const useCrmStore = create<CrmState>((set, get) => {
  const commit = (people: Person[], reports: Report[]) => {
    const data: CrmData = { version: 1, people, reports };
    save(data);
    set({ people, reports });
  };

  const mapReport = (reportId: string, fn: (r: Report) => Report) => {
    const { reports, people } = get();
    const next = reports.map((r) => (r.id === reportId ? fn(r) : r));
    commit(people, next);
  };

  return {
    ...initial,
    view: 'reports',
    selectedReportId: initial.reports[0]?.id ?? null,
    currentUser: pickCurrentUser(initial.people),

    setView: (view) => set({ view }),
    select: (selectedReportId) => set({ selectedReportId }),
    setCurrentUser: (currentUser) => {
      persistCurrentUser(currentUser);
      set({ currentUser });
    },

    createReport: (input) => {
      const { reports, people, currentUser } = get();
      const reporter = people.some((p) => p.name === input.reporter)
        ? input.reporter
        : pickCurrentUser(people, currentUser);
      const now = Date.now();
      const base: Report = {
        id: uuid(),
        ref: nextRef(reports),
        title: input.title,
        description: input.description,
        location: input.location,
        category: input.category,
        severity: input.severity,
        status: 'new',
        reporter: reporter,
        assigneeId: null,
        escalationLevel: 0,
        attempts: [],
        activity: [
          makeActivity('created', `Report created.`, reporter),
        ],
        createdAt: now,
        updatedAt: now,
        dueAt: dueDateFor(input.severity, now),
        source: 'manual',
        attachments: [],
      };
      const assigned = assignInitial(base, people, currentUser);
      commit(people, [assigned, ...reports]);
      set({ selectedReportId: assigned.id });
      logChangelog({
        category: 'report',
        action: 'Created',
        message: `Report ${assigned.ref} created: ${assigned.title}.`,
        by: reporter,
        refId: assigned.id,
        refLabel: assigned.ref,
      });
    },

    startWork: (reportId) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
        const name =
          people.find((p) => p.id === r.assigneeId)?.name ?? 'Technician';
        logChangelog({
          category: 'report',
          action: 'Started',
          message: `${name} started work on ${r.ref}.`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return {
          ...r,
          status: 'in_progress',
          updatedAt: Date.now(),
          activity: [
            ...r.activity,
            makeActivity('started', `${name} started the repair.`, currentUser),
          ],
        };
      });
    },

    resolveReport: (reportId, note) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
        const name =
          people.find((p) => p.id === r.assigneeId)?.name ?? 'Technician';
        logChangelog({
          category: 'report',
          action: 'Resolved',
          message: `${name} resolved ${r.ref}${note ? `: ${note}` : '.'}`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        const attempts = r.attempts.map((a) =>
          a.personId === r.assigneeId && a.outcome === 'pending'
            ? { ...a, outcome: 'completed' as const, note, closedAt: Date.now() }
            : a,
        );
        return {
          ...r,
          status: 'resolved',
          attempts,
          updatedAt: Date.now(),
          activity: [
            ...r.activity,
            makeActivity(
              'resolved',
              `${name} resolved the report${note ? `: ${note}` : '.'}`,
              currentUser,
            ),
          ],
        };
      });
    },

    closeReport: (reportId) => {
      const { currentUser } = get();
      mapReport(reportId, (r) => {
        logChangelog({
          category: 'report',
          action: 'Closed',
          message: `${r.ref} verified and closed.`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return {
          ...r,
          status: 'closed',
          updatedAt: Date.now(),
          activity: [
            ...r.activity,
            makeActivity('closed', 'Report verified and closed.', currentUser),
          ],
        };
      });
    },

    reopenReport: (reportId) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
        logChangelog({
          category: 'report',
          action: 'Reopened',
          message: `${r.ref} was reopened.`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        const reopened: Report = {
          ...r,
          status: 'new',
          assigneeId: null,
          updatedAt: Date.now(),
          dueAt: dueDateFor(r.severity),
          activity: [
            ...r.activity,
            makeActivity('reopened', 'Report reopened.', currentUser),
          ],
        };
        return assignInitial(reopened, people, currentUser);
      });
    },

    escalateReport: (reportId, outcome, note) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
        const next = escalate(r, people, outcome, currentUser, note);
        logChangelog({
          category: 'report',
          action: 'Escalated',
          message: `${r.ref} escalated (${outcome.replace('_', ' ')}).`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return next;
      });
    },

    addComment: (reportId, text) => {
      const { currentUser } = get();
      if (!text.trim()) return;
      mapReport(reportId, (r) => {
        logChangelog({
          category: 'report',
          action: 'Comment',
          message: `Comment on ${r.ref}: ${text.trim()}`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return {
          ...r,
          updatedAt: Date.now(),
          activity: [...r.activity, makeActivity('comment', text.trim(), currentUser)],
        };
      });
    },

    addAttachment: (reportId, attachment) => {
      const { currentUser } = get();
      mapReport(reportId, (r) => {
        logChangelog({
          category: 'report',
          action: 'Attachment added',
          message: `Attached "${attachment.name}" to ${r.ref}.`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return {
          ...r,
          updatedAt: Date.now(),
          attachments: [...(r.attachments ?? []), attachment],
          activity: [
            ...r.activity,
            makeActivity(
              'comment',
              `📎 Attached file: ${attachment.name} (${formatBytes(attachment.size)})`,
              currentUser,
            ),
          ],
        };
      });
    },

    removeAttachment: (reportId, attachmentId) => {
      const { currentUser } = get();
      mapReport(reportId, (r) => {
        const attachment = r.attachments?.find((a) => a.id === attachmentId);
        logChangelog({
          category: 'report',
          action: 'Attachment removed',
          message: `Removed "${attachment?.name ?? 'file'}" from ${r.ref}.`,
          by: currentUser,
          refId: r.id,
          refLabel: r.ref,
        });
        return {
          ...r,
          updatedAt: Date.now(),
          attachments: (r.attachments ?? []).filter((a) => a.id !== attachmentId),
        };
      });
      deleteFile(attachmentId).catch(() => {});
    },

    addPerson: (p) => {
      const { people, reports, currentUser } = get();
      const person = { ...p, id: uuid() };
      commit([...people, person], reports);
      logChangelog({
        category: 'team',
        action: 'Member added',
        message: `Added ${person.name} (${person.role}).`,
        by: currentUser,
        refId: person.id,
        refLabel: person.name,
      });
    },

    updatePerson: (id, patch) => {
      const { people, reports, currentUser } = get();
      const before = people.find((p) => p.id === id);
      const nextPeople = people.map((p) => (p.id === id ? { ...p, ...patch } : p));
      commit(nextPeople, reports);
      if (before && patch.name && before.name === currentUser) {
        persistCurrentUser(patch.name);
        set({ currentUser: patch.name });
      } else if (before && patch.name && !nextPeople.some((p) => p.name === currentUser)) {
        const nextUser = pickCurrentUser(nextPeople);
        persistCurrentUser(nextUser);
        set({ currentUser: nextUser });
      }
      if (before) {
        logChangelog({
          category: 'team',
          action: 'Member updated',
          message: `Updated ${before.name}.`,
          by: currentUser,
          refId: id,
          refLabel: before.name,
        });
      }
    },

    removePerson: (id) => {
      const { people, reports, currentUser } = get();
      const removed = people.find((p) => p.id === id);
      const nextPeople = people.filter((p) => p.id !== id);
      commit(nextPeople, reports);
      if (removed?.name === currentUser) {
        const nextUser = pickCurrentUser(nextPeople);
        persistCurrentUser(nextUser);
        set({ currentUser: nextUser });
      }
      if (removed) {
        logChangelog({
          category: 'team',
          action: 'Member removed',
          message: `Removed ${removed.name} from the team.`,
          by: currentUser,
          refId: id,
          refLabel: removed.name,
        });
      }
    },

    toggleAvailability: (id) => {
      const { people, reports, currentUser } = get();
      const person = people.find((p) => p.id === id);
      commit(
        people.map((p) => (p.id === id ? { ...p, available: !p.available } : p)),
        reports,
      );
      if (person) {
        logChangelog({
          category: 'team',
          action: 'Availability changed',
          message: `${person.name} is now ${person.available ? 'unavailable' : 'available'}.`,
          by: currentUser,
          refId: id,
          refLabel: person.name,
        });
      }
    },

    runAutoEscalation: () => {
      const { reports, people, currentUser } = get();
      let count = 0;
      const next = reports.map((r) => {
        if (isOverdue(r)) {
          count += 1;
          return escalate(r, people, 'timeout', currentUser ?? 'system');
        }
        return r;
      });
      if (count > 0) {
        commit(people, next);
        logChangelog({
          category: 'system',
          action: 'Auto-escalation',
          message: `Auto-escalated ${count} overdue report${count === 1 ? '' : 's'}.`,
          by: currentUser ?? 'system',
        });
      }
      return count;
    },

    resetDemo: () => {
      const seed = buildSeed();
      save(seed);
      set({ ...seed, selectedReportId: seed.reports[0]?.id ?? null });
      logChangelog({
        category: 'system',
        action: 'Reset',
        message: 'CRM demo data was reset.',
        by: get().currentUser,
      });
    },

    importData: (data) => {
      if (data.version !== 1) return;
      // Migrate embedded dataUrls → IndexedDB then strip them
      const reports = data.reports.map((r) => ({
        ...r,
        attachments: (r.attachments ?? []).map((a) => {
          if (a.dataUrl) {
            saveDataUrl(a.id, a.dataUrl).catch(() => {});
            const { dataUrl: _d, ...rest } = a;
            return rest;
          }
          return a;
        }),
      }));
      const cleaned = { ...data, reports };
      save(cleaned);
      set({
        people: cleaned.people,
        reports: cleaned.reports,
        selectedReportId: cleaned.reports[0]?.id ?? null,
        currentUser: pickCurrentUser(cleaned.people, get().currentUser),
      });
    },

    exportData: () => {
      const { people, reports } = get();
      return { version: 1, people, reports, exportedAt: Date.now() };
    },
  };
});
