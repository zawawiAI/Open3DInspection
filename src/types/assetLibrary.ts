import type { AssetKind, PlyFormat } from '../types';

export interface AssetFolder {
  id: string;
  name: string;
  createdAt: number;
}

/** Saved copy of an uploaded model/image in the asset library. */
export interface LibraryAsset {
  id: string;
  /** User-defined display name */
  name: string;
  folderId: string;
  /** Original uploaded filename */
  fileName: string;
  kind: AssetKind;
  ext: string;
  size: number;
  plyFormat?: PlyFormat;
  createdAt: number;
  updatedAt: number;
}

export interface AssetLibraryData {
  version: 1;
  folders: AssetFolder[];
  assets: LibraryAsset[];
}

export const DEFAULT_FOLDER_ID = 'folder-default';

export function blobKeyForAsset(assetId: string) {
  return `asset-lib:${assetId}`;
}
