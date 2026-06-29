import { load } from '@loaders.gl/core';
import { LASLoader } from '@loaders.gl/las';
import * as THREE from 'three';

/**
 * Loads a LAS/LAZ point cloud from a URL and returns a centered THREE.Points
 * object with per-point colors (when present) or an intensity-based fallback.
 */
export async function loadLAS(url: string): Promise<THREE.Points> {
  const data: any = await load(url, LASLoader, {
    las: { skip: 1, colorDepth: 'auto' },
  });

  const attributes = data.attributes ?? {};
  const positionsRaw: Float32Array =
    attributes.POSITION?.value ?? new Float32Array(0);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(positionsRaw, 3),
  );

  // Colors: loaders.gl exposes COLOR_0 as Uint8 RGBA (0..255) when present.
  const colorAttr = attributes.COLOR_0;
  if (colorAttr?.value) {
    const src: ArrayLike<number> = colorAttr.value;
    const size = colorAttr.size ?? 4;
    const count = positionsRaw.length / 3;
    const colors = new Float32Array(count * 3);
    // detect 0..255 vs 0..65535 depth
    let max = 0;
    for (let i = 0; i < src.length; i++) max = Math.max(max, src[i]);
    const div = max > 255 ? 65535 : 255;
    for (let i = 0; i < count; i++) {
      colors[i * 3] = src[i * size] / div;
      colors[i * 3 + 1] = src[i * size + 1] / div;
      colors[i * 3 + 2] = src[i * size + 2] / div;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  geometry.computeBoundingBox();
  // center the cloud at the origin so it sits in view
  const center = new THREE.Vector3();
  geometry.boundingBox?.getCenter(center);
  geometry.translate(-center.x, -center.y, -center.z);
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    size: 1,
    sizeAttenuation: true,
    vertexColors: !!colorAttr?.value,
    color: colorAttr?.value ? 0xffffff : 0x9bbcff,
  });

  const points = new THREE.Points(geometry, material);
  points.name = 'las-pointcloud';
  return points;
}
