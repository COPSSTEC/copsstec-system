"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { endClientSession } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus, type MembershipStatus } from "@/modules/membership/domain/types";
import {
  downloadAuthorizationPdf,
  downloadSolicitudPdf,
  getMembershipStatus,
  saveBankDetails,
  uploadOnboardingDocuments,
} from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

const MAX_PDF_BYTES = 8 * 1024 * 1024;
const ACCOUNT_TYPES = ["Corriente", "Ahorros"] as const;
const DEBIT_PLANS = [
  { id: "monthly", label: "Mensual: $10,00" },
  { id: "quarterly", label: "Trimestral: $30,00" },
  { id: "semiannual", label: "Semestral: $60,00" },
  { id: "annual", label: "Anual: $120,00" },
] as const;
const ECUADOR_BANKS = [
  "Banco Pichincha",
  "Banco Guayaquil",
  "Banco del Pacífico",
  "Produbanco",
  "Banco Internacional",
  "Banco Bolivariano",
  "Banco de Machala",
  "Banco General Rumiñahui",
  "Banco del Austro",
  "Banco Solidario",
  "Cooperativa JEP",
  "Cooperativa Policía Nacional",
] as const;

const STEPS = [
  { id: 1, label: "1. Cuenta" },
  { id: 2, label: "2. Descargar" },
  { id: 3, label: "3. Subir PDFs" },
  { id: 4, label: "4. Confirmar" },
] as const;

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function joinRequirements(items: string[]): string {
  if (items.length === 1) {
    return items[0];
  }
  if (items.length === 2) {
    return `${items[0]} y ${items[1]}`;
  }
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

function StepIcon({ name }: { name: "user" | "file" | "upload" | "check" }) {
  if (name === "user") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
        <path
          d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.2 0-8 2.1-8 5v1h16v-1c0-2.9-3.8-5-8-5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "file") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
        <path
          d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Zm0 2.5 3.5 3.5H14Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "upload") {
    return (
      <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
        <path
          d="M12 3 6.5 8.5h3.5V15h4V8.5h3.5Zm-7 14v2h14v-2Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18">
      <path d="M9.5 16.5 5 12l1.4-1.4 3.1 3.1 8.1-8.1L19 7.1Z" fill="currentColor" />
    </svg>
  );
}

