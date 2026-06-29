import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import type CameraControlsImpl from 'camera-controls';
import * as THREE from 'three';
import { useStore } from '../store/useStore';
import { useNdtStore } from '../store/useNdtStore';
import { Model } from './Model';
import { Annotations3D } from './Annotations3D';
import { NdtPins3D } from './NdtPins3D';
import { raycastModelSurface } from '../lib/raycastAnnotate';
import type { LoadedAsset } from '../types';

export type ViewerWorkspace = 'annotator' | 'data';

function PointRaycastConfig() {
  const pointSize = useStore((s) => s.pointSize);
  const raycaster = useThree((s) => s.raycaster);
  useEffect(() => {
    raycaster.params.Points = { threshold: Math.max(pointSize * 2, 0.02) };
  }, [pointSize, raycaster]);
  return null;
}

function CameraRig({
  focusRequest,
}: {
  focusRequest: { position: [number, number, number]; at: number } | null;
}) {
  const controls = useThree((s) => s.controls) as CameraControlsImpl | null;
  const lastAt = useRef(0);

  useEffect(() => {
    if (!focusRequest || !controls || focusRequest.at === lastAt.current) return;
    lastAt.current = focusRequest.at;

    const [tx, ty, tz] = focusRequest.position;
    const target = new THREE.Vector3(tx, ty, tz);
    const pos = new THREE.Vector3();
    controls.getPosition(pos);

    const dir = pos.clone().sub(controls.getTarget(new THREE.Vector3()));
    const len = dir.length();
    if (len < 1e-6) dir.set(0.4, 0.35, 0.9);
    else dir.normalize();

    const dist = Math.max(len * 0.55, controls.minDistance, 0.35);
    const newPos = target.clone().add(dir.multiplyScalar(dist));

    void controls.setLookAt(
      newPos.x,
      newPos.y,
      newPos.z,
      tx,
      ty,
      tz,
      true,
    );
  }, [focusRequest, controls]);

  return null;
}

const DRAG_THRESHOLD = 5;

export function Scene({
  asset,
  workspace = 'annotator',
}: {
  asset: LoadedAsset;
  workspace?: ViewerWorkspace;
}) {
  const annotatorMode = useStore((s) => s.mode);
  const annotatorFocus = useStore((s) => s.focusRequest);
  const showGrid = useStore((s) => s.showGrid);
  const pointSize = useStore((s) => s.pointSize);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const selectAnnotation = useStore((s) => s.select);
  const setError = useStore((s) => s.setError);

  const ndtMode = useNdtStore((s) => s.mode);
  const ndtFocus = useNdtStore((s) => s.focusRequest);
  const addReading = useNdtStore((s) => s.addReading);
  const selectReading = useNdtStore((s) => s.select);

  const tagActive =
    workspace === 'annotator' ? annotatorMode === 'annotate' : ndtMode === 'tag';
  const focusRequest = workspace === 'annotator' ? annotatorFocus : ndtFocus;

  const { camera, scene, gl } = useThree();
  const pendingClick = useRef<{ sx: number; sy: number } | null>(null);

  useEffect(() => {
    if (!tagActive) return;

    const canvas = gl.domElement;

    const onPointerDown = (e: PointerEvent) => {
      pendingClick.current = { sx: e.clientX, sy: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!pendingClick.current) return;
      const { sx, sy } = pendingClick.current;
      pendingClick.current = null;

      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) return;

      const threshold = Math.max(pointSize * 2, 0.02);
      const hit = raycastModelSurface(
        camera,
        canvas,
        scene,
        e.clientX,
        e.clientY,
        threshold,
      );

      if (!hit) {
        setError('Click directly on the model surface to place a marker.');
        setTimeout(() => setError(null), 2500);
        return;
      }

      if (workspace === 'data') {
        addReading({
          position: [hit.point.x, hit.point.y, hit.point.z],
          normal: hit.normal,
        });
      } else {
        addAnnotation({
          kind: '3d',
          position: [hit.point.x, hit.point.y, hit.point.z],
          normal: hit.normal,
        });
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [
    tagActive,
    workspace,
    camera,
    scene,
    gl,
    pointSize,
    addAnnotation,
    addReading,
    setError,
  ]);

  const handlePointerMissed = () => {
    if (!tagActive) return;
    if (workspace === 'data') selectReading(null);
    else selectAnnotation(null);
  };

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.35} />
      <hemisphereLight args={[0xbfd4ff, 0x202830, 0.4]} />

      {showGrid && (
        <Grid
          args={[20, 20]}
          cellSize={0.25}
          cellColor="#2b3950"
          sectionSize={1}
          sectionColor="#3f5375"
          fadeDistance={18}
          fadeStrength={1.2}
          infiniteGrid
          position={[0, -1.001, 0]}
          raycast={() => null}
        />
      )}

      <group onPointerMissed={handlePointerMissed}>
        <Model asset={asset} />
      </group>

      {workspace === 'annotator' ? <Annotations3D /> : <NdtPins3D />}
      <PointRaycastConfig />
      <CameraRig focusRequest={focusRequest} />
    </>
  );
}
