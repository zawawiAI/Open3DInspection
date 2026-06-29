import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { AssetFolder, AssetLibraryData, LibraryAsset } from '../types/assetLibrary';
import { DEFAULT_FOLDER_ID, blobKeyForAsset } from '../types/assetLibrary';
import { saveFile, deleteFile, getBlob } from '../lib/fileStore';
import { kindFromFilename } from '../lib/assetKinds';
import { detectPlyFormat } from '../loaders/detectPlyFormat';
import { logChangelog } from './useChangelogStore';

const LS_KEY = 'open3dinspection:asset-library';
const LEGACY_LS_KEYS = ['openinspection:asset-library'];

function defaultData(): AssetLibraryData {
  return {
    version: 1,
    folders: [
      { id: DEFAULT_FOLDER_ID, name: 'Assets', createdAt: Date.now() },
    ],
    assets: [],
  };
}

function load(): AssetLibraryData {
  try {
    for (const key of [LS_KEY, ...LEGACY_LS_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as AssetLibraryData;
      if (parsed?.version === 1 && Array.isArray(parsed.folders)) {
        if (!parsed.folders.some((f) => f.id === DEFAULT_FOLDER_ID)) {
          parsed.folders.unshift({
            id: DEFAULT_FOLDER_ID,
            name: 'Assets',
            createdAt: Date.now(),
          });
        }
        if (key !== LS_KEY) persist(parsed);
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  return defaultData();
}

function persist(data: AssetLibraryData) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

interface AssetLibraryState extends AssetLibraryData {
  selectedFolderId: string;
  selectedAssetId: string | null;

  selectFolder: (id: string) => void;
  selectAsset: (id: string | null) => void;
  addFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  importFile: (file: File, name: string, folderId?: string) => Promise<LibraryAsset>;
  renameAsset: (id: string, name: string) => void;
  moveAsset: (id: string, folderId: string) => void;
  deleteAsset: (id: string) => Promise<void>;
  getAssetBlob: (id: string) => Promise<Blob | null>;
}

const initial = load();

export const useAssetStore = create<AssetLibraryState>((set, get) => {
  const commit = (patch: Partial<AssetLibraryData>) => {
    const next: AssetLibraryData = {
      version: 1,
      folders: patch.folders ?? get().folders,
      assets: patch.assets ?? get().assets,
    };
    persist(next);
    set(next);
  };

  return {
    ...initial,
    selectedFolderId: initial.folders[0]?.id ?? DEFAULT_FOLDER_ID,
    selectedAssetId: null,

    selectFolder: (selectedFolderId) => set({ selectedFolderId, selectedAssetId: null }),
    selectAsset: (selectedAssetId) => set({ selectedAssetId }),

    addFolder: (name) => {
      const folder: AssetFolder = {
        id: uuid(),
        name: name.trim() || 'New folder',
        createdAt: Date.now(),
      };
      commit({ folders: [...get().folders, folder] });
      set({ selectedFolderId: folder.id });
      logChangelog({
        category: 'system',
        action: 'Folder created',
        message: `Created asset folder "${folder.name}".`,
        by: 'user',
      });
    },

    renameFolder: (id, name) => {
      if (id === DEFAULT_FOLDER_ID) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      commit({
        folders: get().folders.map((f) => (f.id === id ? { ...f, name: trimmed } : f)),
      });
    },

    deleteFolder: (id) => {
      if (id === DEFAULT_FOLDER_ID) return;
      const { folders, assets } = get();
      commit({
        folders: folders.filter((f) => f.id !== id),
        assets: assets.map((a) =>
          a.folderId === id ? { ...a, folderId: DEFAULT_FOLDER_ID, updatedAt: Date.now() } : a,
        ),
      });
      if (get().selectedFolderId === id) {
        set({ selectedFolderId: DEFAULT_FOLDER_ID, selectedAssetId: null });
      }
    },

    importFile: async (file, name, folderId) => {
      const kind = kindFromFilename(file.name);
      if (!kind) throw new Error(`Unsupported file type: ${file.name}`);

      const id = uuid();
      await saveFile(blobKeyForAsset(id), file);

      let plyFormat: LibraryAsset['plyFormat'];
      if (kind === 'ply') {
        plyFormat = await detectPlyFormat(file);
      }

      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      const trimmedName = name.trim() || file.name.replace(/\.[^.]+$/, '');
      const targetFolder = folderId ?? get().selectedFolderId ?? DEFAULT_FOLDER_ID;

      const entry: LibraryAsset = {
        id,
        name: trimmedName,
        folderId: targetFolder,
        fileName: file.name,
        kind,
        ext,
        size: file.size,
        plyFormat,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      commit({ assets: [entry, ...get().assets] });
      set({ selectedFolderId: targetFolder, selectedAssetId: id });

      logChangelog({
        category: 'system',
        action: 'Asset saved',
        message: `Saved "${entry.name}" to asset library (${formatBytes(file.size)}).`,
        by: 'user',
        refId: id,
        refLabel: entry.name,
      });

      return entry;
    },

    renameAsset: (id, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const asset = get().assets.find((a) => a.id === id);
      commit({
        assets: get().assets.map((a) =>
          a.id === id ? { ...a, name: trimmed, updatedAt: Date.now() } : a,
        ),
      });
      if (asset) {
        logChangelog({
          category: 'system',
          action: 'Asset renamed',
          message: `Renamed asset to "${trimmed}".`,
          by: 'user',
          refId: id,
          refLabel: trimmed,
        });
      }
    },

    moveAsset: (id, folderId) => {
      commit({
        assets: get().assets.map((a) =>
          a.id === id ? { ...a, folderId, updatedAt: Date.now() } : a,
        ),
      });
    },

    deleteAsset: async (id) => {
      const asset = get().assets.find((a) => a.id === id);
      await deleteFile(blobKeyForAsset(id)).catch(() => {});
      commit({ assets: get().assets.filter((a) => a.id !== id) });
      if (get().selectedAssetId === id) set({ selectedAssetId: null });
      if (asset) {
        logChangelog({
          category: 'system',
          action: 'Asset deleted',
          message: `Removed "${asset.name}" from asset library.`,
          by: 'user',
          refId: id,
          refLabel: asset.name,
        });
      }
    },

    getAssetBlob: (id) => getBlob(blobKeyForAsset(id)),
  };
});

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}
