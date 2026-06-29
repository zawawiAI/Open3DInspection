import { useState } from 'react';
import { useCrmStore } from '../crm/store/useCrmStore';
import { useStore } from '../store/useStore';
import { TeamMemberSelect } from './TeamMemberSelect';
import { SLA_HOURS } from '../crm/lib/escalation';
import type { Annotation } from '../types';
import type { Severity } from '../crm/types';

const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
const CATEGORIES = ['structural', 'electrical', 'plumbing', 'safety', 'mechanical', 'general'];

interface Props {
  annotation: Annotation;
  assetName: string;
  onClose: () => void;
}

export function EscalateModal({ annotation, assetName, onClose }: Props) {
  const createReport = useCrmStore((s) => s.createReport);
  const linkReport = useStore((s) => s.linkReport);

  const [title, setTitle] = useState(annotation.title || 'Inspection finding');
  const [description, setDescription] = useState(annotation.body || '');
  const [location, setLocation] = useState(assetName);
  const [category, setCategory] = useState('general');
  const [severity, setSeverity] = useState<Severity>('medium');
  const currentUser = useCrmStore((s) => s.currentUser);
  const [reporter, setReporter] = useState(
    () => annotation.author || currentUser,
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // createReport pushes the new report and selects it; it also returns via store
    createReport({ title, description, location, category, severity, reporter });
    // grab the newly created report id (it's the first in the list after create)
    const reports = useCrmStore.getState().reports;
    const newReport = reports[0];
    if (newReport) linkReport(annotation.id, newReport.id);
    onClose();
  };

  return (
    <div className="modal" onClick={onClose}>
      <form className="modal__panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal__head">
          <h2>Escalate annotation as inspection report</h2>
          <button type="button" className="modal__close" onClick={onClose}>✕</button>
        </div>

        <p className="modal__hint">
          This creates a report in the CRM and assigns it to the next available technician in the escalation chain.
        </p>

        <label className="field">
          <span>Title</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the finding…" />
        </label>

        <div className="field-row">
          <label className="field">
            <span>Location / asset</span>
            <input value={location} onChange={(e) => setLocation(e.target.value)} />
          </label>
          <label className="field">
            <span>Category</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Severity (SLA: {SLA_HOURS[severity]}h)</span>
            <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s} — {SLA_HOURS[s]}h</option>
              ))}
            </select>
          </label>
          <TeamMemberSelect
            label="Reporter"
            className="field"
            value={reporter}
            onChange={setReporter}
          />
        </div>

        <div className="modal__foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--escalate" disabled={!title.trim()}>
            ▲ Create &amp; assign report
          </button>
        </div>
      </form>
    </div>
  );
}
