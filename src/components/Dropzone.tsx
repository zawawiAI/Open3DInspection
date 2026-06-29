import { useRef, useState } from 'react';
import { useStore } from '../store/useStore';

export function Dropzone({ children }: { children: React.ReactNode }) {
  const loadFile = useStore((s) => s.loadFile);
  const asset = useStore((s) => s.asset);
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  return (
    <div
      className="dropzone"
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) loadFile(file);
      }}
    >
      {children}
      {(dragging || !asset) && (
        <div className={`dropzone__overlay ${dragging ? 'is-dragging' : ''}`}>
          <div className="dropzone__card">
            <div className="dropzone__icon">⬇</div>
            <h2>Drop a file to annotate</h2>
            <p>PLY · OBJ · FBX · GLB · glTF · Gaussian Splat · LAS / LAZ · JPG · PNG</p>
            {!asset && (
              <span className="dropzone__hint">
                or use “Open file” in the toolbar
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
