import { useRef } from 'react';
import { useStore } from '../store/useStore';
import { useCrmStore } from '../crm/store/useCrmStore';
import { TeamMemberSelect } from './TeamMemberSelect';
import type { ProjectFile } from '../types';

const ACCEPT = '.ply,.obj,.fbx,.glb,.gltf,.splat,.ksplat,.las,.laz,.jpg,.jpeg,.png';

export function Toolbar() {
  const asset = useStore((s) => s.asset);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const loadFile = useStore((s) => s.loadFile);
  const clearAsset = useStore((s) => s.clearAsset);
  const treatPlyAsSplat = useStore((s) => s.treatPlyAsSplat);
  const setTreatPlyAsSplat = useStore((s) => s.setTreatPlyAsSplat);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const showAnnotations = useStore((s) => s.showAnnotations);
  const setShowAnnotations = useStore((s) => s.setShowAnnotations);
  const pointSize = useStore((s) => s.pointSize);
  const setPointSize = useStore((s) => s.setPointSize);
  const pinSize = useStore((s) => s.pinSize);
  const setPinSize = useStore((s) => s.setPinSize);
  const author = useCrmStore((s) => s.currentUser);
  const setAuthor = useCrmStore((s) => s.setCurrentUser);
  const exportProject = useStore((s) => s.exportProject);
  const importProject = useStore((s) => s.importProject);
  const setError = useStore((s) => s.setError);

  const fileInput = useRef<HTMLInputElement>(null);
  const projectInput = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const project = exportProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.assetName}.annotations.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as ProjectFile;
        if (!Array.isArray(parsed.annotations)) throw new Error('bad file');
        importProject(parsed);
      } catch {
        setError('Could not read that annotations file.');
      }
    };
    reader.readAsText(file);
  };

  const isImage = asset?.kind === 'image';
  const isPointy = asset?.kind === 'las' || asset?.kind === 'ply';

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

      {asset && (
        <>
          <div className="toolbar__group toolbar__modes">
            <button
              className={`btn ${mode === 'navigate' ? 'btn--active' : ''}`}
              onClick={() => setMode('navigate')}
            >
              ✋ Navigate
            </button>
            <button
              className={`btn ${mode === 'annotate' ? 'btn--active' : ''}`}
              onClick={() => setMode('annotate')}
            >
              📍 Annotate
            </button>
            <button
              className={`btn ${showAnnotations ? 'btn--active' : ''}`}
              onClick={() => setShowAnnotations(!showAnnotations)}
              title={showAnnotations ? 'Hide annotation pins' : 'Show annotation pins'}
            >
              {showAnnotations ? '👁 Pins on' : '🙈 Pins off'}
            </button>
          </div>

          <div className="toolbar__group toolbar__options">
            {!isImage && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(e) => setShowGrid(e.target.checked)}
                />
                Grid
              </label>
            )}
            {asset.kind === 'ply' && asset.plyFormat === 'gaussian' && (
              <label className="check" title="Render as 3D Gaussian splat (for splat PLY files)">
                <input
                  type="checkbox"
                  checked={treatPlyAsSplat}
                  onChange={(e) => setTreatPlyAsSplat(e.target.checked)}
                />
                Gaussian splat view
              </label>
            )}
            {asset.kind === 'ply' && !asset.plyFormat && (
              <span className="toolbar__hint">Analyzing PLY…</span>
            )}
            {isPointy && !treatPlyAsSplat && (
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
            <label className="slider" title="Adjust annotation pin size">
              Pin size
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
        <TeamMemberSelect value={author} onChange={setAuthor} />
        <button className="btn" onClick={handleExport} disabled={!asset}>
          Export JSON
        </button>
        <button
          className="btn"
          onClick={() => projectInput.current?.click()}
          disabled={!asset}
        >
          Import JSON
        </button>
        <input
          ref={projectInput}
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
