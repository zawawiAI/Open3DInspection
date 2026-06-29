import { useRef, useState } from 'react';
import { useAssetStore } from '../store/useAssetStore';
import { useStore } from '../store/useStore';
import { ACCEPTED_ASSET_EXTENSIONS, defaultAssetName } from '../lib/assetKinds';
import { DEFAULT_FOLDER_ID } from '../types/assetLibrary';

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function kindIcon(kind: string) {
  if (kind === 'image') return '🖼';
  if (kind === 'las') return '☁';
  if (kind === 'splat') return '✨';
  if (kind === 'gltf') return '📦';
  if (kind === 'fbx') return '🎬';
  return '🧊';
}

interface Props {
  onOpenInAnnotator: () => void;
}

export function AssetPanel({ onOpenInAnnotator }: Props) {
  const folders = useAssetStore((s) => s.folders);
  const assets = useAssetStore((s) => s.assets);
  const selectedFolderId = useAssetStore((s) => s.selectedFolderId);
  const selectedAssetId = useAssetStore((s) => s.selectedAssetId);
  const selectFolder = useAssetStore((s) => s.selectFolder);
  const selectAsset = useAssetStore((s) => s.selectAsset);
  const addFolder = useAssetStore((s) => s.addFolder);
  const renameFolder = useAssetStore((s) => s.renameFolder);
  const deleteFolder = useAssetStore((s) => s.deleteFolder);
  const importFile = useAssetStore((s) => s.importFile);
  const renameAsset = useAssetStore((s) => s.renameAsset);
  const moveAsset = useAssetStore((s) => s.moveAsset);
  const deleteAsset = useAssetStore((s) => s.deleteAsset);

  const openLibraryAsset = useStore((s) => s.openLibraryAsset);
  const setError = useStore((s) => s.setError);
  const loadedLibraryId = useStore((s) => s.asset?.libraryAssetId);

  const fileInput = useRef<HTMLInputElement>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [uploading, setUploading] = useState(false);

  const folderAssets = assets.filter((a) => a.folderId === selectedFolderId);
  const selected = assets.find((a) => a.id === selectedAssetId) ?? null;

  const handlePickFile = (file: File | null) => {
    if (!file) return;
    setPendingFile(file);
    setUploadName(defaultAssetName(file.name));
  };

  const handleSaveUpload = async () => {
    if (!pendingFile || !uploadName.trim()) return;
    setUploading(true);
    try {
      await importFile(pendingFile, uploadName.trim(), selectedFolderId);
      setPendingFile(null);
      setUploadName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save asset.');
    } finally {
      setUploading(false);
    }
  };

  const handleOpen = async (assetId: string) => {
    try {
      await openLibraryAsset(assetId);
      onOpenInAnnotator();
    } catch {
      setError('Could not open asset.');
    }
  };

  const startRename = (id: string, current: string) => {
    setEditingAssetId(id);
    setEditName(current);
  };

  const commitRename = (id: string) => {
    if (editName.trim()) {
      renameAsset(id, editName.trim());
      const loaded = useStore.getState().asset;
      if (loaded?.libraryAssetId === id) {
        useStore.setState({
          asset: { ...loaded, displayName: editName.trim() },
        });
      }
    }
    setEditingAssetId(null);
  };

  return (
    <main className="app-body asset-layout">
      <aside className="asset-folders">
        <div className="asset-folders__head">
          <h2>Folders</h2>
          <button className="btn btn--ghost" onClick={() => setShowNewFolder(true)} title="New folder">
            +
          </button>
        </div>

        {showNewFolder && (
          <div className="asset-folders__new">
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newFolderName.trim()) {
                  addFolder(newFolderName.trim());
                  setNewFolderName('');
                  setShowNewFolder(false);
                }
              }}
            />
            <button
              className="btn btn--primary"
              onClick={() => {
                if (newFolderName.trim()) {
                  addFolder(newFolderName.trim());
                  setNewFolderName('');
                  setShowNewFolder(false);
                }
              }}
            >
              Add
            </button>
          </div>
        )}

        <ul className="asset-folder-list">
          {folders.map((f) => (
            <li
              key={f.id}
              className={`asset-folder-item ${selectedFolderId === f.id ? 'asset-folder-item--on' : ''}`}
              onClick={() => selectFolder(f.id)}
            >
              <span className="asset-folder-item__icon">📁</span>
              {f.id === DEFAULT_FOLDER_ID ? (
                <span className="asset-folder-item__name">{f.name}</span>
              ) : (
                <input
                  className="asset-folder-item__rename"
                  defaultValue={f.name}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => renameFolder(f.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  }}
                />
              )}
              <span className="asset-folder-item__count">
                {assets.filter((a) => a.folderId === f.id).length}
              </span>
              {f.id !== DEFAULT_FOLDER_ID && (
                <button
                  className="asset-folder-item__del"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete folder "${f.name}"? Assets will move to Assets.`)) {
                      deleteFolder(f.id);
                    }
                  }}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <section className="asset-main">
        <div className="asset-main__head">
          <div>
            <h2>{folders.find((f) => f.id === selectedFolderId)?.name ?? 'Assets'}</h2>
            <p className="asset-main__sub">
              Upload files here — each upload is copied into your asset library (browser storage).
            </p>
          </div>
          <button className="btn btn--primary" onClick={() => fileInput.current?.click()}>
            + Upload asset
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={ACCEPTED_ASSET_EXTENSIONS}
            hidden
            onChange={(e) => {
              handlePickFile(e.target.files?.[0] ?? null);
              e.target.value = '';
            }}
          />
        </div>

        {pendingFile && (
          <div className="asset-upload-modal">
            <div className="asset-upload-modal__panel">
              <h3>Name this asset</h3>
              <p className="asset-upload-modal__file">{pendingFile.name}</p>
              <input
                type="text"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="Asset name"
                autoFocus
              />
              <div className="asset-upload-modal__foot">
                <button className="btn btn--ghost" onClick={() => setPendingFile(null)}>
                  Cancel
                </button>
                <button
                  className="btn btn--primary"
                  disabled={!uploadName.trim() || uploading}
                  onClick={handleSaveUpload}
                >
                  {uploading ? 'Saving…' : 'Save to folder'}
                </button>
              </div>
            </div>
          </div>
        )}

        {folderAssets.length === 0 ? (
          <div className="asset-empty">
            <div className="asset-empty__icon">📂</div>
            <p>No assets in this folder yet.</p>
            <button className="btn" onClick={() => fileInput.current?.click()}>
              Upload your first file
            </button>
          </div>
        ) : (
          <ul className="asset-grid">
            {folderAssets.map((a) => (
              <li
                key={a.id}
                className={`asset-card ${selectedAssetId === a.id ? 'asset-card--selected' : ''} ${loadedLibraryId === a.id ? 'asset-card--open' : ''}`}
                onClick={() => selectAsset(a.id)}
              >
                <div className="asset-card__icon">{kindIcon(a.kind)}</div>
                <div className="asset-card__body">
                  {editingAssetId === a.id ? (
                    <input
                      className="asset-card__name-input"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => commitRename(a.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename(a.id);
                        if (e.key === 'Escape') setEditingAssetId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <button
                      className="asset-card__name"
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(a.id, a.name);
                      }}
                      title="Click to rename"
                    >
                      {a.name}
                    </button>
                  )}
                  <span className="asset-card__meta">
                    {a.fileName} · {formatBytes(a.size)} · {a.kind.toUpperCase()}
                  </span>
                  <span className="asset-card__date">
                    {new Date(a.updatedAt).toLocaleString()}
                  </span>
                </div>
                <div className="asset-card__actions">
                  <button
                    className="btn btn--primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(a.id);
                    }}
                  >
                    Open
                  </button>
                  <select
                    className="asset-card__move"
                    value={a.folderId}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => moveAsset(a.id, e.target.value)}
                  >
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn btn--ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${a.name}" from library?`)) {
                        deleteAsset(a.id);
                      }
                    }}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {selected && (
          <div className="asset-detail">
            <h3>{selected.name}</h3>
            <p>File: {selected.fileName}</p>
            <p>
              Type: {selected.kind}
              {selected.plyFormat ? ` (${selected.plyFormat})` : ''}
            </p>
            <p>Size: {formatBytes(selected.size)}</p>
            <div className="asset-detail__actions">
              <button className="btn btn--primary" onClick={() => handleOpen(selected.id)}>
                Open in Visual
              </button>
              <button className="btn" onClick={() => startRename(selected.id, selected.name)}>
                Rename
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
