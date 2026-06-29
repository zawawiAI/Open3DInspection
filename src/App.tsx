import { Suspense, useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { useCrmStore } from './crm/store/useCrmStore';
import { useTheme } from './hooks/useTheme';
import { Toolbar } from './components/Toolbar';
import { DataToolbar } from './components/DataToolbar';
import { AppLogo } from './components/AppLogo';
import { Sidebar } from './components/Sidebar';
import { DataSidebar } from './components/DataSidebar';
import { Dropzone } from './components/Dropzone';
import { Viewer3D } from './components/Viewer3D';
import { ImageViewer } from './components/ImageViewer';
import { ReportList } from './crm/components/ReportList';
import { ReportDetail } from './crm/components/ReportDetail';
import { TeamPanel } from './crm/components/TeamPanel';
import { NewReportModal } from './crm/components/NewReportModal';
import { ChangelogModal } from './components/ChangelogModal';
import { AssetPanel } from './components/AssetPanel';
import { useChangelogStore } from './store/useChangelogStore';
import { useAssetStore } from './store/useAssetStore';
import { useNdtStore } from './store/useNdtStore';
import { isOverdue } from './crm/lib/escalation';

type Tab = 'annotator' | 'data' | 'assets' | 'reports' | 'team';

function AnnotatorStage() {
  const asset = useStore((s) => s.asset);
  if (!asset) return null;
  if (asset.kind === 'image') return <ImageViewer asset={asset} />;
  return (
    <Suspense fallback={<div className="stage__loading">Loading model…</div>}>
      <Viewer3D asset={asset} workspace="annotator" />
    </Suspense>
  );
}

function DataStage() {
  const asset = useStore((s) => s.asset);
  if (!asset) return null;
  if (asset.kind === 'image') {
    return (
      <div className="data-image-notice">
        NDT tagging is available for 3D models. Open a mesh or point cloud file.
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="stage__loading">Loading model…</div>}>
      <Viewer3D asset={asset} workspace="data" />
    </Suspense>
  );
}

function ErrorToast() {
  const error = useStore((s) => s.error);
  const setError = useStore((s) => s.setError);
  if (!error) return null;
  return (
    <div className="toast" role="alert">
      <span>{error}</span>
      <button onClick={() => setError(null)}>✕</button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('annotator');
  const [showNewReport, setShowNewReport] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [crmToast, setCrmToast] = useState<string | null>(null);

  const crmReports = useCrmStore((s) => s.reports);
  const assetCount = useAssetStore((s) => s.assets.length);
  const ndtCount = useNdtStore((s) => s.readings.length);
  const bindNdtAsset = useNdtStore((s) => s.bindAsset);
  const asset = useStore((s) => s.asset);
  const changelogCount = useChangelogStore((s) => s.entries.length);
  const runAutoEscalation = useCrmStore((s) => s.runAutoEscalation);
  const crmSelect = useCrmStore((s) => s.select);
  void crmSelect; // available for future use from annotation sidebar

  const openCount = crmReports.filter(
    (r) => r.status !== 'closed' && r.status !== 'resolved',
  ).length;
  const overdueCount = crmReports.filter(isOverdue).length;

  // SLA auto-escalation sweep every 60s
  useEffect(() => {
    const sweep = () => {
      const n = runAutoEscalation();
      if (n > 0) {
        setCrmToast(`Auto-escalated ${n} overdue report${n === 1 ? '' : 's'}.`);
        setTimeout(() => setCrmToast(null), 4000);
      }
    };
    sweep();
    const id = setInterval(sweep, 60_000);
    return () => clearInterval(id);
  }, [runAutoEscalation]);

  useEffect(() => {
    if (tab === 'data') bindNdtAsset(asset);
  }, [tab, asset, bindNdtAsset]);

  const switchToReports = () => setTab('reports');
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app">
      {/* unified top nav */}
      <nav className="app-tabs">
        <div className="app-tabs__brand">
          <AppLogo size={26} />
          <span>Open3DInspection</span>
        </div>

        <div className="app-tabs__tabs">
          <button
            className={`app-tab ${tab === 'annotator' ? 'app-tab--on' : ''}`}
            onClick={() => setTab('annotator')}
          >
            🧊 Visual
          </button>
          <button
            className={`app-tab ${tab === 'data' ? 'app-tab--on' : ''}`}
            onClick={() => setTab('data')}
          >
            ▲ Data
            {ndtCount > 0 && <span className="app-tab__pill">{ndtCount}</span>}
          </button>
          <button
            className={`app-tab ${tab === 'assets' ? 'app-tab--on' : ''}`}
            onClick={() => setTab('assets')}
          >
            📁 Assets
            {assetCount > 0 && <span className="app-tab__pill">{assetCount}</span>}
          </button>
          <button
            className={`app-tab ${tab === 'reports' ? 'app-tab--on' : ''}`}
            onClick={() => setTab('reports')}
          >
            ⛑ Reports
            {openCount > 0 && <span className="app-tab__pill">{openCount}</span>}
            {overdueCount > 0 && (
              <span className="app-tab__pill app-tab__pill--over">{overdueCount} overdue</span>
            )}
          </button>
          <button
            className={`app-tab ${tab === 'team' ? 'app-tab--on' : ''}`}
            onClick={() => setTab('team')}
          >
            👥 Team
          </button>
        </div>

        <div className="app-tabs__actions">
          {tab === 'reports' && (
            <button className="btn btn--primary app-tabs__action" onClick={() => setShowNewReport(true)}>
              + New report
            </button>
          )}

          <button
            className="btn theme-toggle app-tabs__theme"
            onClick={() => setShowChangelog(true)}
            title="View changelog"
          >
            📋 Changelog
            {changelogCount > 0 && (
              <span className="app-tab__pill">{changelogCount}</span>
            )}
          </button>

          <button
            className="btn theme-toggle app-tabs__theme"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
          </button>
        </div>
      </nav>

      {/* Annotator tab */}
      {tab === 'annotator' && (
        <div className="app-body annotator-layout">
          <Toolbar />
          <main className="app__body">
            <div className="app__stage">
              <Dropzone>
                <AnnotatorStage />
              </Dropzone>
            </div>
            <Sidebar onSwitchToReports={switchToReports} />
          </main>
        </div>
      )}

      {/* Data / NDT tab */}
      {tab === 'data' && (
        <div className="app-body data-layout">
          <DataToolbar />
          <main className="app__body data-workspace">
            <div className="app__stage">
              <Dropzone>
                <DataStage />
              </Dropzone>
            </div>
            <DataSidebar />
          </main>
        </div>
      )}

      {/* Assets tab */}
      {tab === 'assets' && (
        <AssetPanel onOpenInAnnotator={() => setTab('annotator')} />
      )}

      {/* Reports tab */}
      {tab === 'reports' && (
        <main className="app-body crm-layout">
          <ReportList />
          <ReportDetail />
        </main>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <main className="app-body crm-layout crm-layout--single">
          <TeamPanel />
        </main>
      )}

      {showNewReport && <NewReportModal onClose={() => setShowNewReport(false)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
      <ErrorToast />
      {crmToast && <div className="toast">{crmToast}</div>}
    </div>
  );
}
