"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { MemberDocument, MemberDocumentKey } from "@/modules/documents/domain/types";
import {
  listMemberDocuments,
  uploadMemberDocument,
} from "@/modules/documents/infrastructure/documents-api";
import { AdminDocumentCard } from "@/modules/documents/presentation/components/admin-document-card";
import { DocumentUiIcon } from "@/modules/documents/presentation/components/document-ui-icon";
import {
  DOCUMENT_PRACTICES,
  formatShortDocumentDate,
  latestDocumentUpdate,
  validatePdfFile,
} from "@/modules/documents/presentation/lib/admin-documents";
import { RoleGate } from "@/shared/components/role-gate";
import { useToast } from "@/shared/hooks/use-toast";

export function AdminDocumentsPage() {
  const toast = useToast();
  const token = useMemo(() => getStoredToken(), []);
  const [documents, setDocuments] = useState<MemberDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<MemberDocumentKey | null>(null);

  const publishedCount = documents.filter((item) => item.available).length;
  const pendingCount = documents.length - publishedCount;
  const lastUpdate = latestDocumentUpdate(documents);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      return;
    }
    setIsLoading(true);
    try {
      setDocuments(await listMemberDocuments(token));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron cargar los documentos.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function handleUpload(key: MemberDocumentKey, file: File) {
    if (!token) {
      return;
    }
    const invalid = validatePdfFile(file);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setUploadingKey(key);
    try {
      const updated = await uploadMemberDocument(token, key, file);
      setDocuments((current) => current.map((item) => (item.document_key === key ? updated : item)));
      toast.success(`${updated.title} actualizado correctamente.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir el PDF.");
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="admin-documents">
        <div className="admin-documents-hero">
          <div className="admin-documents-hero-main">
            <header className="admin-documents-heading">
              <h1>Documentos institucionales</h1>
              <p>Administra los 4 PDF oficiales de los socios desde el portal.</p>
            </header>

            <section className="admin-documents-kpis">
              <KpiCard
                icon="file"
                label="Publicados"
                value={isLoading ? "—" : String(publishedCount)}
              />
              <KpiCard
                icon="clock"
                label="Pendientes"
                value={isLoading ? "—" : String(pendingCount)}
              />
              <KpiCard
                icon="calendar"
                label="Última actualización"
                value={isLoading ? "—" : formatShortDocumentDate(lastUpdate)}
              />
              <KpiCard icon="download" label="Descargas totales en el portal" value="—" />
            </section>
          </div>

          <aside className="admin-documents-tips">
            <header>
              <span>
                <DocumentUiIcon name="info" />
              </span>
              <strong>Buenas prácticas</strong>
            </header>
            <ul>
              {DOCUMENT_PRACTICES.map((item) => (
                <li key={item}>
                  <DocumentUiIcon name="check" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>

        {isLoading ? (
          <section className="admin-documents-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <article className="admin-document-card is-skeleton" key={index} />
            ))}
          </section>
        ) : (
          <section className="admin-documents-grid">
            {documents.map((document) => (
              <AdminDocumentCard
                document={document}
                isUploading={uploadingKey === document.document_key}
                key={document.document_key}
                onUpload={handleUpload}
              />
            ))}
          </section>
        )}
      </section>
    </RoleGate>
  );
}

function KpiCard({
  icon,
  label,
  value,
}: {
  icon: "file" | "clock" | "calendar" | "download";
  label: string;
  value: string;
}) {
  return (
    <article className="admin-documents-kpi">
      <span className="admin-documents-kpi-icon">
        <DocumentUiIcon name={icon} />
      </span>
      <div>
        <strong>{value}</strong>
        <p>{label}</p>
      </div>
    </article>
  );
}
