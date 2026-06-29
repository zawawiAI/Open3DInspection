import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNdtStore } from '../store/useNdtStore';
import { useCrmStore } from '../crm/store/useCrmStore';
import { TeamMemberSelect } from './TeamMemberSelect';
import type { NdtProjectFile } from '../types/ndt';

const ACCEPT = '.ply,.obj,.fbx,.glb,.gltf,.splat,.ksplat,.las,.laz,.jpg,.jpeg,.png';

export function DataToolbar() {
  const asset = useStore((s) => s.asset);
  const loadFile = useStore((s) => s.loadFile);
  const clearAsset = useStore((s) => s.clearAsset);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const pointSize = useStore((s) => s.pointSize);
  const setPointSize = useStore((s) => s.setPointSize);
  const setError = useStore((s) => s.setError);

  const mode = useNdtStore((s) => s.mode);
  const setMode = useNdtStore((s) => s.setMode);
  const showMarkers = useNdtStore((s) => s.showMarkers);
  const setShowMarkers = useNdtStore((s) => s.setShowMarkers);
  const pinSize = useNdtStore((s) => s.pinSize);
  const setPinSize = useNdtStore((s) => s.setPinSize);
  const exportProject = useNdtStore((s) => s.exportProject);
  const importProject = useNdtStore((s) => s.importProject);

  const author = useCrmStore((s) => s.currentUser);
  const setAuthor = useCrmStore((s) => s.setCurrentUser);

  const fileInput = useRef<HTMLInputElement>(null);
  const ndtInput = useRef<HTMLInputElement>(null);

  const isPointy = asset?.kind === 'las' || asset?.kind === 'ply';
  const isImage = asset?.kind === 'image';

  const handleExport = () => {
    const project = exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.assetName}.ndt.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as NdtProjectFile;
        if (!Array.isArray(parsed.readings)) throw new Error('bad file');
        importProject(parsed);
      } catch {
        setError('Could not read that NDT data file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="toolbar">
      <div className="toolbar__group">
        <button className="btn" onClick={() => fileInput.current?.click()}>
          Open file
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) loadFile(f);
            e.target.value = '';
          }}
        />
        {asset && (
          <span className="toolbar__filename" title={asset.displayName ?? asset.name}>
            {asset.displayName ?? asset.name}
          </span>
        )}
      </div>

      {asset && !isImage && (
        <>
          <div className="toolbar__group toolbar__modes">
            <button
              className={`btn ${mode === 'navigate' ? 'btn--active' : ''}`}
              onClick={() => setMode('navigate')}
            >
              ✋ Navigate
            </button>
            <button
              className={`btn ${mode === 'tag' ? 'btn--active' : ''}`}
              onClick={() => setMode('tag')}
            >
              ▲ Tag NDT
            </button>
            <button
              className={`btn ${showMarkers ? 'btn--active' : ''}`}
              onClick={() => setShowMarkers(!showMarkers)}
              title={showMarkers ? 'Hide NDT markers' : 'Show NDT markers'}
            >
              {showMarkers ? '👁 Markers on' : '🙈 Markers off'}
            </button>
          </div>

          <div className="toolbar__group toolbar__options">
            <label className="check">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            {isPointy && (
              <label className="slider">
                Points
                <input
                  type="range"
                  min={0.002}
                  max={0.06}
                  step={0.002}
                  value={pointSize}
                  onChange={(e) => setPointSize(parseFloat(e.target.value))}
                />
              </label>
            )}
            <label className="slider" title="Adjust triangle marker size">
              Marker size
              <input
                type="range"
                min={0.25}
                max={1.5}
                step={0.05}
                value={pinSize}
                onChange={(e) => setPinSize(parseFloat(e.target.value))}
              />
            </label>
          </div>
        </>
      )}

      <div className="toolbar__group toolbar__right">
        <TeamMemberSelect value={author} onChange={setAuthor} label="Inspector" />
        <button className="btn" onClick={handleExport} disabled={!asset}>
          Export NDT JSON
        </button>
        <button
          className="btn"
          onClick={() => ndtInput.current?.click()}
          disabled={!asset}
        >
          Import NDT JSON
        </button>
        <input
          ref={ndtInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
            e.target.value = '';
          }}
        />
        {asset && (
          <button className="btn btn--ghost" onClick={clearAsset}>
            Close
          </button>
        )}
      </div>
    </header>
  );
}
