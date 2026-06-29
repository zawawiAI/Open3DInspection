import * as THREE from 'three';

/**
 * Centers an object at the origin and scales it so its longest dimension
 * fits within `targetSize` world units. Returns the bounding info so callers
 * can position the camera/grid sensibly.
 */
export function fitObject(object: THREE.Object3D, targetSize = 2) {
  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;

  object.position.sub(center.multiplyScalar(scale));
  object.scale.setScalar(scale);

  return { scale, radius: (maxDim * scale) / 2 };
}

/** Builds geometry from a PLY and decides whether it is a mesh or a point cloud. */
export function plyToObject(
  geometry: THREE.BufferGeometry,
  pointSize: number,
): THREE.Object3D {
  const hasFaces = !!geometry.index && geometry.index.count > 0;
  const hasColor = !!geometry.getAttribute('color');

  if (hasFaces) {
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: hasColor ? 0xffffff : 0xcfd8e3,
      vertexColors: hasColor,
      flatShading: false,
      side: THREE.DoubleSide,
      metalness: 0.05,
      roughness: 0.85,
    });
    return new THREE.Mesh(geometry, material);
  }

  const material = new THREE.PointsMaterial({
    size: pointSize,
    sizeAttenuation: true,
    vertexColors: hasColor,
    color: hasColor ? 0xffffff : 0x9bbcff,
  });
  return new THREE.Points(geometry, material);
}
