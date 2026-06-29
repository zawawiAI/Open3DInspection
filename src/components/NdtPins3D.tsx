import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { NDT_PIN } from '../lib/raycastAnnotate';
import { isBelowMinAllowed } from '../lib/ndtMethods';
import { listLocationGroups } from '../lib/ndtLocations';
import { useNdtStore } from '../store/useNdtStore';
import type { NdtReading } from '../types/ndt';

function screenScale(distance: number, selected: boolean, pinSize: number) {
  const base = THREE.MathUtils.clamp(distance * 0.026, 0.09, 0.65);
  return (selected ? base * 1.2 : base) * pinSize;
}

function triangleShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0.58);
  s.lineTo(-0.52, -0.48);
  s.lineTo(0.52, -0.48);
  s.closePath();
  return s;
}

function TrianglePin({
  reading,
  index,
  inspectionCount,
}: {
  reading: NdtReading;
  index: number;
  inspectionCount: number;
}) {
  const mode = useNdtStore((s) => s.mode);
  const selectedId = useNdtStore((s) => s.selectedId);
  const pinSize = useNdtStore((s) => s.pinSize);
  const select = useNdtStore((s) => s.select);
  const readings = useNdtStore((s) => s.readings);
  const isSelected = readings.some(
    (r) => r.id === selectedId && (r.locationId ?? r.id) === reading.locationId,
  );
  const alarm = isBelowMinAllowed(reading);

  const visual = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const shape = useMemo(() => triangleShape(), []);

  const anchor = useMemo(
    () => new THREE.Vector3(...reading.position),
    [reading.position],
  );

  const offset = useMemo(() => {
    if (reading.normal) {
      const n = new THREE.Vector3(...reading.normal).normalize();
      return anchor.clone().add(n.multiplyScalar(0.015));
    }
    return anchor;
  }, [anchor, reading.normal]);

  const fillColor = alarm ? '#ef4444' : isSelected ? '#fbbf24' : '#f59e0b';
  const borderColor = alarm ? '#7f1d1d' : '#c2410c';

  useFrame(() => {
    if (!visual.current) return;
    const dist = camera.position.distanceTo(anchor);
    visual.current.scale.setScalar(screenScale(dist, isSelected, pinSize));
  });

  return (
    <group position={offset.toArray()} userData={{ [NDT_PIN]: true }}>
      <Billboard follow>
        <group ref={visual}>
          <mesh
            raycast={mode === 'tag' ? () => null : undefined}
            onPointerDown={(e) => {
              if (mode !== 'navigate') return;
              e.stopPropagation();
              select(reading.id);
            }}
          >
            <circleGeometry args={[0.75, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          <mesh position={[0, -0.08, -0.03]}>
            <circleGeometry args={[0.45, 24]} />
            <meshBasicMaterial color="#000" transparent opacity={0.25} depthWrite={false} />
          </mesh>

          <mesh position={[0, 0, -0.01]} scale={1.08}>
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial color={borderColor} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>

          <mesh position={[0, 0, 0]}>
            <shapeGeometry args={[shape]} />
            <meshBasicMaterial color={fillColor} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>

          <Text
            position={[0, -0.02, 0.02]}
            fontSize={0.34}
            color="#1c1917"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#ffffff"
            renderOrder={2}
          >
            {String(index)}
          </Text>

          {inspectionCount > 1 && (
            <Text
              position={[0.42, 0.38, 0.03]}
              fontSize={0.22}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#1c1917"
              renderOrder={3}
            >
              {String(inspectionCount)}
            </Text>
          )}
        </group>
      </Billboard>
    </group>
  );
}

export function NdtPins3D() {
  const readings = useNdtStore((s) => s.readings);
  const showMarkers = useNdtStore((s) => s.showMarkers);
  const locations = useMemo(() => listLocationGroups(readings), [readings]);

  if (!showMarkers) return null;

  return (
    <>
      {locations.map((loc) => (
        <TrianglePin
          key={loc.locationId}
          reading={loc.latest}
          index={loc.index}
          inspectionCount={loc.readings.length}
        />
      ))}
    </>
  );
}
