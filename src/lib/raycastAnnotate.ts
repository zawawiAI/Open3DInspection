import * as THREE from 'three';

export const ANNOTATABLE = 'annotatable';
export const ANNOTATION_PIN = 'annotationPin';
export const NDT_PIN = 'ndtPin';

/** Tag every mesh/points under a loaded model so raycasts can target them. */
export function tagAnnotatable(root: THREE.Object3D) {
  root.userData[ANNOTATABLE] = true;
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh || (child as THREE.Points).isPoints) {
      child.userData[ANNOTATABLE] = true;
    }
  });
}

function isMarkerPin(obj: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData[ANNOTATION_PIN] || o.userData[NDT_PIN]) return true;
    o = o.parent;
  }
  return false;
}

function isAnnotatable(obj: THREE.Object3D): boolean {
  let o: THREE.Object3D | null = obj;
  while (o) {
    if (o.userData[ANNOTATION_PIN] || o.userData[NDT_PIN]) return false;
    if (o.userData[ANNOTATABLE]) return true;
    o = o.parent;
  }
  return false;
}

export interface SurfaceHit {
  point: THREE.Vector3;
  normal: [number, number, number];
}

/**
 * Raycast from screen coords and return the closest hit on the loaded model.
 * Ignores pins, grid, and other scene objects.
 */
export function raycastModelSurface(
  camera: THREE.Camera,
  canvas: HTMLCanvasElement,
  scene: THREE.Scene,
  clientX: number,
  clientY: number,
  pointThreshold = 0.02,
): SurfaceHit | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(ndc, camera);
  raycaster.params.Points = { threshold: pointThreshold };
  raycaster.firstHitOnly = false;

  const candidates: THREE.Object3D[] = [];
  scene.traverse((obj) => {
    if (
      ((obj as THREE.Mesh).isMesh || (obj as THREE.Points).isPoints) &&
      isAnnotatable(obj) &&
      !isMarkerPin(obj)
    ) {
      candidates.push(obj);
    }
  });

  if (!candidates.length) return null;

  const hits = raycaster.intersectObjects(candidates, false);
  const hit = hits.find((h) => isAnnotatable(h.object) && !isMarkerPin(h.object));
  if (!hit) return null;

  const camPos = new THREE.Vector3();
  camera.getWorldPosition(camPos);
  const toCam = camPos.clone().sub(hit.point).normalize();

  let normal: THREE.Vector3;
  if (hit.face) {
    normal = hit.face.normal.clone();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
    normal.applyMatrix3(normalMatrix).normalize();
    // Keep normal facing the camera (front-face placement)
    if (normal.dot(toCam) < 0) normal.negate();
  } else {
    // Point cloud — approximate normal as direction toward camera
    normal = toCam;
  }

  return {
    point: hit.point.clone(),
    normal: [normal.x, normal.y, normal.z],
  };
}
