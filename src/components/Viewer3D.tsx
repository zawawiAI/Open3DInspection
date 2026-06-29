import { Canvas } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport } from '@react-three/drei';
import { Scene, type ViewerWorkspace } from './Scene';
import { NavigationControls } from './NavigationControls';
import { useStore } from '../store/useStore';
import { useNdtStore } from '../store/useNdtStore';
import { useTheme } from '../hooks/useTheme';
import type { LoadedAsset } from '../types';

export function Viewer3D({
  asset,
  workspace = 'annotator',
}: {
  asset: LoadedAsset;
  workspace?: ViewerWorkspace;
}) {
  const annotatorMode = useStore((s) => s.mode);
  const ndtMode = useNdtStore((s) => s.mode);
  const { theme } = useTheme();
  const canvasBg = theme === 'light' ? '#ffffff' : '#0b1220';

  const tagActive =
    workspace === 'annotator' ? annotatorMode === 'annotate' : ndtMode === 'tag';

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [2.5, 1.8, 3], fov: 50, near: 0.01, far: 1000 }}
      style={{ cursor: tagActive ? 'crosshair' : 'grab' }}
    >
      <color attach="background" args={[canvasBg]} />
      <Scene asset={asset} workspace={workspace} />
      <NavigationControls workspace={workspace} />
      <GizmoHelper alignment="bottom-right" margin={[72, 72]}>
        <GizmoViewport
          axisColors={['#f43f5e', '#10b981', '#3b82f6']}
          labelColor="white"
        />
      </GizmoHelper>
    </Canvas>
  );
}
