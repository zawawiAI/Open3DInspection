import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useStore } from '../store/useStore';
import { saveFile } from '../lib/fileStore';
import { FileViewer } from './FileViewer';
import type { Annotation, AnnotationAttachment } from '../types';

const ACCEPTED = '.png,.jpg,.jpeg,.pdf,.doc,.docx';
const ACCEPTED_MIME = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_BYTES = 10 * 1024 * 1024;

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return '🖼';
  if (mime === 'application/pdf') return '📄';
  return '📝';
}

/** Generates and manages an object URL for a single attachment thumbnail. */
function useThumbUrl(attachment: AnnotationAttachment) {
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!attachment.mimeType.startsWith('image/')) return;
    // If the attachment has a legacy dataUrl (from import), use it directly
    if (attachment.dataUrl) { setThumbUrl(attachment.dataUrl); return; }
    // Otherwise pull from IndexedDB
    import('../lib/fileStore').then(({ getBlob }) =>
      getBlob(attachment.id).then((blob) => {
        if (blob) setThumbUrl(URL.createObjectURL(blob));
      }),
    );
    return () => { if (thumbUrl) URL.revokeObjectURL(thumbUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);
  return thumbUrl;
}

function Thumb({ attachment }: { attachment: AnnotationAttachment }) {
  const url = useThumbUrl(attachment);
  if (!url) return null;
  return <img className="ann-attach__thumb" src={url} alt={attachment.name} />;
}

export function AnnotationAttachments({ annotation }: { annotation: Annotation }) {
  const addAttachment = useStore((s) => s.addAnnotationAttachment);
  const removeAttachment = useStore((s) => s.removeAnnotationAttachment);

  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<AnnotationAttachment | null>(null);

  const attachments: AnnotationAttachment[] = annotation.attachments ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    setUploading(true);

    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`"${file.name}" not supported. Use PNG, JPG, PDF or Word.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" exceeds 10 MB.`);
        continue;
      }
      try {
        const id = uuid();
        // Save to IndexedDB instantly — no base64 encoding
        await saveFile(id, file);
        addAttachment(annotation.id, {
          id,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: Date.now(),
        });
      } catch {
        setError(`Could not save "${file.name}".`);
      }
    }
    setUploading(false);
  };

  return (
    <div className="ann-attach">
      <div className="ann-attach__label">
        Attachments
        {attachments.length > 0 && (
          <span className="ann-attach__count">{attachments.length}</span>
        )}
      </div>

      <div
        className={`ann-attach__drop ${dragging ? 'ann-attach__drop--over' : ''}`}
        onClick={() => fileInput.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        {uploading ? '⏳ Saving…' : '📎 Drop or click to attach'}
        <input ref={fileInput} type="file" accept={ACCEPTED} multiple hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {error && (
        <div className="ann-attach__error">
          {error}<button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="ann-attach__list">
          {attachments.map((a) => (
            <li key={a.id} className="ann-attach__item">
              <span className="ann-attach__icon">{fileIcon(a.mimeType)}</span>
              <div className="ann-attach__info">
                <button className="ann-attach__name-btn" onClick={() => setViewing(a)} title="View file">
                  {a.name}
                </button>
                <span className="ann-attach__size">{formatBytes(a.size)}</span>
              </div>

              {a.mimeType.startsWith('image/') && (
                <button className="ann-attach__thumb-btn" onClick={() => setViewing(a)}>
                  <Thumb attachment={a} />
                </button>
              )}

              <div className="ann-attach__btns">
                <button className="ann-attach__btn" onClick={() => setViewing(a)} title="View">👁</button>
                <button className="ann-attach__btn ann-attach__btn--remove"
                  onClick={() => removeAttachment(annotation.id, a.id)} title="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {viewing && (
        <FileViewer
          id={viewing.id}
          name={viewing.name}
          mimeType={viewing.mimeType}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