function DocumentDropzone({
  label,
  hint,
  file,
  alreadyUploaded,
  onFile,
  onClear,
}: {
  label: string;
  hint: string;
  file: File | null;
  alreadyUploaded: boolean;
  onFile: (file: File | null) => void;
  onClear: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  function applyFile(next: File | null) {
    if (!next) {
      onFile(null);
      return;
    }
    onFile(next);
  }

  if (file || alreadyUploaded) {
    return (
      <div className="affiliation-docs-dropzone is-ready">
        <div className="affiliation-docs-file">
          <span className="affiliation-docs-file-icon" aria-hidden>
            <StepIcon name="file" />
          </span>
          <div className="affiliation-docs-file-meta">
            <strong>{file ? file.name : `${label} cargada`}</strong>
            <small>{file ? formatFileSize(file.size) : "Documento ya enviado"}</small>
          </div>
        </div>
        <div className="affiliation-docs-file-actions">
          <span className="affiliation-docs-file-check" aria-hidden>
            ✓
          </span>
          {file ? (
            <button
              aria-label={`Quitar ${label}`}
              className="affiliation-docs-clear"
              onClick={onClear}
              type="button"
            >
              ×
            </button>
          ) : (
            <label className="affiliation-docs-clear" title="Reemplazar archivo">
              ×
              <input
                accept="application/pdf"
                hidden
                onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
                type="file"
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <label
      className={`affiliation-docs-dropzone ${isDragging ? "is-dragging" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        applyFile(event.dataTransfer.files?.[0] ?? null);
      }}
    >
      <span className="affiliation-docs-drop-icon" aria-hidden>
        <StepIcon name="upload" />
      </span>
      <strong>{label}</strong>
      <p>{hint}</p>
      <small>Arrastra tu archivo aquí o haz clic para seleccionar</small>
      <input
        accept="application/pdf"
        hidden
        onChange={(event) => applyFile(event.target.files?.[0] ?? null)}
        type="file"
      />
    </label>
  );
}

export function AuthorizationDocumentsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [accountType, setAccountType] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [debitPlan, setDebitPlan] = useState("");
  const [signedAuthorization, setSignedAuthorization] = useState<File | null>(null);
  const [identityDocument, setIdentityDocument] = useState<File | null>(null);
  const [signedSolicitud, setSignedSolicitud] = useState<File | null>(null);
  const [acceptedYear, setAcceptedYear] = useState(false);
  const [downloadedAuth, setDownloadedAuth] = useState(false);
  const [downloadedSolicitud, setDownloadedSolicitud] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingAuth, setIsDownloadingAuth] = useState(false);
  const [isDownloadingSolicitud, setIsDownloadingSolicitud] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const sessionToken = getStoredToken();
    if (!sessionToken) {
      router.replace("/login");
      return;
    }
    const accessToken = sessionToken;
    setToken(accessToken);

    async function load() {
      try {
        const current = await getMembershipStatus(accessToken);
        if (membershipPathForStatus(current) !== "/afiliacion/documentos") {
          router.replace(membershipPathForStatus(current));
          return;
        }
        setStatus(current);
        setAccountType(current.member_account_type || "");
        setAccountNumber(current.member_account_number || "");
        setBankName(current.member_bank_name || "");
        setDebitPlan(current.member_debit_plan || "");
        setAcceptedYear(Boolean(current.accepted_affiliation_year));
      } catch {
        router.replace("/login");
      }
    }

    void load();
  }, [router]);

  function bankReady(): boolean {
    return (
      ACCOUNT_TYPES.includes(accountType as (typeof ACCOUNT_TYPES)[number]) &&
      accountNumber.trim().length >= 6 &&
      bankName.trim().length >= 3 &&
      DEBIT_PLANS.some((item) => item.id === debitPlan)
    );
  }

  async function persistBankDetails() {
    if (!token) {
      return;
    }
    if (!bankReady()) {
      throw new Error("Completa tipo de cuenta, número, entidad bancaria y el valor de débito antes de descargar.");
    }
    const next = await saveBankDetails(token, {
      account_type: accountType,
      account_number: accountNumber.trim(),
      bank_name: bankName.trim(),
      debit_plan: debitPlan,
    });
    setStatus((current) => (current ? { ...current, ...next } : next));
  }

  useEffect(() => {
    if (!token || !status || !bankReady()) {
      return;
    }
    const unchanged =
      status.member_account_type === accountType &&
      status.member_account_number === accountNumber.trim() &&
      status.member_bank_name === bankName.trim() &&
      status.member_debit_plan === debitPlan;
    if (unchanged) {
      return;
    }
    const timer = window.setTimeout(() => {
      void persistBankDetails().catch(() => undefined);
    }, 450);
    return () => window.clearTimeout(timer);
    // persistBankDetails is recreated each render; the compared fields are enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, accountNumber, bankName, debitPlan, status, token]);

  async function handleDownloadAuthorization() {
    if (!token) {
      return;
    }
    setIsDownloadingAuth(true);
    setError(null);
    try {
      await persistBankDetails();
      await downloadAuthorizationPdf(token);
      setDownloadedAuth(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la autorización.");
    } finally {
      setIsDownloadingAuth(false);
    }
  }

  async function handleDownloadSolicitud() {
    if (!token) {
      return;
    }
    setIsDownloadingSolicitud(true);
    setError(null);
    try {
      await downloadSolicitudPdf(token);
      setDownloadedSolicitud(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar la solicitud.");
    } finally {
      setIsDownloadingSolicitud(false);
    }
  }

  function assignPdf(setter: (file: File | null) => void, file: File | null, label: string) {
    if (!file) {
      setter(null);
      return;
    }
    const invalid = validatePdf(file, label);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setter(file);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !status || !canSubmit) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await uploadOnboardingDocuments(token, {
        signedAuthorization: signedAuthorization ?? undefined,
        identityDocument: identityDocument ?? undefined,
        signedSolicitud: signedSolicitud ?? undefined,
        acceptedAffiliationYear: acceptedYear,
      });
      if (result.gate === "pending_approval") {
        router.replace("/afiliacion/en-revision");
        return;
      }
      setStatus({
        ...status,
        has_signed_authorization: result.has_signed_authorization,
        has_identity_document: result.has_identity_document,
        has_signed_solicitud: result.has_signed_solicitud,
        accepted_affiliation_year: result.accepted_affiliation_year,
        must_upload_documents: result.gate === "documents",
        gate: result.gate === "documents" ? "documents" : status.gate,
      });
      setSignedAuthorization(null);
      setIdentityDocument(null);
      setSignedSolicitud(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar los documentos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasSigned = Boolean(status?.has_signed_authorization);
  const hasIdentity = Boolean(status?.has_identity_document);
  const hasSolicitud = Boolean(status?.has_signed_solicitud);
  const authorizationReady = hasSigned || Boolean(signedAuthorization);
  const identityReady = hasIdentity || Boolean(identityDocument);
  const solicitudReady = hasSolicitud || Boolean(signedSolicitud);
  const bankComplete = bankReady();
  const downloadsComplete = (downloadedAuth || hasSigned) && (downloadedSolicitud || hasSolicitud);
  const uploadsComplete = authorizationReady && identityReady && solicitudReady;
  const confirmComplete = acceptedYear;
  const canSubmit = bankComplete && uploadsComplete && confirmComplete;

  const completedSteps = useMemo(() => {
    const done = new Set<number>();
    if (bankComplete) {
      done.add(1);
    }
    if (downloadsComplete || uploadsComplete) {
      done.add(2);
    }
    if (uploadsComplete) {
      done.add(3);
    }
    if (confirmComplete) {
      done.add(4);
    }
    return done;
  }, [bankComplete, downloadsComplete, uploadsComplete, confirmComplete]);

  const currentStep = !bankComplete ? 1 : !downloadsComplete ? 2 : !uploadsComplete ? 3 : !confirmComplete ? 4 : 4;

  const missing = [
    !bankComplete ? "datos bancarios" : null,
    !authorizationReady ? "autorización firmada" : null,
    !identityReady ? "cédula" : null,
    !solicitudReady ? "solicitud firmada" : null,
    !confirmComplete ? "confirmación" : null,
  ].filter((item): item is string => Boolean(item));

  const bankOptions = useMemo(() => {
    if (bankName && !ECUADOR_BANKS.includes(bankName as (typeof ECUADOR_BANKS)[number])) {
      return [bankName, ...ECUADOR_BANKS];
    }
    return [...ECUADOR_BANKS];
  }, [bankName]);

  if (!status) {
    return <main className="affiliation-page">Cargando...</main>;
  }

  return (
    <main className="affiliation-page affiliation-documents-page">
      <div className="affiliation-top">
        <AppLogo />
        <button
          className="affiliation-docs-logout"
          onClick={() => {
            void endClientSession().then(() => router.replace("/login"));
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>

      <header className="affiliation-docs-hero">
        <h1>Documentos de afiliación</h1>
        <p>
          Completa los cuatro pasos, descarga los documentos, fírmalos y súbelos. Todos los requisitos
          son obligatorios para continuar con tu afiliación al COPSSTEC.
        </p>
      </header>

      <ol className="affiliation-docs-stepper">
        {STEPS.map((item, index) => {
          const isDone = completedSteps.has(item.id);
          const isCurrent = !isDone && item.id === currentStep;
          return (
            <li
              className={`${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
              key={item.id}
            >
              {index > 0 ? (
                <span className={`affiliation-docs-rail ${completedSteps.has(item.id - 1) ? "is-filled" : ""}`} />
              ) : null}
              <span>{isDone ? "✓" : item.id}</span>
              <small>{item.label}</small>
            </li>
          );
        })}
      </ol>

      <form className="affiliation-docs-form" onSubmit={handleSubmit}>
        <section className="affiliation-docs-section">
          <header>
            <span className="affiliation-docs-section-icon">
              <StepIcon name="user" />
            </span>
            <div>
              <h2>1. Datos de tu cuenta</h2>
              <p>Ingresa la información de la cuenta donde se realizarán los débitos.</p>
            </div>
          </header>
          <div className="affiliation-docs-bank-grid">
            <label className="field">
              Tipo de cuenta *
              <select onChange={(event) => setAccountType(event.target.value)} required value={accountType}>
                <option value="">Selecciona el tipo de cuenta</option>
                {ACCOUNT_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field affiliation-docs-account-field">
              Número de cuenta *
              <input
                onChange={(event) => setAccountNumber(event.target.value)}
                placeholder="Número de tu cuenta"
                required
                value={accountNumber}
              />
              {accountNumber.trim().length >= 6 ? (
                <span className="affiliation-docs-field-check" aria-hidden>
                  ✓
                </span>
              ) : null}
            </label>
            <label className="field">
              Entidad bancaria *
              <select onChange={(event) => setBankName(event.target.value)} required value={bankName}>
                <option value="">Selecciona el banco</option>
                {bankOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Valor de débito *
            <select onChange={(event) => setDebitPlan(event.target.value)} required value={debitPlan}>
              <option value="">Selecciona el valor a debitar</option>
              {DEBIT_PLANS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          {bankComplete ? (
            <p className="affiliation-docs-success">Datos bancarios y valor de débito completados correctamente.</p>
          ) : null}
        </section>

        <section className="affiliation-docs-section">
          <header>
            <span className="affiliation-docs-section-icon">
              <StepIcon name="file" />
            </span>
            <div>
              <h2>2. Descarga tus documentos</h2>
              <p>Descarga, revisa y firma los siguientes documentos.</p>
            </div>
          </header>
          <div className="affiliation-docs-download-grid">
            <article className="affiliation-docs-download-card">
              <div>
                <strong>Autorización de débito</strong>
                <p>Puede firmarse digitalmente o a mano.</p>
              </div>
              <button
                className="affiliation-docs-download"
                disabled={isDownloadingAuth || !bankComplete}
                onClick={() => void handleDownloadAuthorization()}
                type="button"
              >
                {isDownloadingAuth ? "Descargando..." : "Descargar"}
              </button>
            </article>
            <article className="affiliation-docs-download-card">
              <div>
                <strong>Solicitud de afiliación</strong>
                <p>Debe imprimirse, firmarse a mano y escanearse.</p>
              </div>
              <button
                className="affiliation-docs-download"
                disabled={isDownloadingSolicitud}
                onClick={() => void handleDownloadSolicitud()}
                type="button"
              >
                {isDownloadingSolicitud ? "Descargando..." : "Descargar"}
              </button>
            </article>
          </div>
        </section>

        <section className="affiliation-docs-section">
          <header>
            <span className="affiliation-docs-section-icon">
              <StepIcon name="upload" />
            </span>
            <div>
              <h2>3. Sube tus documentos</h2>
              <p>Carga los documentos firmados en formato PDF. Tamaño máximo: 8 MB por archivo.</p>
            </div>
          </header>
          <div className="affiliation-docs-upload-grid">
            <div>
              <p className="affiliation-docs-upload-label">Autorización firmada (PDF)</p>
              <DocumentDropzone
                alreadyUploaded={hasSigned}
                file={signedAuthorization}
                hint="Firma digital o a mano"
                label="Autorización firmada"
                onClear={() => setSignedAuthorization(null)}
                onFile={(file) => assignPdf(setSignedAuthorization, file, "La autorización firmada")}
              />
            </div>
            <div>
              <p className="affiliation-docs-upload-label">Cédula (PDF)</p>
              <DocumentDropzone
                alreadyUploaded={hasIdentity}
                file={identityDocument}
                hint="PDF de ambos lados"
                label="Cédula"
                onClear={() => setIdentityDocument(null)}
                onFile={(file) => assignPdf(setIdentityDocument, file, "La cédula")}
              />
            </div>
            <div>
              <p className="affiliation-docs-upload-label">Solicitud firmada (PDF)</p>
              <DocumentDropzone
                alreadyUploaded={hasSolicitud}
                file={signedSolicitud}
                hint="Solo firma a mano alzada"
                label="Solicitud firmada"
                onClear={() => setSignedSolicitud(null)}
                onFile={(file) => assignPdf(setSignedSolicitud, file, "La solicitud firmada")}
              />
            </div>
          </div>
        </section>

        <section className="affiliation-docs-section">
          <header>
            <span className="affiliation-docs-section-icon">
              <StepIcon name="check" />
            </span>
            <div>
              <h2>4. Confirmación</h2>
              <label className="check-row affiliation-docs-confirm">
                <input
                  checked={acceptedYear}
                  onChange={(event) => setAcceptedYear(event.target.checked)}
                  type="checkbox"
                />
                Acepto permanecer afiliado 1 año al Colegio de Profesionales de Seguridad y Salud en
                el Trabajo del Ecuador (COPSSTEC).
              </label>
            </div>
          </header>
        </section>

        {error ? <p className="form-error affiliation-docs-submit-error">{error}</p> : null}
        <div className="affiliation-docs-footer">
          {missing.length > 0 ? (
            <div className="affiliation-docs-alert" role="status">
              <strong>
                Te faltan {missing.length} {missing.length === 1 ? "requisito" : "requisitos"} para
                continuar.
              </strong>
              <p>Debes completar {joinRequirements(missing)} para enviar tus documentos.</p>
            </div>
          ) : (
            <div />
          )}
          <button className="affiliation-docs-submit" disabled={!canSubmit || isSubmitting} type="submit">
            {isSubmitting ? "Enviando..." : "Enviar documentos"}
          </button>
        </div>
      </form>
      <PublicFooter />
    </main>
  );
}
