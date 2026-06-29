import { v4 as uuid } from 'uuid';
import type {
  Activity,
  ActivityType,
  AttemptOutcome,
  Person,
  Report,
  Severity,
} from '../types';

/** SLA window (in hours) per severity — used to compute the due date. */
export const SLA_HOURS: Record<Severity, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
};

export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function dueDateFor(severity: Severity, from = Date.now()): number {
  return from + SLA_HOURS[severity] * 60 * 60 * 1000;
}

export function isOverdue(report: Report, now = Date.now()): boolean {
  const active =
    report.status === 'assigned' || report.status === 'in_progress';
  return active && now > report.dueAt;
}

/** People who have already been tried (and failed) for this report. */
export function attemptedPersonIds(report: Report): Set<string> {
  const ids = new Set<string>();
  for (const a of report.attempts) {
    if (a.outcome !== 'completed') ids.add(a.personId);
  }
  return ids;
}

/**
 * The escalation chain, sorted by tier order. Each entry is annotated with
 * whether the person is currently the assignee, already attempted, available,
 * or still upcoming — handy for visualizing the routing.
 */
export type ChainStep = {
  person: Person;
  state: 'current' | 'attempted' | 'available' | 'unavailable';
};

export function buildChain(report: Report, people: Person[]): ChainStep[] {
  const attempted = attemptedPersonIds(report);
  return [...people]
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map((person) => {
      let state: ChainStep['state'];
      if (person.id === report.assigneeId) state = 'current';
      else if (attempted.has(person.id)) state = 'attempted';
      else if (person.available) state = 'available';
      else state = 'unavailable';
      return { person, state };
    });
}

/**
 * Finds the next available technician for a report, skipping anyone already
 * attempted and (optionally) anyone explicitly excluded (e.g. the person who
 * just declined). Returns null when the chain is exhausted.
 */
export function findNextAssignee(
  report: Report,
  people: Person[],
  excludeId?: string,
): Person | null {
  const attempted = attemptedPersonIds(report);
  if (excludeId) attempted.add(excludeId);
  const candidates = [...people]
    .filter((p) => p.available && !attempted.has(p.id))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  return candidates[0] ?? null;
}

export function makeActivity(
  type: ActivityType,
  message: string,
  by: string,
): Activity {
  return { id: uuid(), type, message, by, at: Date.now() };
}

const OUTCOME_LABEL: Record<AttemptOutcome, string> = {
  pending: 'pending',
  completed: 'completed the repair',
  cannot_repair: 'reported it cannot be repaired',
  declined: 'declined the assignment',
  timeout: 'missed the SLA deadline',
  reassigned: 'was reassigned',
};

export function outcomeLabel(outcome: AttemptOutcome): string {
  return OUTCOME_LABEL[outcome];
}

/**
 * Core escalation transition. Closes the current attempt with the given
 * outcome and routes the report to the next available technician. If nobody
 * is left, the report becomes `unresolved`.
 *
 * Returns a NEW report object (immutable update) — the caller persists it.
 */
export function escalate(
  report: Report,
  people: Person[],
  outcome: Extract<
    AttemptOutcome,
    'cannot_repair' | 'declined' | 'timeout' | 'reassigned'
  >,
  by: string,
  note?: string,
): Report {
  const now = Date.now();
  const attempts = report.attempts.map((a) =>
    a.personId === report.assigneeId && a.outcome === 'pending'
      ? { ...a, outcome, note, closedAt: now }
      : a,
  );

  const currentName =
    people.find((p) => p.id === report.assigneeId)?.name ?? 'Unassigned';

  const next = findNextAssignee(report, people, report.assigneeId ?? undefined);
  const activity = [...report.activity];

  if (!next) {
    activity.push(
      makeActivity(
        'escalated',
        `${currentName} ${outcomeLabel(outcome)} — no available technician left to escalate to.`,
        by,
      ),
      makeActivity(
        'exhausted',
        'Escalation chain exhausted. Report marked UNRESOLVED and needs manual attention.',
        by,
      ),
    );
    return {
      ...report,
      attempts,
      assigneeId: null,
      status: 'unresolved',
      activity,
      updatedAt: now,
    };
  }

  attempts.push({
    id: uuid(),
    personId: next.id,
    personName: next.name,
    assignedAt: now,
    outcome: 'pending',
  });

  activity.push(
    makeActivity(
      'escalated',
      `${currentName} ${outcomeLabel(outcome)}. Escalated to ${next.name} (tier ${next.order}).`,
      by,
    ),
  );

  return {
    ...report,
    attempts,
    assigneeId: next.id,
    status: 'assigned',
    escalationLevel: report.escalationLevel + 1,
    // give the new assignee a fresh SLA window
    dueAt: dueDateFor(report.severity, now),
    activity,
    updatedAt: now,
  };
}

/** Assigns a brand-new report to the first available technician. */
export function assignInitial(
  report: Report,
  people: Person[],
  by: string,
): Report {
  const next = findNextAssignee(report, people);
  const now = Date.now();
  if (!next) {
    return {
      ...report,
      status: 'unresolved',
      assigneeId: null,
      activity: [
        ...report.activity,
        makeActivity(
          'exhausted',
          'No available technician to assign. Report is UNRESOLVED.',
          by,
        ),
      ],
      updatedAt: now,
    };
  }
  return {
    ...report,
    assigneeId: next.id,
    status: 'assigned',
    dueAt: dueDateFor(report.severity, now),
    attempts: [
      ...report.attempts,
      {
        id: uuid(),
        personId: next.id,
        personName: next.name,
        assignedAt: now,
        outcome: 'pending',
      },
    ],
    activity: [
      ...report.activity,
      makeActivity('assigned', `Assigned to ${next.name} (tier ${next.order}).`, by),
    ],
    updatedAt: now,
  };
}
