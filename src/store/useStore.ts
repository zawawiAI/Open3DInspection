import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type {
  Annotation,
  AnnotationAttachment,
  InteractionMode,
  LoadedAsset,
  ProjectFile,
} from '../types';
import { deleteFile, saveDataUrl } from '../lib/fileStore';
import { kindFromFilename, defaultAssetName } from '../lib/assetKinds';
import { logChangelog } from './useChangelogStore';
import { detectPlyFormat, plyFormatLabel } from '../loaders/detectPlyFormat';
import { useAssetStore } from './useAssetStore';
import { useCrmStore } from '../crm/store/useCrmStore';
import { useNdtStore } from './useNdtStore';
import { DEFAULT_FOLDER_ID } from '../types/assetLibrary';

const PALETTE = [
  '#f43f5e',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
  '#a855f7',
  '#ec4899',
];

const LS_KEY_PREFIX = 'omniasset:';

function currentAuthor(): string {
  const { currentUser, people } = useCrmStore.getState();
  if (people.some((p) => p.name === currentUser)) return currentUser;
  const sorted = [...people].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
  return sorted[0]?.name ?? currentUser;
}

export { kindFromFilename } from '../lib/assetKinds';

interface AppState {
  asset: LoadedAsset | null;
  annotations: Annotation[];
  selectedId: string | null;
  mode: InteractionMode;
  /** when a ply is loaded, force interpreting it as a gaussian splat */
  treatPlyAsSplat: boolean;
  /** display helpers */
  showGrid: boolean;
  showAnnotations: boolean;
  pointSize: number;
  /** Screen-size multiplier for annotation pins (3D and 2D). */
  pinSize: number;
  /** transient camera focus request consumed by the viewer */
  focusRequest: { position: [number, number, number]; at: number } | null;
  error: string | null;

  loadFile: (file: File, options?: { name?: string; folderId?: string }) => void;
  openLibraryAsset: (libraryAssetId: string) => Promise<void>;
  clearAsset: () => void;
  setMode: (mode: InteractionMode) => void;
  setTreatPlyAsSplat: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setShowAnnotations: (v: boolean) => void;
  setPointSize: (v: number) => void;
  setPinSize: (v: number) => void;
  setError: (v: string | null) => void;

  addAnnotation: (a: {
    kind: '3d' | '2d';
    position: [number, number, number];
    normal?: [number, number, number];
  }) => void;
  updateAnnotation: (id: string, patch: Partial<Annotation>) => void;
  removeAnnotation: (id: string) => void;
  select: (id: string | null) => void;
  focusOn: (id: string) => void;

  importProject: (project: ProjectFile) => void;
  exportProject: () => ProjectFile;
  /** Link a CRM report id back to an annotation */
  linkReport: (annotationId: string, reportId: string) => void;
  addAnnotationAttachment: (annotationId: string, attachment: AnnotationAttachment) => void;
  removeAnnotationAttachment: (annotationId: string, attachmentId: string) => void;
}

function describeAnnotationPatch(
  before: Annotation,
  patch: Partial<Annotation>,
): string | null {
  const parts: string[] = [];
  if (patch.title !== undefined && patch.title !== before.title) parts.push('title');
  if (patch.body !== undefined && patch.body !== before.body) parts.push('comment text');
  if (patch.priority !== undefined && patch.priority !== before.priority) {
    parts.push(`priority → ${patch.priority}`);
  }
  if (patch.resolved !== undefined && patch.resolved !== before.resolved) {
    parts.push(patch.resolved ? 'marked resolved' : 'marked unresolved');
  }
  if (patch.color !== undefined && patch.color !== before.color) parts.push('pin color');
  return parts.length ? parts.join(', ') : null;
}

function storageKey(asset: LoadedAsset | null): string | undefined {
  if (!asset) return undefined;
  return asset.libraryAssetId ?? asset.displayName ?? asset.name;
}

function persist(asset: LoadedAsset | null, annotations: Annotation[]) {
  const key = storageKey(asset);
  if (!key) return;
  try {
    localStorage.setItem(
      LS_KEY_PREFIX + key,
      JSON.stringify(annotations),
    );
  } catch {
    /* storage may be full or unavailable; ignore */
  }
}

function restore(key: string): Annotation[] {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Annotation[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a) => ({
      ...(a.attachments ? a : { ...a, attachments: [] }),
      priority: a.priority ?? 'medium',
    }));
  } catch {
    return [];
  }
}

