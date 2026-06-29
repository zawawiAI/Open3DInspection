import { useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { SeverityBadge, StatusBadge, EscalationBadge } from './Badges';
import { EscalationChain } from './EscalationChain';
import { ActivityFeed } from './ActivityFeed';
import { dueLabel } from '../lib/format';
import { findNextAssignee, isOverdue } from '../lib/escalation';

export function ReportDetail() {
  const reports = useCrmStore((s) => s.reports);
  const people = useCrmStore((s) => s.people);
  const selectedId = useCrmStore((s) => s.selectedReportId);

  const startWork = useCrmStore((s) => s.startWork);
  const resolveReport = useCrmStore((s) => s.resolveReport);
  const closeReport = useCrmStore((s) => s.closeReport);
  const reopenReport = useCrmStore((s) => s.reopenReport);
  const escalateReport = useCrmStore((s) => s.escalateReport);

  const [escalateNote, setEscalateNote] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);

  const report = reports.find((r) => r.id === selectedId) ?? null;

  if (!report) {
    return (
      <section className="detail detail--empty">
        <p>Select a report to see its escalation status and history.</p>
      </section>
    );
  }

  const assignee = people.find((p) => p.id === report.assigneeId) ?? null;
  const next = findNextAssignee(
    report,
    people,
    report.assigneeId ?? undefined,
  );
  const overdue = isOverdue(report);
  const active =
    report.status === 'assigned' || report.status === 'in_progress';

  const doEscalate = (
    outcome: 'cannot_repair' | 'declined' | 'reassigned',
  ) => {
    escalateReport(report.id, outcome, escalateNote || undefined);
    setEscalateNote('');
    setShowEscalate(false);
  };

  return (
    <section className="detail">
      <header className="detail__head">
        <div>
          <div className="detail__ref">{report.ref}</div>
          <h2 className="detail__title">{report.title}</h2>
        </div>
        <div className="detail__badges">
          <SeverityBadge severity={report.severity} />
          <StatusBadge status={report.status} />
          <EscalationBadge level={report.escalationLevel} />
        </div>
      </header>

      <div className="detail__facts">
        <Fact label="Location" value={report.location} />
        <Fact label="Category" value={report.category} />
        <Fact label="Reporter" value={report.reporter} />
        <Fact
          label="Assignee"
          value={assignee ? `${assignee.name} (T${assignee.order})` : '—'}
        />
        <Fact
          label="SLA"
          value={dueLabel(report.dueAt)}
          danger={overdue}
        />
        <Fact label="Source" value={report.source} />
      </div>

      <p className="detail__desc">{report.description}</p>

      {overdue && active && (
        <div className="banner banner--warn">
          ⏱ This report is past its SLA deadline. It will auto-escalate
          {next ? ` to ${next.name}` : ' (no one left in the chain)'} on the next
          sweep, or you can escalate now.
        </div>
      )}

      {/* Action bar */}
      <div className="detail__actions">
        {active && report.status === 'assigned' && (
          <button className="btn btn--primary" onClick={() => startWork(report.id)}>
            ▶ Start repair
          </button>
        )}
        {active && (
          <>
            <button
              className="btn btn--success"
              onClick={() => resolveReport(report.id)}
            >
              ✓ Mark resolved
            </button>
            <button
              className="btn btn--warn"
              onClick={() => setShowEscalate((v) => !v)}
            >
              ▲ Can&apos;t repair / escalate
            </button>
          </>
        )}
        {report.status === 'resolved' && (
          <>
            <button className="btn btn--primary" onClick={() => closeReport(report.id)}>
              ◼ Verify &amp; close
            </button>
            <button className="btn" onClick={() => reopenReport(report.id)}>
              ↺ Reopen
            </button>
          </>
        )}
        {(report.status === 'unresolved' || report.status === 'closed') && (
          <button className="btn" onClick={() => reopenReport(report.id)}>
            ↺ Reopen &amp; reassign
          </button>
        )}
      </div>

      {showEscalate && active && (
        <div className="escalate-box">
          <div className="escalate-box__hint">
            {next
              ? `This will route the report to ${next.name} (tier ${next.order}).`
              : 'No available technician left — the report will become UNRESOLVED.'}
          </div>
          <input
            placeholder="Reason / note (optional)"
            value={escalateNote}
            onChange={(e) => setEscalateNote(e.target.value)}
          />
          <div className="escalate-box__buttons">
            <button className="btn btn--warn" onClick={() => doEscalate('cannot_repair')}>
              Cannot repair
            </button>
            <button className="btn btn--warn" onClick={() => doEscalate('declined')}>
              Decline
            </button>
            <button className="btn" onClick={() => doEscalate('reassigned')}>
              Just reassign
            </button>
          </div>
        </div>
      )}

      <div className="detail__cols">
        <div className="detail__col">
          <h3>Escalation chain</h3>
          <EscalationChain report={report} people={people} />
        </div>
        <div className="detail__col">
          <h3>Activity</h3>
          <ActivityFeed report={report} />
        </div>
      </div>
    </section>
  );
}

function Fact({
  label,
  value,
  danger,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="fact">
      <span className="fact__label">{label}</span>
      <span className={`fact__value ${danger ? 'fact__value--danger' : ''}`}>
        {value}
      </span>
    </div>
  );
}
