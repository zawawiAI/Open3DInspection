import { create } from 'zustand';
import { v4 as uuid } from 'uuid';

export type ChangelogCategory = 'annotation' | 'report' | 'team' | 'system';

export interface ChangelogEntry {
  id: string;
  category: ChangelogCategory;
  action: string;
  message: string;
  by: string;
  at: number;
  assetName?: string;
  refId?: string;
  refLabel?: string;
}

const LS_KEY = 'open3dinspection:changelog';
const LEGACY_LS_KEYS = ['openinspection:changelog'];
const MAX_ENTRIES = 500;

function load(): ChangelogEntry[] {
  try {
    for (const key of [LS_KEY, ...LEGACY_LS_KEYS]) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as ChangelogEntry[];
      if (Array.isArray(parsed)) {
        if (key !== LS_KEY) persist(parsed);
        return parsed;
      }
    }
    return [];
  } catch {
    return [];
  }
}

function persist(entries: ChangelogEntry[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore */
  }
}

interface ChangelogState {
  entries: ChangelogEntry[];
  add: (entry: Omit<ChangelogEntry, 'id' | 'at'> & { at?: number }) => void;
  clear: () => void;
}

export const useChangelogStore = create<ChangelogState>((set, get) => ({
  entries: load(),

  add: (entry) => {
    const next: ChangelogEntry = {
      id: uuid(),
      at: entry.at ?? Date.now(),
      ...entry,
    };
    const entries = [next, ...get().entries].slice(0, MAX_ENTRIES);
    persist(entries);
    set({ entries });
  },

  clear: () => {
    persist([]);
    set({ entries: [] });
  },
}));

/** Log a change without subscribing to the store. */
export function logChangelog(
  entry: Omit<ChangelogEntry, 'id' | 'at'> & { at?: number },
) {
  useChangelogStore.getState().add(entry);
}
