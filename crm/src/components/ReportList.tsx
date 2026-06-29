import { useMemo, useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { SeverityBadge, StatusBadge, EscalationBadge } from './Badges';
import { dueLabel } from '../lib/format';
import { isOverdue, SEVERITY_ORDER } from '../lib/escalation';
import type { ReportStatus } from '../types';

type StatusFilter = ReportStatus | 'all' | 'open';

export function ReportList() {
  const reports = useCrmStore((s) => s.reports);
  const people = useCrmStore((s) => s.people);
  const selectedId = useCrmStore((s) => s.selectedReportId);
  const select = useCrmStore((s) => s.select);

  const [status, setStatus] = useState<StatusFilter>('open');
  const [query, setQuery] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const personName = (id: string | null) =>
    people.find((p) => p.id === id)?.name ?? '—';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => {
        if (status === 'open')
          return r.status !== 'closed' && r.status !== 'resolved';
        if (status !== 'all' && r.status !== status) return false;
        return true;
      })
      .filter((r) => (onlyOverdue ? isOverdue(r) : true))
      .filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          r.ref.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          personName(r.assigneeId).toLowerCase().includes(q),
      )
      .sort((a, b) => {
        const ao = isOverdue(a) ? 0 : 1;
        const bo = isOverdue(b) ? 0 : 1;
        if (ao !== bo) return ao - bo;
        if (SEVERITY_ORDER[a.severity] !== SEVERITY_ORDER[b.severity])
          return SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
        return b.updatedAt - a.updatedAt;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, status, query, onlyOverdue, people]);

  const filters: { id: StatusFilter; label: string }[] = [
    { id: 'open', label: 'Open' },
    { id: 'unresolved', label: 'Unresolved' },
    { id: 'in_progress', label: 'In progress' },
    { id: 'resolved', label: 'Resolved' },
    { id: 'all', label: 'All' },
  ];

  return (
    <div className="report-list">
      <div className="report-list__controls">
        <input
          className="search"
          placeholder="Search reports, refs, people…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="chips">
          {filters.map((f) => (
            <button
              key={f.id}
              className={`chip ${status === f.id ? 'chip--on' : ''}`}
              onClick={() => setStatus(f.id)}
            >
              {f.label}
            </button>
          ))}
          <label className="chip chip--check">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
            />
            Overdue
          </label>
        </div>
      </div>

      <ul className="cards">
        {filtered.length === 0 && (
          <li className="cards__empty">No reports match these filters.</li>
        )}
        {filtered.map((r) => (
          <li
            key={r.id}
            className={`card ${selectedId === r.id ? 'card--selected' : ''} ${
              isOverdue(r) ? 'card--overdue' : ''
            }`}
            onClick={() => select(r.id)}
          >
            <div className="card__top">
              <span className="card__ref">{r.ref}</span>
              <SeverityBadge severity={r.severity} />
            </div>
            <div className="card__title">{r.title}</div>
            <div className="card__meta">
              <span>{r.location}</span>
              <span className="dot">·</span>
              <span>{personName(r.assigneeId)}</span>
            </div>
            <div className="card__bottom">
              <StatusBadge status={r.status} />
              <EscalationBadge level={r.escalationLevel} />
              <span
                className={`due ${isOverdue(r) ? 'due--over' : ''}`}
                title={new Date(r.dueAt).toLocaleString()}
              >
                {dueLabel(r.dueAt)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
