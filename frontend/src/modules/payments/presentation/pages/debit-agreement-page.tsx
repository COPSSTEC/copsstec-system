"use client";

import { FormEvent, useEffect, useState } from "react";

import { formatUsd, type PublicDebitAgreement } from "@/modules/payments/domain/types";
import {
  downloadPublicAgreementPdf,
  getPublicAgreement,
  uploadPublicAgreementDocuments,
} from "@/modules/payments/infrastructure/payments-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const INVALID_LINK = "Este enlace no es válido o ya expiró";

interface DebitAgreementPageProps {
  token: string;
}

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

export function DebitAgreementPage({ token }: DebitAgreementPageProps) {
  const [agreement, setAgreement] = useState<PublicDebitAgreement | null>(null);
  const [signedAuthorization, setSignedAuthorization] = useState<File | null>(null);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setError(null);
      try {
        setAgreement(await getPublicAgreement(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : INVALID_LINK);
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [token]);

  async function handleDownload() {
    setIsDownloading(true);
    setError(null);
    try {
      await downloadPublicAgreementPdf(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la autorización.");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!agreement) {
      return;
    }

    const hasSigned = Boolean(agreement.has_signed_authorization);
    const hasIdentity = Boolean(agreement.has_identity_document);

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
      const result = await uploadPublicAgreementDocuments(token, {
        signedAuthorization: signedAuthorization ?? undefined,
        identityDocument: identityDocument ?? undefined,
      });
      setAgreement({
        ...agreement,
        has_signed_authorization: result.has_signed_authorization,
        has_identity_document: result.has_identity_document,
        status: result.status,
      });
      setSignedAuthorization(null);
      setIdentityDocument(null);
      if (result.has_signed_authorization && result.has_identity_document) {
        setSuccessMessage(
          result.message || "Documentos recibidos. El administrador los revisará.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar los documentos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <main className="affiliation-page">
        <div className="affiliation-top">
          <AppLogo />
        </div>
        <p className="muted">Cargando...</p>
        <PublicFooter />
      </main>
    );
  }

  if (!agreement) {
    return (
      <main className="affiliation-page">
        <div className="affiliation-top">
          <AppLogo />
        </div>
        <section className="affiliation-card">
          <h1>Acuerdo de débito</h1>
          <p className="form-error">{error || INVALID_LINK}</p>
        </section>
        <PublicFooter />
      </main>
    );
  }

  const hasSigned = Boolean(agreement.has_signed_authorization);
  const hasIdentity = Boolean(agreement.has_identity_document);
  const isComplete = Boolean(successMessage && hasSigned && hasIdentity);

  return (
    <main className="affiliation-page">
      <div className="affiliation-top">
        <AppLogo />
      </div>

      <section className="affiliation-card affiliation-documents-card">
        <h1>Autorización de débito</h1>
        {isComplete ? (
          <>
            <div className="action-alert action-alert-success debit-agreement-success">
              <strong>Documentos enviados</strong>
              <span>{successMessage}</span>
            </div>
            <p>
              {agreement.member_name} · Cédula {agreement.identifier}
            </p>
            <p className="muted">No es necesario volver a enviar los archivos.</p>
          </>
        ) : (
          <>
            <p className="muted">
              Descarga la autorización ADV prellenada, fírmala y sube el PDF junto con tu cédula.
              Ambos archivos deben ser PDF.
            </p>

            <div className="affiliation-amount-banner">
              <div className="affiliation-amount-banner-copy">
                <span>Saldo pendiente</span>
                <strong>{agreement.member_name}</strong>
                <small>Cédula {agreement.identifier}</small>
              </div>
              <div className="affiliation-amount-banner-value">
                <b>{formatUsd(agreement.pending_balance)}</b>
              </div>
            </div>

            <ol className="affiliation-documents-steps">
              <li>Descarga la autorización de débito prellenada con tus datos.</li>
              <li>Fírmala de forma digital o imprímela, fírmala a mano y escaneala a PDF.</li>
              <li>Sube el PDF firmado y un PDF de tu cédula. Luego envía los documentos.</li>
            </ol>

            <div className="affiliation-documents-actions">
              <button
                className="secondary-button"
                disabled={isDownloading}
                onClick={() => void handleDownload()}
                type="button"
              >
                {isDownloading ? "Descargando..." : "Descargar autorización"}
              </button>
            </div>

            <ul className="affiliation-documents-status">
              <li className={hasSigned ? "is-ready" : ""}>
                <strong>Autorización firmada</strong>
                <span>
                  {hasSigned
                    ? "Ya está cargada. Puedes reemplazarla si lo necesitas."
                    : "Pendiente"}
                </span>
              </li>
              <li className={hasIdentity ? "is-ready" : ""}>
                <strong>Cédula</strong>
                <span>
                  {hasIdentity ? "Ya está cargada. Puedes reemplazarla si lo necesitas." : "Pendiente"}
                </span>
              </li>
            </ul>

            <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
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
          </>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
