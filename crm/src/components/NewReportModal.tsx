import { useState } from 'react';
import { useCrmStore } from '../store/useCrmStore';
import { SLA_HOURS } from '../lib/escalation';
import type { Severity } from '../types';

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = [
  'structural',
  'electrical',
  'plumbing',
  'safety',
  'mechanical',
  'general',
];

export function NewReportModal({ onClose }: { onClose: () => void }) {
  const createReport = useCrmStore((s) => s.createReport);
  const currentUser = useCrmStore((s) => s.currentUser);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('general');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [reporter, setReporter] = useState(currentUser);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createReport({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      category,
      severity,
      reporter: reporter.trim() || currentUser,
    });
    onClose();
  };

  return (
    <div className="modal" onClick={onClose}>
      <form
        className="modal__panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <div className="modal__head">
          <h2>New inspection report</h2>
          <button type="button" className="modal__close" onClick={onClose}>
            ✕
          </button>
        </div>

        <label className="field">
          <span>Title</span>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Cracked support beam in warehouse"
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What did the inspection find?"
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Location</span>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Building / area"
            />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Severity (SLA {SLA_HOURS[severity]}h)</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as Severity)}
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s} — {SLA_HOURS[s]}h
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Reporter</span>
            <input
              value={reporter}
              onChange={(e) => setReporter(e.target.value)}
            />
          </label>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            Create &amp; auto-assign
          </button>
        </div>
      </form>
    </div>
  );
}
