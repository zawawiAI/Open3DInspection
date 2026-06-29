import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Splat } from '@react-three/drei';
import { Splat as VisusSplat } from '@speridlabs/visus/react';
import { OBJLoader, FBXLoader, PLYLoader, GLTFLoader } from 'three-stdlib';
import * as THREE from 'three';
import type { LoadedAsset } from '../types';
import { fitObject, plyToObject } from '../loaders/normalize';
import { tagAnnotatable } from '../lib/raycastAnnotate';
import { loadLAS } from '../loaders/lasLoader';
import { useStore } from '../store/useStore';

function FittedPrimitive({ object }: { object: THREE.Object3D }) {
  useMemo(() => {
    fitObject(object);
    tagAnnotatable(object);
  }, [object]);
  return <primitive object={object} />;
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const prepared = useMemo(() => {
    const clone = obj.clone(true);
    clone.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        if (!m.material) {
          m.material = new THREE.MeshStandardMaterial({ color: 0xcfd8e3 });
        }
      }
    });
    return clone;
  }, [obj]);
  return <FittedPrimitive object={prepared} />;
}

function FbxModel({ url }: { url: string }) {
  const fbx = useLoader(FBXLoader, url);
  const prepared = useMemo(() => fbx.clone(true), [fbx]);
  return <FittedPrimitive object={prepared} />;
}

function GltfModel({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const prepared = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        if (!m.material) {
          m.material = new THREE.MeshStandardMaterial({ color: 0xcfd8e3 });
        }
      }
    });
    return clone;
  }, [gltf]);
  return <FittedPrimitive object={prepared} />;
}

function PlyModel({ url }: { url: string }) {
  const geometry = useLoader(PLYLoader, url);
  const pointSize = useStore((s) => s.pointSize);
  const object = useMemo(
    () => plyToObject(geometry.clone(), pointSize),
    [geometry, pointSize],
  );
  return <FittedPrimitive object={object} />;
}

function LasModel({ url }: { url: string }) {
  const [object, setObject] = useState<THREE.Points | null>(null);
  const setError = useStore((s) => s.setError);

  useEffect(() => {
    let cancelled = false;
    loadLAS(url)
      .then((pts) => {
        if (!cancelled) setObject(pts);
      })
      .catch((e) => {
        console.error(e);
        setError(`Failed to load point cloud: ${e?.message ?? e}`);
      });
    return () => {
      cancelled = true;
    };
  }, [url, setError]);

  if (!object) return null;
  return <FittedPrimitive object={object} />;
}

/** Tag splat mesh once loaded so raycasts can target it. */
function SplatWrapper({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const tagged = useRef(false);
  useFrame(() => {
    if (!tagged.current && group.current?.children.length) {
      tagAnnotatable(group.current);
      tagged.current = true;
    }
  });
  return <group ref={group}>{children}</group>;
}

function BinarySplatModel({ url }: { url: string }) {
  return (
    <SplatWrapper>
      <Splat src={url} />
    </SplatWrapper>
  );
}

function GaussianSplatPlyModel({ url }: { url: string }) {
  const group = useRef<THREE.Group>(null);
  const fitted = useRef(false);

  useFrame(() => {
    if (!fitted.current && group.current?.children.length) {
      fitObject(group.current);
      tagAnnotatable(group.current);
      fitted.current = true;
    }
  });

  return (
    <group ref={group}>
      <VisusSplat url={url} type="ply" splatOptions={{ autoSort: true }} />
    </group>
  );
}

function ModelInner({ asset }: { asset: LoadedAsset }) {
  const treatPlyAsSplat = useStore((s) => s.treatPlyAsSplat);

  switch (asset.kind) {
    case 'obj':
      return <ObjModel url={asset.url} />;
    case 'fbx':
      return <FbxModel url={asset.url} />;
    case 'gltf':
      return <GltfModel url={asset.url} />;
    case 'ply':
      if (treatPlyAsSplat && asset.plyFormat === 'gaussian') {
        return <GaussianSplatPlyModel url={asset.url} />;
      }
      return <PlyModel url={asset.url} />;
    case 'splat':
      return <BinarySplatModel url={asset.url} />;
    case 'las':
      return <LasModel url={asset.url} />;
    default:
      return null;
  }
}

export function Model({ asset }: { asset: LoadedAsset }) {
  const treatPlyAsSplat = useStore((s) => s.treatPlyAsSplat);
  const modeKey =
    asset.kind === 'ply'
      ? `${asset.url}-${asset.plyFormat ?? 'pending'}-${treatPlyAsSplat}`
      : asset.url;

  return (
    <Suspense fallback={null}>
      <ModelInner key={modeKey} asset={asset} />
    </Suspense>
  );
}
