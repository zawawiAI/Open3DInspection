export type Severity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Lifecycle of an inspection report.
 * - new:         created, not yet assigned
 * - assigned:    routed to a technician, awaiting acceptance
 * - in_progress: technician is actively working on the repair
 * - resolved:    repair completed (pending close/verification)
 * - closed:      verified and archived
 * - unresolved:  escalation chain exhausted — nobody left to assign
 */
export type ReportStatus =
  | 'new'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'unresolved';

/** Outcome of a single assignment attempt within the escalation chain. */
export type AttemptOutcome =
  | 'pending'
  | 'completed'
  | 'cannot_repair'
  | 'declined'
  | 'timeout'
  | 'reassigned';

export interface Person {
  id: string;
  name: string;
  role: string;
  /** lower number = earlier in the escalation chain (tier 1, tier 2, ...) */
  order: number;
  available: boolean;
  skills: string[];
}

export interface Attempt {
  id: string;
  personId: string;
  personName: string;
  assignedAt: number;
  closedAt?: number;
  outcome: AttemptOutcome;
  note?: string;
}

export type ActivityType =
  | 'created'
  | 'assigned'
  | 'started'
  | 'escalated'
  | 'resolved'
  | 'closed'
  | 'reopened'
  | 'comment'
  | 'exhausted';

export interface Activity {
  id: string;
  type: ActivityType;
  message: string;
  by: string;
  at: number;
}

export interface Report {
  id: string;
  ref: string; // human-friendly code e.g. INS-1042
  title: string;
  description: string;
  location: string;
  category: string;
  severity: Severity;
  status: ReportStatus;
  reporter: string;
  /** currently responsible technician, or null when new/unresolved */
  assigneeId: string | null;
  /** number of times the report has been escalated to a new person */
  escalationLevel: number;
  attempts: Attempt[];
  activity: Activity[];
  createdAt: number;
  updatedAt: number;
  /** SLA deadline derived from severity; overdue triggers auto-escalation */
  dueAt: number;
  /** where the report originated; annotator integration can set this */
  source: 'manual' | 'annotator';
}

export interface CrmData {
  version: 1;
  people: Person[];
  reports: Report[];
  exportedAt?: number;
}
