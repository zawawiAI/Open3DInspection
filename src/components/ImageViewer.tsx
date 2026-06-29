import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import type { LoadedAsset } from '../types';

export function ImageViewer({ asset }: { asset: LoadedAsset }) {
  const mode = useStore((s) => s.mode);
  const annotations = useStore((s) => s.annotations);
  const showAnnotations = useStore((s) => s.showAnnotations);
  const pinSize = useStore((s) => s.pinSize);
  const addAnnotation = useStore((s) => s.addAnnotation);
  const select = useStore((s) => s.select);
  const selectedId = useStore((s) => s.selectedId);

  const containerRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0, left: 0, top: 0 });

  // recompute the fitted (contain) display rectangle of the image
  useEffect(() => {
    const compute = () => {
      const el = containerRef.current;
      if (!el || !natural) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const scale = Math.min(cw / natural.w, ch / natural.h);
      const w = natural.w * scale;
      const h = natural.h * scale;
      setBox({ w, h, left: (cw - w) / 2, top: (ch - h) / 2 });
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [natural]);

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'annotate' || !box.w) return;
    const el = containerRef.current!;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - box.left;
    const y = e.clientY - rect.top - box.top;
    if (x < 0 || y < 0 || x > box.w || y > box.h) return;
    addAnnotation({ kind: '2d', position: [x / box.w, y / box.h, 0] });
  };

  return (
    <div
      ref={containerRef}
      className="image-viewer"
      style={{ cursor: mode === 'annotate' ? 'crosshair' : 'default' }}
      onClick={handleClick}
    >
      <img
        src={asset.url}
        alt={asset.name}
        draggable={false}
        onLoad={(e) =>
          setNatural({
            w: e.currentTarget.naturalWidth,
            h: e.currentTarget.naturalHeight,
          })
        }
        style={{
          position: 'absolute',
          left: box.left,
          top: box.top,
          width: box.w || 'auto',
          height: box.h || 'auto',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />
      {showAnnotations && annotations
        .filter((a) => a.kind === '2d')
        .map((a, _i) => (
          <button
            key={a.id}
            className={`image-pin ${
              selectedId === a.id ? 'image-pin--selected' : ''
            } ${a.resolved ? 'image-pin--resolved' : ''}`}
            style={{
              left: box.left + a.position[0] * box.w,
              top: box.top + a.position[1] * box.h,
              background: a.color,
              transform: `translate(-50%, -50%) scale(${pinSize})`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              select(a.id);
            }}
            title={a.title}
          >
            {annotations.indexOf(a) + 1}
          </button>
        ))}
    </div>
  );
}
