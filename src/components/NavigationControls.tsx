import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { useNdtStore } from '../store/useNdtStore';
import { raycastModelSurface } from '../lib/raycastAnnotate';
import type { ViewerWorkspace } from './Scene';

const { ACTION } = CameraControlsImpl;

function applyMouseBindings(controls: CameraControlsImpl, annotate: boolean) {
  if (annotate) {
    controls.mouseButtons.left = ACTION.NONE;
    controls.mouseButtons.middle = ACTION.ROTATE;
    controls.mouseButtons.right = ACTION.TRUCK;
    controls.mouseButtons.wheel = ACTION.DOLLY;
  } else {
    controls.mouseButtons.left = ACTION.ROTATE;
    controls.mouseButtons.middle = ACTION.TRUCK;
    controls.mouseButtons.right = ACTION.TRUCK;
    controls.mouseButtons.wheel = ACTION.DOLLY;
  }
}

function focusOnSurface(
  controls: CameraControlsImpl,
  hit: THREE.Vector3,
  zoomFactor = 0.45,
) {
  const pos = new THREE.Vector3();
  const target = new THREE.Vector3();
  controls.getPosition(pos);
  controls.getTarget(target);

  const dir = pos.clone().sub(target);
  const len = dir.length();
  if (len < 1e-6) dir.set(0, 0, 1);
  else dir.normalize();

  const distToHit = pos.distanceTo(hit);
  const newDist = Math.max(distToHit * zoomFactor, controls.minDistance, 0.08);

  const newPos = hit.clone().add(dir.multiplyScalar(newDist));
  void controls.setLookAt(
    newPos.x,
    newPos.y,
    newPos.z,
    hit.x,
    hit.y,
    hit.z,
    true,
  );
}

export function NavigationControls({
  workspace = 'annotator',
}: {
  workspace?: ViewerWorkspace;
}) {
  const annotatorMode = useStore((s) => s.mode);
  const ndtMode = useNdtStore((s) => s.mode);
  const pointSize = useStore((s) => s.pointSize);
  const controlsRef = useRef<CameraControlsImpl>(null);
  const { scene, camera, gl } = useThree();

  const tagActive =
    workspace === 'annotator' ? annotatorMode === 'annotate' : ndtMode === 'tag';

  useEffect(() => {
    let frame = 0;
    const apply = () => {
      const controls = controlsRef.current;
      if (!controls) {
        frame = requestAnimationFrame(apply);
        return;
      }
      applyMouseBindings(controls, tagActive);
    };
    apply();
    return () => cancelAnimationFrame(frame);
  }, [tagActive]);

  useEffect(() => {
    const canvas = gl.domElement;
    const controls = controlsRef.current;
    if (!controls) return;

    const onDoubleClick = (e: MouseEvent) => {
      if (e.button !== 0) return;

      const threshold = Math.max(pointSize * 2, 0.02);
      const hit = raycastModelSurface(
        camera,
        canvas,
        scene,
        e.clientX,
        e.clientY,
        threshold,
      );
      if (!hit) return;

      focusOnSurface(controls, hit.point);
    };

    canvas.addEventListener('dblclick', onDoubleClick);
    return () => canvas.removeEventListener('dblclick', onDoubleClick);
  }, [camera, scene, gl, pointSize]);

  const setCursor = (cursor: string) => {
    gl.domElement.style.cursor = cursor;
  };

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor
      infinityDolly
      smoothTime={0.22}
      draggingSmoothTime={0.08}
      dollySpeed={1.15}
      azimuthRotateSpeed={0.95}
      polarRotateSpeed={0.95}
      truckSpeed={1.4}
      minDistance={0.05}
      maxDistance={800}
      onStart={() => setCursor(tagActive ? 'crosshair' : 'grabbing')}
      onEnd={() => setCursor(tagActive ? 'crosshair' : 'grab')}
    />
  );
}
