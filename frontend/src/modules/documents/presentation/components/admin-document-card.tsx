"use client";

import { useRef, useState, type DragEvent } from "react";

import {
  documentDownloadName,
  documentFileSrc,
  type MemberDocument,
  type MemberDocumentKey,
} from "@/modules/documents/domain/types";
import { DocumentUiIcon } from "@/modules/documents/presentation/components/document-ui-icon";
import {
  documentKeyLabel,
  formatDocumentDate,
  formatFileSize,
  MAX_COVER_LABEL,
  MAX_PDF_LABEL,
} from "@/modules/documents/presentation/lib/admin-documents";

interface AdminDocumentCardProps {
  document: MemberDocument;
  isUploading: boolean;
  isUploadingCover: boolean;
  onUpload: (key: MemberDocumentKey, file: File) => void;
  onUploadCover: (key: MemberDocumentKey, file: File) => void;
}

export function AdminDocumentCard({
  document,
  isUploading,
  isUploadingCover,
  onUpload,
  onUploadCover,
}: AdminDocumentCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const href = documentFileSrc(document.file_path);
  const coverSrc = documentFileSrc(document.cover_path);
  const published = Boolean(document.available && href);

  function pickFile() {
    inputRef.current?.click();
  }

  function pickCover() {
    coverInputRef.current?.click();
  }

  function submitFile(file: File | null | undefined) {
    if (!file) {
      return;
    }
    onUpload(document.document_key, file);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    submitFile(event.dataTransfer.files[0]);
  }

  return (
    <article className={`admin-document-card ${published ? "is-published" : "is-pending"}`}>
      <header className="admin-document-card-head">
        <p>{documentKeyLabel(document.document_key)}</p>
        <span className={`admin-document-status ${published ? "is-published" : "is-pending"}`}>
          <i />
          {published ? "Publicado" : "Pendiente de publicación"}
        </span>
      </header>

      <h2>{document.title}</h2>

      <input
        accept="application/pdf"
        hidden
        onChange={(event) => {
          submitFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <input
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onUploadCover(document.document_key, file);
          }
          event.currentTarget.value = "";
        }}
        ref={coverInputRef}
        type="file"
      />

      <div className="admin-document-cover">
        {coverSrc ? (
          <img alt={`Portada de ${document.title}`} src={coverSrc} />
        ) : (
          <span className="admin-document-cover-empty">
            <DocumentUiIcon name="image" />
          </span>
        )}
        <div>
          <strong>{coverSrc ? "Portada del modal" : "Sin portada"}</strong>
          <p>JPG, PNG o WEBP • Máx. {MAX_COVER_LABEL}</p>
          <button
            className="admin-document-cover-btn"
            disabled={isUploadingCover}
            onClick={pickCover}
            type="button"
          >
            {isUploadingCover ? "Subiendo..." : coverSrc ? "Cambiar portada" : "Subir portada"}
          </button>
        </div>
      </div>

      {published ? (
        <>
          <div className="admin-document-file">
            <span className="admin-document-file-icon">
              <DocumentUiIcon name="pdf" />
            </span>
            <div>
              <strong>{documentDownloadName(document)}</strong>
              <p>
                {formatFileSize(document.file_size)} · {formatDocumentDate(document.updated_at)}
              </p>
            </div>
          </div>
          <div className="admin-document-actions">
            <a className="admin-document-view" href={href ?? undefined} rel="noreferrer" target="_blank">
              Ver archivo actual
            </a>
            <button
              className="admin-document-replace"
              disabled={isUploading}
              onClick={pickFile}
              type="button"
            >
              <DocumentUiIcon name="refresh" />
              {isUploading ? "Subiendo..." : "Reemplazar PDF"}
            </button>
          </div>
        </>
      ) : (
        <button
          className={`admin-document-dropzone ${isDragging ? "is-dragging" : ""}`}
          disabled={isUploading}
          onClick={pickFile}
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setIsDragging(false);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          type="button"
        >
          <span className="admin-document-dropzone-icon">
            <DocumentUiIcon name="upload" />
          </span>
          <strong>{isUploading ? "Subiendo..." : "Subir PDF"}</strong>
          <p>Arrastra el archivo o haz clic para seleccionar</p>
          <span>Solo archivos PDF • Máx. {MAX_PDF_LABEL}</span>
        </button>
      )}
    </article>
  );
}
