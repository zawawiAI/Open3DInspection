import { useEffect, useRef, useState } from 'react';
import { useCrmStore } from './store/useCrmStore';
import { ReportList } from './components/ReportList';
import { ReportDetail } from './components/ReportDetail';
import { TeamPanel } from './components/TeamPanel';
import { NewReportModal } from './components/NewReportModal';
import { isOverdue } from './lib/escalation';
import type { CrmData } from './types';

export default function App() {
  const view = useCrmStore((s) => s.view);
  const setView = useCrmStore((s) => s.setView);
  const reports = useCrmStore((s) => s.reports);
  const currentUser = useCrmStore((s) => s.currentUser);
  const setCurrentUser = useCrmStore((s) => s.setCurrentUser);
  const runAutoEscalation = useCrmStore((s) => s.runAutoEscalation);
  const resetDemo = useCrmStore((s) => s.resetDemo);
  const exportData = useCrmStore((s) => s.exportData);
  const importData = useCrmStore((s) => s.importData);

  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement>(null);

  // SLA sweep: auto-escalate overdue reports on load and every 60s
  useEffect(() => {
    const sweep = () => {
      const n = runAutoEscalation();
      if (n > 0) {
        setToast(`Auto-escalated ${n} overdue report${n === 1 ? '' : 's'}.`);
        setTimeout(() => setToast(null), 4000);
      }
    };
    sweep();
    const id = setInterval(sweep, 60_000);
    return () => clearInterval(id);
  }, [runAutoEscalation]);

  const openCount = reports.filter(
    (r) => r.status !== 'closed' && r.status !== 'resolved',
  ).length;
  const overdueCount = reports.filter(isOverdue).length;
  const unresolvedCount = reports.filter((r) => r.status === 'unresolved').length;

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inspection-crm-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as CrmData;
        importData(data);
        setToast('Data imported.');
        setTimeout(() => setToast(null), 3000);
      } catch {
        setToast('Could not import that file.');
        setTimeout(() => setToast(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__brand">
          <span className="topbar__logo">⛑</span>
          <span>Inspection Escalation CRM</span>
        </div>

        <nav className="topbar__nav">
          <button
            className={`navbtn ${view === 'reports' ? 'navbtn--on' : ''}`}
            onClick={() => setView('reports')}
          >
            Reports <span className="pill">{openCount}</span>
          </button>
          <button
            className={`navbtn ${view === 'team' ? 'navbtn--on' : ''}`}
            onClick={() => setView('team')}
          >
            Team
          </button>
        </nav>

        <div className="topbar__stats">
          {overdueCount > 0 && (
            <span className="stat stat--over">⏱ {overdueCount} overdue</span>
          )}
          {unresolvedCount > 0 && (
            <span className="stat stat--bad">⚠ {unresolvedCount} unresolved</span>
          )}
        </div>

        <div className="topbar__right">
          <label className="user">
            <span>User</span>
            <input
              value={currentUser}
              onChange={(e) => setCurrentUser(e.target.value)}
            />
          </label>
          <button className="btn btn--primary" onClick={() => setShowNew(true)}>
            + New report
          </button>
          <button className="btn" onClick={handleExport}>
            Export
          </button>
          <button className="btn" onClick={() => importInput.current?.click()}>
            Import
          </button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImport(f);
              e.target.value = '';
            }}
          />
          <button
            className="btn btn--ghost"
            onClick={() => {
              if (confirm('Reset all data back to the demo seed?')) resetDemo();
            }}
          >
            Reset
          </button>
        </div>
      </header>

      {view === 'reports' ? (
        <main className="layout">
          <ReportList />
          <ReportDetail />
        </main>
      ) : (
        <main className="layout layout--single">
          <TeamPanel />
        </main>
      )}

      {showNew && <NewReportModal onClose={() => setShowNew(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
