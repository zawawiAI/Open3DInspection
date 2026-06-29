import { useState } from 'react';
import { useStore } from '../store/useStore';
import { useCrmStore } from '../crm/store/useCrmStore';
import { EscalateModal } from './EscalateModal';
import { AnnotationAttachments } from './AnnotationAttachments';
import type { Annotation, AnnotationPriority } from '../types';

const COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899'];

const PRIORITIES: { value: AnnotationPriority; label: string }[] = [
  { value: 'critical', label: '🔴 Critical' },
  { value: 'high',     label: '🟠 High' },
  { value: 'medium',   label: '🟡 Medium' },
  { value: 'low',      label: '🟢 Low' },
];

function Editor({
  annotation,
  assetName,
  onSwitchToReports,
}: {
  annotation: Annotation;
  assetName: string;
  onSwitchToReports: () => void;
}) {
  const update = useStore((s) => s.updateAnnotation);
  const remove = useStore((s) => s.removeAnnotation);
  const crmReports = useCrmStore((s) => s.reports);
  const [showEscalate, setShowEscalate] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const linkedReport = annotation.reportId
    ? crmReports.find((r) => r.id === annotation.reportId)
    : null;

  return (
    <div className="editor">
      <input
        className="editor__title"
        value={annotation.title}
        placeholder="Title"
        onChange={(e) => update(annotation.id, { title: e.target.value })}
      />
      <textarea
        className="editor__body"
        value={annotation.body}
        placeholder="Write a comment…"
        rows={4}
        onChange={(e) => update(annotation.id, { body: e.target.value })}
      />

      {/* Priority selector */}
      <div className="editor__priority-row">
        <span className="editor__priority-label">Priority</span>
        <div className="editor__priority-btns">
          {PRIORITIES.map(({ value, label }) => (
            <button
              key={value}
              className={`priority-btn priority-btn--${value} ${annotation.priority === value ? 'priority-btn--on' : ''}`}
              onClick={() => update(annotation.id, { priority: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="editor__row">
        <div className="editor__colors">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`swatch ${annotation.color === c ? 'swatch--on' : ''}`}
              style={{ background: c }}
              onClick={() => update(annotation.id, { color: c })}
            />
          ))}
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={annotation.resolved}
            onChange={(e) => update(annotation.id, { resolved: e.target.checked })}
          />
          Resolved
        </label>
      </div>

      {/* CRM escalation section */}
      {linkedReport ? (
        <div className="linked-report">
          <span className="linked-report__label">⛑ Linked report</span>
          <button
            className="linked-report__ref"
            onClick={onSwitchToReports}
            title="Open in Reports tab"
          >
            {linkedReport.ref} — {linkedReport.title}
          </button>
          <span className={`linked-report__status status--${linkedReport.status}`}>
            {linkedReport.status.replace('_', ' ')}
          </span>
        </div>
      ) : (
        <button
          className="btn btn--escalate"
          onClick={() => setShowEscalate(true)}
        >
          ▲ Escalate as inspection report
        </button>
      )}

      {/* File attachments */}
      <AnnotationAttachments annotation={annotation} />

      <button
        className="btn btn--danger"
        onClick={() => setShowDeleteConfirm(true)}
      >
        Delete comment
      </button>

      {showDeleteConfirm && (
        <div className="modal" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="modal__panel confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal__head">
              <h2>Delete comment?</h2>
            </div>
            <p className="modal__hint">
              Are you sure you want to delete &ldquo;{annotation.title || 'Untitled'}&rdquo;?
              This cannot be undone.
            </p>
            <div className="modal__foot">
              <button
                type="button"
                className="btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                No
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={() => {
                  remove(annotation.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {showEscalate && (
        <EscalateModal
          annotation={annotation}
          assetName={assetName}
          onClose={() => setShowEscalate(false)}
        />
      )}
    </div>
  );
}

export function Sidebar({ onSwitchToReports }: { onSwitchToReports: () => void }) {
  const annotations = useStore((s) => s.annotations);
  const selectedId = useStore((s) => s.selectedId);
  const focusOn = useStore((s) => s.focusOn);
  const select = useStore((s) => s.select);
  const asset = useStore((s) => s.asset);

  const selected = annotations.find((a) => a.id === selectedId) ?? null;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <h2>Comments</h2>
        <span className="badge">{annotations.length}</span>
      </div>

      {annotations.length === 0 && (
        <p className="sidebar__empty">
          {asset
            ? 'Switch to Annotate mode and click on the model to drop a comment.'
            : 'Open a file to get started.'}
        </p>
      )}

      <ul className="comment-list">
        {annotations.map((a, i) => (
          <li
            key={a.id}
            className={`comment-item ${selectedId === a.id ? 'comment-item--selected' : ''}`}
            onClick={() => (a.kind === '3d' ? focusOn(a.id) : select(a.id))}
          >
            <span className="comment-item__dot" style={{ background: a.color }}>
              {i + 1}
            </span>
            <div className="comment-item__text">
              <div className="comment-item__top">
                <span
                  className={`comment-item__title ${
                    a.resolved ? 'comment-item__title--resolved' : ''
                  }`}
                >
                  {a.title || 'Untitled'}
                </span>
                <span className={`priority-badge priority-badge--${a.priority ?? 'medium'}`}>
                  {a.priority ?? 'medium'}
                </span>
              </div>
              <span className="comment-item__meta">
                {a.author} · {new Date(a.createdAt).toLocaleString()}
              </span>
              {a.body && <span className="comment-item__body">{a.body}</span>}
              {(a.attachments?.length ?? 0) > 0 && (
                <span className="comment-item__attachments">
                  📎 {a.attachments.length} file{a.attachments.length !== 1 ? 's' : ''}
                </span>
              )}
              {a.reportId && (
                <span className="comment-item__escalated">⛑ Escalated to CRM</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="sidebar__editor">
          <h3>Edit comment</h3>
          <Editor
            annotation={selected}
            assetName={asset?.name ?? ''}
            onSwitchToReports={onSwitchToReports}
          />
        </div>
      )}
    </aside>
  );
}
