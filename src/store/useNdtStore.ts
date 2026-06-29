import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { LoadedAsset } from '../types';
import type {
  NdtInteractionMode,
  NdtProjectFile,
  NdtReading,
} from '../types/ndt';
import { ndtMethodInfo, todayIsoDate } from '../lib/ndtMethods';
import { normalizeReadings, listLocationGroups } from '../lib/ndtLocations';
import { useCrmStore } from '../crm/store/useCrmStore';
import { useStore } from './useStore';
import { logChangelog } from './useChangelogStore';

const LS_KEY_PREFIX = 'open3dinspection:ndt:';

function currentAuthor(): string {
  const { currentUser, people } = useCrmStore.getState();
  if (people.some((p) => p.name === currentUser)) return currentUser;
  const sorted = [...people].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name),
  );
  return sorted[0]?.name ?? currentUser;
}

function storageKey(asset: LoadedAsset | null): string | undefined {
  if (!asset) return undefined;
  return asset.libraryAssetId ?? asset.displayName ?? asset.name;
}

function persist(asset: LoadedAsset | null, readings: NdtReading[]) {
  const key = storageKey(asset);
  if (!key) return;
  try {
    localStorage.setItem(LS_KEY_PREFIX + key, JSON.stringify(readings));
  } catch {
    /* ignore */
  }
}

function restore(key: string): NdtReading[] {
  try {
    const raw = localStorage.getItem(LS_KEY_PREFIX + key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NdtReading[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

interface NdtState {
  readings: NdtReading[];
  selectedId: string | null;
  mode: NdtInteractionMode;
  showMarkers: boolean;
  pinSize: number;
  focusRequest: { position: [number, number, number]; at: number } | null;
  boundAsset: LoadedAsset | null;

  bindAsset: (asset: LoadedAsset | null) => void;
  setMode: (mode: NdtInteractionMode) => void;
  setShowMarkers: (v: boolean) => void;
  setPinSize: (v: number) => void;
  addReading: (input: {
    position: [number, number, number];
    normal?: [number, number, number];
  }) => void;
  addFollowUp: (locationId: string) => void;
  updateReading: (id: string, patch: Partial<NdtReading>) => void;
  removeReading: (id: string) => void;
  select: (id: string | null) => void;
  focusOn: (id: string) => void;
  exportProject: () => NdtProjectFile;
  importProject: (project: NdtProjectFile) => void;
}

export const useNdtStore = create<NdtState>((set, get) => ({
  readings: [],
  selectedId: null,
  mode: 'tag',
  showMarkers: true,
  pinSize: 1,
  focusRequest: null,
  boundAsset: null,

  bindAsset: (asset) => {
    const key = storageKey(asset);
    set({
      boundAsset: asset,
      readings: key ? normalizeReadings(restore(key)) : [],
      selectedId: null,
      mode: 'tag',
      focusRequest: null,
    });
  },

  setMode: (mode) => set({ mode }),
  setShowMarkers: (v) => set({ showMarkers: v }),
  setPinSize: (v) => set({ pinSize: v }),

  addReading: ({ position, normal }) => {
    const { boundAsset, readings } = get();
    if (!boundAsset) return;
    const author = currentAuthor();
    if (!author) {
      useStore.getState().setError(
        'Add a team member on the Team tab before recording NDT data.',
      );
      return;
    }

    const method = 'ut_thickness';
    const info = ndtMethodInfo(method);
    const id = uuid();
    const locationId = uuid();
    const reading: NdtReading = {
      id,
      locationId,
      assetId: boundAsset.id,
      position,
      normal,
      inspectionDate: todayIsoDate(),
      method,
      reading: '',
      unit: info.defaultUnit,
      nominalThickness: '',
      minAllowed: '',
      locationTag: `CML-${listLocationGroups(readings).length + 1}`,
      equipment: '',
      calibrationRef: '',
      notes: '',
      author,
      createdAt: Date.now(),
    };

    const next = [...readings, reading];
    set({ readings: next, selectedId: reading.id });
    persist(boundAsset, next);
    logChangelog({
      category: 'annotation',
      action: 'NDT point added',
      message: `Added NDT point ${reading.locationTag} on ${boundAsset.name}.`,
      by: author,
      assetName: boundAsset.name,
      refId: reading.id,
      refLabel: reading.locationTag,
    });
  },

  addFollowUp: (locationId) => {
    const { boundAsset, readings } = get();
    if (!boundAsset) return;
    const author = currentAuthor();
    if (!author) {
      useStore.getState().setError(
        'Add a team member on the Team tab before recording NDT data.',
      );
      return;
    }

    const template = normalizeReadings(readings).find(
      (r) => r.locationId === locationId,
    );
    if (!template) return;

    const info = ndtMethodInfo(template.method);
    const reading: NdtReading = {
      id: uuid(),
      locationId,
      assetId: boundAsset.id,
      position: [...template.position],
      normal: template.normal ? [...template.normal] : undefined,
      inspectionDate: todayIsoDate(),
      method: template.method,
      reading: '',
      unit: template.unit || info.defaultUnit,
      nominalThickness: template.nominalThickness,
      minAllowed: template.minAllowed,
      locationTag: template.locationTag,
      equipment: template.equipment,
      calibrationRef: '',
      notes: '',
      author,
      createdAt: Date.now(),
    };

    const next = [...readings, reading];
    set({ readings: next, selectedId: reading.id });
    persist(boundAsset, next);
    logChangelog({
      category: 'annotation',
      action: 'NDT follow-up',
      message: `Follow-up inspection at ${reading.locationTag} on ${boundAsset.name}.`,
      by: author,
      assetName: boundAsset.name,
      refId: reading.id,
      refLabel: reading.locationTag,
    });
  },

  updateReading: (id, patch) => {
    const { readings, boundAsset } = get();
    const next = readings.map((r) => (r.id === id ? { ...r, ...patch } : r));
    set({ readings: next });
    persist(boundAsset, next);
  },

  removeReading: (id) => {
    const { readings, boundAsset, selectedId } = get();
    const removed = readings.find((r) => r.id === id);
    const next = readings.filter((r) => r.id !== id);
    set({
      readings: next,
      selectedId: selectedId === id ? null : selectedId,
    });
    persist(boundAsset, next);
    if (removed) {
      logChangelog({
        category: 'annotation',
        action: 'NDT point removed',
        message: `Removed NDT point ${removed.locationTag}.`,
        by: currentAuthor(),
        assetName: boundAsset?.name,
        refId: id,
        refLabel: removed.locationTag,
      });
    }
  },

  select: (id) => set({ selectedId: id }),

  focusOn: (id) => {
    const r = get().readings.find((x) => x.id === id);
    if (!r) return;
    set({
      selectedId: id,
      focusRequest: { position: r.position, at: Date.now() },
    });
  },

  exportProject: () => {
    const { readings, boundAsset } = get();
    return {
      version: 1,
      assetName: boundAsset?.displayName ?? boundAsset?.name ?? 'untitled',
      readings,
      exportedAt: Date.now(),
    };
  },

  importProject: (project) => {
    const { boundAsset } = get();
    if (project.version !== 1 || !Array.isArray(project.readings)) return;
    const normalized = normalizeReadings(project.readings);
    set({ readings: normalized, selectedId: null });
    persist(boundAsset, normalized);
    logChangelog({
      category: 'system',
      action: 'NDT import',
      message: `Imported ${normalized.length} NDT reading(s).`,
      by: currentAuthor(),
      assetName: boundAsset?.name ?? project.assetName,
    });
  },
}));