export const useStore = create<AppState>((set, get) => ({
  asset: null,
  annotations: [],
  selectedId: null,
  mode: 'navigate',
  treatPlyAsSplat: false,
  showGrid: true,
  showAnnotations: true,
  pointSize: 0.01,
  pinSize: 1,
  focusRequest: null,
  error: null,

  loadFile: (file, options) => {
    const kind = kindFromFilename(file.name);
    if (!kind) {
      set({
        error: `Unsupported file type: ${file.name}. Supported: ply, obj, fbx, glb, gltf, splat/ksplat, las/laz, jpg, png.`,
      });
      return;
    }

    const prev = get().asset;
    if (prev) URL.revokeObjectURL(prev.url);

    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    const displayName = options?.name?.trim() || defaultAssetName(file.name);
    const folderId =
      options?.folderId ??
      useAssetStore.getState().selectedFolderId ??
      DEFAULT_FOLDER_ID;

    const asset: LoadedAsset = {
      id: uuid(),
      name: file.name,
      displayName,
      kind,
      url: URL.createObjectURL(file),
      ext,
    };

    set({
      asset,
      annotations: restore(displayName),
      selectedId: null,
      mode: 'navigate',
      treatPlyAsSplat: false,
      error: null,
    });
    useNdtStore.getState().bindAsset(asset);

    if (kind === 'ply') {
      detectPlyFormat(file).then((format) => {
        const current = get().asset;
        if (!current || current.name !== file.name) return;
        set({
          asset: { ...current, plyFormat: format },
          treatPlyAsSplat: format === 'gaussian',
        });
      });
    }

    useAssetStore
      .getState()
      .importFile(file, displayName, folderId)
      .then((lib) => {
        const current = get().asset;
        if (!current || current.name !== file.name) return;
        const annotations = get().annotations;
        set({
          asset: {
            ...current,
            libraryAssetId: lib.id,
            displayName: lib.name,
            plyFormat: lib.plyFormat ?? current.plyFormat,
          },
          treatPlyAsSplat: lib.plyFormat === 'gaussian' || get().treatPlyAsSplat,
        });
        persist(get().asset, annotations);
        useNdtStore.getState().bindAsset(get().asset);
      })
      .catch(() => {
        set({ error: 'File opened, but could not save a copy to the asset library.' });
      });
  },

  openLibraryAsset: async (libraryAssetId) => {
    const lib = useAssetStore.getState().assets.find((a) => a.id === libraryAssetId);
    const blob = await useAssetStore.getState().getAssetBlob(libraryAssetId);
    if (!lib || !blob) {
      set({ error: 'Asset not found in library storage.' });
      return;
    }

    const prev = get().asset;
    if (prev) URL.revokeObjectURL(prev.url);

    const asset: LoadedAsset = {
      id: uuid(),
      name: lib.fileName,
      displayName: lib.name,
      libraryAssetId: lib.id,
      kind: lib.kind,
      url: URL.createObjectURL(blob),
      ext: lib.ext,
      plyFormat: lib.plyFormat,
    };

    set({
      asset,
      annotations: restore(lib.id),
      selectedId: null,
      mode: 'navigate',
      treatPlyAsSplat: lib.plyFormat === 'gaussian',
      error: null,
    });
    useNdtStore.getState().bindAsset(asset);

    useAssetStore.getState().selectAsset(lib.id);
    useAssetStore.getState().selectFolder(lib.folderId);
  },

  clearAsset: () => {
    const prev = get().asset;
    if (prev) URL.revokeObjectURL(prev.url);
    set({ asset: null, annotations: [], selectedId: null });
    useNdtStore.getState().bindAsset(null);
  },

  setMode: (mode) => set({ mode }),
  setTreatPlyAsSplat: (v) => {
    const { asset } = get();
    if (v && asset?.kind === 'ply' && asset.plyFormat && asset.plyFormat !== 'gaussian') {
      set({
        error: `This PLY is a ${plyFormatLabel(asset.plyFormat)} file, not a Gaussian splat. Leave this option off to view it normally.`,
        treatPlyAsSplat: false,
      });
      return;
    }
    if (v && asset?.kind === 'ply' && !asset.plyFormat) {
      set({
        error: 'Still analyzing the PLY file — try again in a moment.',
      });
      return;
    }
    set({ treatPlyAsSplat: v, error: null });
  },
  setShowGrid: (v) => set({ showGrid: v }),
  setShowAnnotations: (v) => set({ showAnnotations: v }),
  setPointSize: (v) => set({ pointSize: v }),
  setPinSize: (v) => set({ pinSize: v }),
  setError: (v) => set({ error: v }),

  addAnnotation: ({ kind, position, normal }) => {
    const { asset, annotations } = get();
    if (!asset) return;
    const author = currentAuthor();
    if (!author) {
      set({
        error: 'Add a team member on the Team tab before creating comments.',
      });
      return;
    }
    const annotation: Annotation = {
      id: uuid(),
      assetId: asset.id,
      kind,
      position,
      normal,
      title: `Comment ${annotations.length + 1}`,
      body: '',
      color: PALETTE[annotations.length % PALETTE.length],
      author,
      createdAt: Date.now(),
      priority: 'medium',
      resolved: false,
      attachments: [],
    };
    const next = [...annotations, annotation];
    set({ annotations: next, selectedId: annotation.id });
    persist(asset, next);
    logChangelog({
      category: 'annotation',
      action: 'Created',
      message: `Added comment "${annotation.title}" on ${asset.name}.`,
      by: author,
      assetName: asset.name,
      refId: annotation.id,
      refLabel: annotation.title,
    });
  },

  updateAnnotation: (id, patch) => {
    const { annotations, asset } = get();
    const author = currentAuthor();
    const before = annotations.find((a) => a.id === id);
    const next = annotations.map((a) => (a.id === id ? { ...a, ...patch } : a));
    set({ annotations: next });
    persist(asset, next);
    if (before) {
      const detail = describeAnnotationPatch(before, patch);
      if (detail) {
        logChangelog({
          category: 'annotation',
          action: 'Updated',
          message: `Updated ${detail} on "${before.title || 'Untitled'}".`,
          by: author,
          assetName: asset?.name,
          refId: id,
          refLabel: before.title || 'Untitled',
        });
      }
    }
  },

  removeAnnotation: (id) => {
    const { annotations, asset, selectedId } = get();
    const author = currentAuthor();
    const removed = annotations.find((a) => a.id === id);
    const next = annotations.filter((a) => a.id !== id);
    set({
      annotations: next,
      selectedId: selectedId === id ? null : selectedId,
    });
    persist(asset, next);
    if (removed) {
      logChangelog({
        category: 'annotation',
        action: 'Deleted',
        message: `Removed comment "${removed.title || 'Untitled'}".`,
        by: author,
        assetName: asset?.name,
        refId: id,
        refLabel: removed.title || 'Untitled',
      });
    }
  },

  select: (id) => set({ selectedId: id }),

  focusOn: (id) => {
    const a = get().annotations.find((x) => x.id === id);
    if (!a) return;
    set({
      selectedId: id,
      focusRequest: { position: a.position, at: Date.now() },
    });
  },

  importProject: (project) => {
    const { asset } = get();
    // Migrate any embedded dataUrls from JSON export → IndexedDB, then strip
    const annotations = project.annotations.map((a) => ({
      ...a,
      attachments: (a.attachments ?? []).map((att) => {
        if (att.dataUrl) {
          saveDataUrl(att.id, att.dataUrl).catch(() => {});
          const { dataUrl: _d, ...rest } = att;
          return rest;
        }
        return att;
      }),
    }));
    set({ annotations, selectedId: null });
    persist(asset, annotations);
    logChangelog({
      category: 'system',
      action: 'Imported',
      message: `Imported ${annotations.length} comment(s) for ${asset?.name ?? project.assetName}.`,
      by: currentAuthor(),
      assetName: asset?.name ?? project.assetName,
    });
  },

  exportProject: () => {
    const { asset, annotations } = get();
    return {
      version: 1,
      assetName: asset?.displayName ?? asset?.name ?? 'untitled',
      annotations,
      exportedAt: Date.now(),
    };
  },

  linkReport: (annotationId, reportId) => {
    const { annotations, asset } = get();
    const author = currentAuthor();
    const annotation = annotations.find((a) => a.id === annotationId);
    const next = annotations.map((a) =>
      a.id === annotationId ? { ...a, reportId } : a,
    );
    set({ annotations: next });
    persist(asset, next);
    logChangelog({
      category: 'annotation',
      action: 'Escalated',
      message: `Linked comment "${annotation?.title ?? 'Untitled'}" to inspection report.`,
      by: author,
      assetName: asset?.name,
      refId: annotationId,
      refLabel: annotation?.title ?? 'Untitled',
    });
  },

  addAnnotationAttachment: (annotationId, attachment) => {
    const { annotations, asset } = get();
    const author = currentAuthor();
    const annotation = annotations.find((a) => a.id === annotationId);
    const next = annotations.map((a) =>
      a.id === annotationId
        ? { ...a, attachments: [...(a.attachments ?? []), attachment] }
        : a,
    );
    set({ annotations: next });
    persist(asset, next);
    logChangelog({
      category: 'annotation',
      action: 'Attachment added',
      message: `Attached "${attachment.name}" to "${annotation?.title ?? 'Untitled'}".`,
      by: author,
      assetName: asset?.name,
      refId: annotationId,
      refLabel: annotation?.title ?? 'Untitled',
    });
  },

  removeAnnotationAttachment: (annotationId, attachmentId) => {
    const { annotations, asset } = get();
    const author = currentAuthor();
    const annotation = annotations.find((a) => a.id === annotationId);
    const attachment = annotation?.attachments?.find((a) => a.id === attachmentId);
    const next = annotations.map((a) =>
      a.id === annotationId
        ? { ...a, attachments: (a.attachments ?? []).filter((f) => f.id !== attachmentId) }
        : a,
    );
    set({ annotations: next });
    persist(asset, next);
    deleteFile(attachmentId).catch(() => {});
    logChangelog({
      category: 'annotation',
      action: 'Attachment removed',
      message: `Removed "${attachment?.name ?? 'file'}" from "${annotation?.title ?? 'Untitled'}".`,
      by: author,
      assetName: asset?.name,
      refId: annotationId,
      refLabel: annotation?.title ?? 'Untitled',
    });
  },
}));
