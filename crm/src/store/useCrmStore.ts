import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { CrmData, Person, Report, Severity } from '../types';
import {
  assignInitial,
  dueDateFor,
  escalate,
  isOverdue,
  makeActivity,
} from '../lib/escalation';
import { buildSeed } from '../lib/seed';

const LS_KEY = 'inspection-crm:data:v1';

function load(): CrmData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CrmData;
      if (parsed?.version === 1 && Array.isArray(parsed.reports)) return parsed;
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
    currentUser: 'dispatcher',

    setView: (view) => set({ view }),
    select: (selectedReportId) => set({ selectedReportId }),
    setCurrentUser: (currentUser) => set({ currentUser }),

    createReport: (input) => {
      const { reports, people, currentUser } = get();
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
        reporter: input.reporter || currentUser,
        assigneeId: null,
        escalationLevel: 0,
        attempts: [],
        activity: [
          makeActivity('created', `Report created.`, input.reporter || currentUser),
        ],
        createdAt: now,
        updatedAt: now,
        dueAt: dueDateFor(input.severity, now),
        source: 'manual',
      };
      const assigned = assignInitial(base, people, currentUser);
      commit(people, [assigned, ...reports]);
      set({ selectedReportId: assigned.id });
    },

    startWork: (reportId) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
        const name =
          people.find((p) => p.id === r.assigneeId)?.name ?? 'Technician';
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
      mapReport(reportId, (r) => ({
        ...r,
        status: 'closed',
        updatedAt: Date.now(),
        activity: [
          ...r.activity,
          makeActivity('closed', 'Report verified and closed.', currentUser),
        ],
      }));
    },

    reopenReport: (reportId) => {
      const { currentUser, people } = get();
      mapReport(reportId, (r) => {
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
      mapReport(reportId, (r) => escalate(r, people, outcome, currentUser, note));
    },

    addComment: (reportId, text) => {
      const { currentUser } = get();
      if (!text.trim()) return;
      mapReport(reportId, (r) => ({
        ...r,
        updatedAt: Date.now(),
        activity: [...r.activity, makeActivity('comment', text.trim(), currentUser)],
      }));
    },

    addPerson: (p) => {
      const { people, reports } = get();
      commit([...people, { ...p, id: uuid() }], reports);
    },

    updatePerson: (id, patch) => {
      const { people, reports } = get();
      commit(
        people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        reports,
      );
    },

    removePerson: (id) => {
      const { people, reports } = get();
      commit(
        people.filter((p) => p.id !== id),
        reports,
      );
    },

    toggleAvailability: (id) => {
      const { people, reports } = get();
      commit(
        people.map((p) => (p.id === id ? { ...p, available: !p.available } : p)),
        reports,
      );
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
      if (count > 0) commit(people, next);
      return count;
    },

    resetDemo: () => {
      const seed = buildSeed();
      save(seed);
      set({ ...seed, selectedReportId: seed.reports[0]?.id ?? null });
    },

    importData: (data) => {
      if (data.version !== 1) return;
      save(data);
      set({
        people: data.people,
        reports: data.reports,
        selectedReportId: data.reports[0]?.id ?? null,
      });
    },

    exportData: () => {
      const { people, reports } = get();
      return { version: 1, people, reports, exportedAt: Date.now() };
    },
  };
});
