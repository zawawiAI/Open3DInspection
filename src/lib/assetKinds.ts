import type { AssetKind } from '../types';

const EXT_TO_KIND: Record<string, AssetKind> = {
  obj: 'obj',
  fbx: 'fbx',
  glb: 'gltf',
  gltf: 'gltf',
  ply: 'ply',
  splat: 'splat',
  ksplat: 'splat',
  las: 'las',
  laz: 'las',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
};

export function kindFromFilename(name: string): AssetKind | null {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TO_KIND[ext] ?? null;
}

export const ACCEPTED_ASSET_EXTENSIONS =
  '.ply,.obj,.fbx,.glb,.gltf,.splat,.ksplat,.las,.laz,.jpg,.jpeg,.png';

export function defaultAssetName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '') || fileName;
}
