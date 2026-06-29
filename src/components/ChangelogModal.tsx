import { useMemo, useState } from 'react';
import { useChangelogStore, type ChangelogCategory } from '../store/useChangelogStore';

const ICON: Record<ChangelogCategory, string> = {
  annotation: '📍',
  report: '⛑',
  team: '👥',
  system: '⚙',
};

type Filter = 'all' | ChangelogCategory;

interface Props {
  onClose: () => void;
}

export function ChangelogModal({ onClose }: Props) {
  const entries = useChangelogStore((s) => s.entries);
  const clear = useChangelogStore((s) => s.clear);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return entries;
    return entries.filter((e) => e.category === filter);
  }, [entries, filter]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'annotation', label: 'Comments' },
    { id: 'report', label: 'Reports' },
    { id: 'team', label: 'Team' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__panel changelog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h2>Changelog</h2>
          <button type="button" className="modal__close" onClick={onClose}>✕</button>
        </div>

        <p className="modal__hint">
          Recent changes across comments, inspection reports, and team updates.
        </p>

        <div className="changelog-filters">
          {filters.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`changelog-filter ${filter === id ? 'changelog-filter--on' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="changelog-list-wrap">
          {filtered.length === 0 ? (
            <p className="changelog-empty">No changes recorded yet.</p>
          ) : (
            <ul className="changelog-list">
              {filtered.map((e) => (
                <li key={e.id} className={`changelog-item changelog-item--${e.category}`}>
                  <span className="changelog-item__icon">{ICON[e.category]}</span>
                  <div className="changelog-item__body">
                    <div className="changelog-item__top">
                      <span className="changelog-item__action">{e.action}</span>
                      {e.refLabel && (
                        <span className="changelog-item__ref">{e.refLabel}</span>
                      )}
                    </div>
                    <p className="changelog-item__message">{e.message}</p>
                    <span className="changelog-item__meta">
                      {e.by}
                      {e.assetName ? ` · ${e.assetName}` : ''}
                      {' · '}
                      {new Date(e.at).toLocaleString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal__foot">
          {entries.length > 0 && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => {
                if (window.confirm('Clear all changelog entries?')) clear();
              }}
            >
              Clear history
            </button>
          )}
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
