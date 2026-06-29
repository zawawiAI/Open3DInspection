import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Billboard, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ANNOTATION_PIN } from '../lib/raycastAnnotate';
import { useStore } from '../store/useStore';
import type { Annotation } from '../types';

/** Keeps pin roughly the same on-screen size while zooming. */
function screenScale(distance: number, selected: boolean, pinSize: number) {
  const base = THREE.MathUtils.clamp(distance * 0.026, 0.09, 0.65);
  return (selected ? base * 1.2 : base) * pinSize;
}

function Pin({ annotation, index }: { annotation: Annotation; index: number }) {
  const mode = useStore((s) => s.mode);
  const selectedId = useStore((s) => s.selectedId);
  const pinSize = useStore((s) => s.pinSize);
  const select = useStore((s) => s.select);
  const isSelected = selectedId === annotation.id;
  const resolved = annotation.resolved;

  const visual = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const { camera } = useThree();

  const anchor = useMemo(
    () => new THREE.Vector3(...annotation.position),
    [annotation.position],
  );

  const offset = useMemo(() => {
    if (annotation.normal) {
      const n = new THREE.Vector3(...annotation.normal).normalize();
      return anchor.clone().add(n.multiplyScalar(0.015));
    }
    return anchor;
  }, [anchor, annotation.normal]);

  useFrame(({ clock }) => {
    if (!visual.current) return;
    const dist = camera.position.distanceTo(anchor);
    const s = screenScale(dist, isSelected, pinSize);
    visual.current.scale.setScalar(s);

    if (glow.current) {
      const pulse = isSelected ? 1 + Math.sin(clock.elapsedTime * 4) * 0.08 : 1;
      glow.current.scale.setScalar(pulse);
      const mat = glow.current.material as THREE.MeshBasicMaterial;
      mat.opacity = isSelected ? 0.35 + Math.sin(clock.elapsedTime * 4) * 0.12 : 0;
    }
  });

  const color = annotation.color;
  const opacity = resolved ? 0.45 : 1;

  return (
    <group position={offset.toArray()} userData={{ [ANNOTATION_PIN]: true }}>
      <Billboard follow>
        <group ref={visual}>
          <mesh
            raycast={mode === 'annotate' ? () => null : undefined}
            onPointerDown={(e) => {
              if (mode !== 'navigate') return;
              e.stopPropagation();
              select(annotation.id);
            }}
          >
            <sphereGeometry args={[0.72, 12, 12]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>

          {/* selection pulse ring */}
          <mesh ref={glow} position={[0, 0, -0.02]}>
            <ringGeometry args={[0.62, 0.78, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* drop shadow */}
          <mesh position={[0, -0.06, -0.03]}>
            <circleGeometry args={[0.52, 32]} />
            <meshBasicMaterial
              color="#000000"
              transparent
              opacity={0.28 * opacity}
              depthWrite={false}
            />
          </mesh>

          {/* colored border ring */}
          <mesh position={[0, 0, 0]}>
            <ringGeometry args={[0.44, 0.58, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={opacity}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* white fill */}
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.44, 32]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={opacity}
              depthWrite={false}
            />
          </mesh>

          {/* peg into surface */}
          <mesh position={[0, 0, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 0.22, 12]} />
            <meshBasicMaterial color={color} transparent opacity={0.85 * opacity} />
          </mesh>

          {/* index label */}
          <Text
            position={[0, 0, 0.02]}
            fontSize={0.38}
            color={resolved ? '#64748b' : '#0f172a'}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.025}
            outlineColor="#ffffff"
            fillOpacity={opacity}
            renderOrder={2}
          >
            {String(index)}
          </Text>
        </group>
      </Billboard>
    </group>
  );
}

export function Annotations3D() {
  const annotations = useStore((s) => s.annotations);
  const showAnnotations = useStore((s) => s.showAnnotations);
  if (!showAnnotations) return null;

  const pins = annotations.filter((a) => a.kind === '3d');

  return (
    <>
      {pins.map((a) => {
        const index = annotations.findIndex((x) => x.id === a.id) + 1;
        return <Pin key={a.id} annotation={a} index={index} />;
      })}
    </>
  );
}
