export type AssetKind =
  | 'obj'
  | 'fbx'
  | 'gltf' // .glb / .gltf
  | 'ply' // mesh, point cloud, or gaussian splat (see plyFormat)
  | 'splat' // gaussian splatting (.splat / .ksplat)
  | 'las' // LAS / LAZ point cloud
  | 'image'; // jpg / png

/** Detected sub-format for PLY files (set after header sniff). */
export type PlyFormat = 'mesh' | 'pointcloud' | 'gaussian';

export interface LoadedAsset {
  id: string;
  name: string;
  kind: AssetKind;
  url: string; // object URL created from the dropped File
  /** original file extension, lowercased, no dot */
  ext: string;
  /** populated asynchronously for .ply files */
  plyFormat?: PlyFormat;
  /** linked library entry when loaded from asset folder */
  libraryAssetId?: string;
  /** user-defined name from asset library */
  displayName?: string;
}

/**
 * An annotation is a comment anchored either to a 3D point (kind '3d')
 * or to a normalized 2D coordinate on an image (kind '2d').
 */
export interface AnnotationAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: number;
  /**
   * Base64 data URL — only present in JSON exports or when importing.
   * Runtime files are stored in IndexedDB (fast, binary) — no base64 overhead.
   */
  dataUrl?: string;
}

export interface Annotation {
  id: string;
  /** id of the asset this annotation belongs to */
  assetId: string;
  kind: '3d' | '2d';
  /** [x, y, z] world position for 3d; [u, v, 0] normalized 0..1 for 2d */
  position: [number, number, number];
  /** surface normal at the hit point, when available (3d only) */
  normal?: [number, number, number];
  title: string;
  body: string;
  color: string;
  author: string;
  createdAt: number;
  priority: AnnotationPriority;
  resolved: boolean;
  /** CRM report linked to this annotation, if escalated */
  reportId?: string;
  attachments: AnnotationAttachment[];
}

export type AnnotationPriority = 'critical' | 'high' | 'medium' | 'low';

export type InteractionMode = 'navigate' | 'annotate';

export interface ProjectFile {
  version: 1;
  assetName: string;
  annotations: Annotation[];
  exportedAt: number;
}
