import { useEffect, useRef, useState } from 'react';
import { getBlob } from '../lib/fileStore';

interface Props {
  id: string;
  name: string;
  mimeType: string;
  onClose: () => void;
}

export function FileViewer({ id, name, mimeType, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    getBlob(id)
      .then((blob) => {
        if (!blob) { setError(true); return; }
        const u = URL.createObjectURL(blob);
        urlRef.current = u;
        setUrl(u);
      })
      .catch(() => setError(true));

    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [id]);

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isWord =
    mimeType === 'application/msword' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  return (
    <div className="fv-overlay" onClick={onClose}>
      <div
        className={`fv-panel ${isImage ? 'fv-panel--image' : 'fv-panel--doc'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fv-head">
          <span className="fv-name" title={name}>{name}</span>
          <div className="fv-head-btns">
            {url && (
              <a className="fv-btn" href={url} download={name} title="Download">
                ⬇ Download
              </a>
            )}
            <button className="fv-btn fv-btn--close" onClick={onClose} title="Close">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="fv-body">
          {!url && !error && (
            <div className="fv-state">
              <span className="fv-spinner" />
              <span>Loading…</span>
            </div>
          )}

          {error && (
            <div className="fv-state fv-state--error">
              <div>⚠ File not found</div>
              <p>This file may have been cleared from browser storage (IndexedDB).
              Re-attach it to restore access.</p>
            </div>
          )}

          {url && isImage && (
            <div className="fv-img-wrap">
              <img className="fv-img" src={url} alt={name} />
            </div>
          )}

          {url && isPdf && (
            <iframe
              className="fv-iframe"
              src={url}
              title={name}
            />
          )}

          {url && isWord && (
            <div className="fv-state fv-state--word">
              <div className="fv-word-icon">📝</div>
              <div className="fv-word-name">{name}</div>
              <p>Word documents can't be previewed in the browser.</p>
              <a className="fv-btn fv-btn--download" href={url} download={name}>
                ⬇ Download to open
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
