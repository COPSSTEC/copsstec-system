"use client";

import { useEffect } from "react";

interface MemberDocumentViewerModalProps {
  title: string;
  blobUrl: string;
  contentType: string;
  onClose: () => void;
}

function isPdf(contentType: string, blobUrl: string): boolean {
  return contentType.includes("pdf") || blobUrl.toLowerCase().includes(".pdf");
}

function isImage(contentType: string): boolean {
  return contentType.startsWith("image/");
}

export function MemberDocumentViewerModal({
  title,
  blobUrl,
  contentType,
  onClose,
}: MemberDocumentViewerModalProps) {
  const pdf = isPdf(contentType, blobUrl);
  const image = isImage(contentType);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop document-viewer-backdrop">
      <div className="confirm-dialog document-viewer-dialog" aria-label={title} aria-modal="true" role="dialog">
        <h2>{title}</h2>
        <div className="document-viewer-body">
          {pdf ? (
            <iframe className="document-viewer-frame" src={blobUrl} title={title} />
          ) : image ? (
            <img alt={title} className="document-viewer-image" src={blobUrl} />
          ) : (
            <iframe className="document-viewer-frame" src={blobUrl} title={title} />
          )}
        </div>
        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
