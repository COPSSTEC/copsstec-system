"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  documentDownloadName,
  documentFileSrc,
  type MemberDocument,
  type MemberDocumentKey,
} from "@/modules/documents/domain/types";
import {
  listMemberDocuments,
  uploadMemberDocument,
} from "@/modules/documents/infrastructure/documents-api";
import { RoleGate } from "@/shared/components/role-gate";

function formatUpdatedAt(value: string | null | undefined): string {
  if (!value) {
    return "Sin archivo";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminDocumentsPage() {
  const token = useMemo(() => getStoredToken(), []);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<MemberDocumentKey | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      setDocuments(await listMemberDocuments(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los documentos.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(key: MemberDocumentKey, file: File | null) {
    if (!token || !file) {
      return;
    }
    setUploadingKey(key);
    setError(null);
    setNotice(null);
    try {
      const updated = await uploadMemberDocument(token, key, file);
      setDocuments((current) => current.map((item) => (item.document_key === key ? updated : item)));
      setNotice(`${updated.title} actualizado correctamente.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el PDF.");
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading">
        <h1>Documentos institucionales</h1>
        <p>Sube o reemplaza los cuatro PDF oficiales que los socios descargan desde su dashboard.</p>
      </section>

      {notice ? <p className="action-alert action-alert-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading ? <p className="muted">Cargando documentos...</p> : null}

      <section className="member-documents-grid">
        {documents.map((document) => {
          const href = documentFileSrc(document.file_path);
          return (
            <article className="member-document-card" key={document.document_key}>
              <p className="eyebrow">{document.document_key}</p>
              <h2>{document.title}</h2>
              <p className="muted">
                {document.available
                  ? `${documentDownloadName(document)} · ${formatUpdatedAt(document.updated_at)}`
                  : "Pendiente de publicación"}
              </p>
              <label className="photo-dropzone member-document-dropzone">
                <input
                  accept="application/pdf"
                  hidden
                  onChange={(event) => {
                    void handleUpload(document.document_key, event.target.files?.[0] ?? null);
                    event.currentTarget.value = "";
                  }}
                  type="file"
                />
                <span>
                  {uploadingKey === document.document_key
                    ? "Subiendo..."
                    : document.available
                      ? "Reemplazar PDF"
                      : "Subir PDF"}
                </span>
              </label>
              {href ? (
                <a className="secondary-button button-link" href={href} rel="noreferrer" target="_blank">
                  Ver archivo actual
                </a>
              ) : null}
            </article>
          );
        })}
      </section>
    </RoleGate>
  );
}
