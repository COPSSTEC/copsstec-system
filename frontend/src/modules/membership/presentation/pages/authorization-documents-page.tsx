"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearStoredToken, getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus, type MembershipStatus } from "@/modules/membership/domain/types";
import {
  downloadAuthorizationPdf,
  getMembershipStatus,
  uploadOnboardingDocuments,
} from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

const MAX_PDF_BYTES = 8 * 1024 * 1024;

function isPdfFile(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function validatePdf(file: File, label: string): string | null {
  if (!isPdfFile(file)) {
    return `${label} debe ser un archivo PDF.`;
  }
  if (file.size > MAX_PDF_BYTES) {
    return `${label} no puede superar 8 MB.`;
  }
  return null;
}

export function AuthorizationDocumentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [signedAuthorization, setSignedAuthorization] = useState<File | null>(null);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    const sessionToken = token;

    async function load() {
      try {
        const current = await getMembershipStatus(sessionToken);
        if (membershipPathForStatus(current) !== "/afiliacion/documentos") {
          router.replace(membershipPathForStatus(current));
          return;
        }
        setStatus(current);
      } catch {
        router.replace("/login");
      }
    }

    void load();
  }, [router, token]);

  async function handleDownload() {
    if (!token) {
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      await downloadAuthorizationPdf(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la autorización.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !status) {
      return;
    }

    const hasSigned = Boolean(status.has_signed_authorization);
    const hasIdentity = Boolean(status.has_identity_document);

    if (!hasSigned && !hasIdentity && (!signedAuthorization || !identityDocument)) {
      setError("Debes adjuntar ambos PDFs: la autorización firmada y la cédula.");
      return;
    }
    if (!hasSigned && !signedAuthorization) {
      setError("Debes adjuntar el PDF de la autorización firmada.");
      return;
    }
    if (!hasIdentity && !identityDocument) {
      setError("Debes adjuntar el PDF de tu cédula.");
      return;
    }

    if (signedAuthorization) {
      const signedError = validatePdf(signedAuthorization, "La autorización firmada");
      if (signedError) {
        setError(signedError);
        return;
      }
    }
    if (identityDocument) {
      const identityError = validatePdf(identityDocument, "La cédula");
      if (identityError) {
        setError(identityError);
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await uploadOnboardingDocuments(token, {
        signedAuthorization: signedAuthorization ?? undefined,
        identityDocument: identityDocument ?? undefined,
      });
      if (result.gate === "pending_approval" || (result.has_signed_authorization && result.has_identity_document)) {
        router.replace("/afiliacion/en-revision");
        return;
      }
      setStatus({
        ...status,
        has_signed_authorization: result.has_signed_authorization,
        has_identity_document: result.has_identity_document,
        must_upload_documents: result.gate === "documents",
        gate: result.gate === "documents" ? "documents" : status.gate,
      });
      setSignedAuthorization(null);
      setIdentityDocument(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar los documentos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!status) {
    return <main className="affiliation-page">Cargando...</main>;
  }

  const hasSigned = Boolean(status.has_signed_authorization);
  const hasIdentity = Boolean(status.has_identity_document);

  return (
    <main className="affiliation-page">
      <div className="affiliation-top">
        <AppLogo />
        <button
          className="secondary-button"
          onClick={() => {
            clearStoredToken();
            router.replace("/login");
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>

      <section className="affiliation-card affiliation-documents-card">
        <h1>Autorización de débito y cédula</h1>
        <p className="muted">
          Para completar tu afiliación debes firmar la autorización de débito y adjuntar una copia de tu
          cédula. Ambos archivos deben ser PDF.
        </p>

        <ol className="affiliation-documents-steps">
          <li>Descarga la autorización de débito prellenada con tus datos de registro.</li>
          <li>Fírmala de forma digital o imprímela, fírmala a mano y escaneala a PDF.</li>
          <li>Sube el PDF firmado y un PDF de tu cédula. Luego envía los documentos.</li>
        </ol>

        <div className="affiliation-documents-actions">
          <button className="secondary-button" disabled={isDownloading} onClick={() => void handleDownload()} type="button">
            {isDownloading ? "Descargando..." : "Descargar autorización"}
          </button>
        </div>

        <ul className="affiliation-documents-status">
          <li className={hasSigned ? "is-ready" : ""}>
            <strong>Autorización firmada</strong>
            <span>{hasSigned ? "Ya está cargada. Puedes reemplazarla si lo necesitas." : "Pendiente"}</span>
          </li>
          <li className={hasIdentity ? "is-ready" : ""}>
            <strong>Cédula</strong>
            <span>{hasIdentity ? "Ya está cargada. Puedes reemplazarla si lo necesitas." : "Pendiente"}</span>
          </li>
        </ul>

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            Autorización firmada (PDF)
            <input
              accept="application/pdf"
              onChange={(event) => setSignedAuthorization(event.target.files?.[0] ?? null)}
              type="file"
            />
            {signedAuthorization ? <small>{signedAuthorization.name}</small> : null}
          </label>
          <label className="field">
            Cédula (PDF)
            <input
              accept="application/pdf"
              onChange={(event) => setIdentityDocument(event.target.files?.[0] ?? null)}
              type="file"
            />
            {identityDocument ? <small>{identityDocument.name}</small> : null}
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="create-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Enviar documentos"}
          </button>
        </form>
        <p className="muted">
          Cuando ambos PDFs estén cargados, tu solicitud quedará en revisión administrativa.{" "}
          <Link href="/">Volver al inicio</Link>
        </p>
      </section>
      <PublicFooter />
    </main>
  );
}
