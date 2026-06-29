import type { ReportStatus, Severity } from '../types';
import { SEVERITY_LABEL, STATUS_LABEL } from '../lib/format';

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`badge sev sev--${severity}`}>{SEVERITY_LABEL[severity]}</span>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  return (
    <span className={`badge status status--${status}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function EscalationBadge({ level }: { level: number }) {
  if (level <= 0) return null;
  return <span className="badge escalated">▲ Escalated ×{level}</span>;
}
