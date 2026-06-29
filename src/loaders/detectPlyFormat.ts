import type { PlyFormat } from '../types';

const GAUSSIAN_PROPS = ['scale_0', 'opacity', 'rot_0', 'f_dc_0'];

/**
 * Reads the PLY header and classifies the file.
 * Gaussian splat PLY files include scale, rotation, opacity, and SH coefficients.
 */
export async function detectPlyFormat(file: File): Promise<PlyFormat> {
  const head = await file.slice(0, 16384).text();
  const end = head.indexOf('end_header');
  if (end === -1) return 'pointcloud';

  const header = head.slice(0, end).toLowerCase();
  const hasFaces = /\belement\s+face\b/.test(header);
  if (hasFaces) return 'mesh';

  const hasGaussian = GAUSSIAN_PROPS.every((p) => header.includes(p));
  if (hasGaussian) return 'gaussian';

  return 'pointcloud';
}

export function plyFormatLabel(format: PlyFormat): string {
  switch (format) {
    case 'mesh':
      return 'mesh';
    case 'pointcloud':
      return 'point cloud';
    case 'gaussian':
      return 'Gaussian splat';
  }
}
