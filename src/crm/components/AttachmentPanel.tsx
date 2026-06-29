import { useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { useCrmStore } from '../store/useCrmStore';
import { saveFile, getBlob } from '../../lib/fileStore';
import { FileViewer } from '../../components/FileViewer';
import type { Attachment, Report } from '../types';

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

function Thumb({ attachment }: { attachment: Attachment }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!attachment.mimeType.startsWith('image/')) return;
    if (attachment.dataUrl) { setUrl(attachment.dataUrl); return; }
    getBlob(attachment.id).then((blob) => {
      if (blob) setUrl(URL.createObjectURL(blob));
    });
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachment.id]);
  if (!url) return null;
  return <img className="attach__thumb" src={url} alt={attachment.name} />;
}

export function AttachmentPanel({ report }: { report: Report }) {
  const currentUser = useCrmStore((s) => s.currentUser);
  const addAttachment = useCrmStore((s) => s.addAttachment);
  const removeAttachment = useCrmStore((s) => s.removeAttachment);

  const fileInput = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [viewing, setViewing] = useState<Attachment | null>(null);

  const attachments: Attachment[] = report.attachments ?? [];

  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError(null);
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!ACCEPTED_MIME.includes(file.type)) {
        setError(`"${file.name}" is not supported. Use PNG, JPG, PDF or Word.`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" exceeds 10 MB.`);
        continue;
      }
      try {
        const id = uuid();
        await saveFile(id, file);
        addAttachment(report.id, {
          id,
          name: file.name,
          mimeType: file.type,
          size: file.size,
          uploadedAt: Date.now(),
          uploadedBy: currentUser,
        });
      } catch {
        setError(`Failed to save "${file.name}".`);
      }
    }
    setUploading(false);
  };

  return (
    <div className="attach">
      <div
        className={`attach__drop ${dragging ? 'attach__drop--over' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={(e) => { e.preventDefault(); dragDepth.current--; if (dragDepth.current <= 0) setDragging(false); }}
        onDrop={(e) => { e.preventDefault(); dragDepth.current = 0; setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInput.current?.click()}
      >
        <span className="attach__drop-icon">📎</span>
        <span>{uploading ? 'Saving…' : 'Drop files here or click to browse'}</span>
        <span className="attach__drop-hint">PNG · JPG · PDF · DOC · DOCX · max 10 MB</span>
        <input ref={fileInput} type="file" accept={ACCEPTED} multiple hidden
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {error && (
        <div className="attach__error">
          {error}<button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {attachments.length > 0 && (
        <ul className="attach__list">
          {attachments.map((a) => (
            <li key={a.id} className="attach__item">
              <span className="attach__icon">{fileIcon(a.mimeType)}</span>
              <div className="attach__meta">
                <button className="attach__name-btn" onClick={() => setViewing(a)}>{a.name}</button>
                <span className="attach__sub">
                  {formatBytes(a.size)} · {a.uploadedBy} · {new Date(a.uploadedAt).toLocaleString()}
                </span>
              </div>

              {a.mimeType.startsWith('image/') && (
                <button className="attach__thumb-btn" onClick={() => setViewing(a)}>
                  <Thumb attachment={a} />
                </button>
              )}

              <div className="attach__actions">
                <button className="btn attach__view" onClick={() => setViewing(a)} title="View">👁</button>
                <button className="btn attach__remove"
                  onClick={() => removeAttachment(report.id, a.id)} title="Remove">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {attachments.length === 0 && !error && (
        <p className="attach__empty">No attachments yet.</p>
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
