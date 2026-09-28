"use client";

interface OnboardingDocumentRowProps {
  label: string;
  uploaded: boolean;
  locked?: boolean;
  onPreview?: () => void;
}

export function OnboardingDocumentRow({
  label,
  uploaded,
  locked = false,
  onPreview,
}: OnboardingDocumentRowProps) {
  const chipClass = uploaded ? "status-badge-success" : "status-badge-muted";
  const chipLabel = uploaded ? "Subida" : locked ? "Bloqueada" : "Pendiente";

  return (
    <div className="onboarding-document-row">
      <div>
        <strong>{label}</strong>
        <span className={`status-badge ${chipClass}`}>{chipLabel}</span>
      </div>
      {uploaded && onPreview ? (
        <button className="secondary-button" onClick={onPreview} type="button">
          Ver {label.toLowerCase()}
        </button>
      ) : (
        <p className="muted">
          {locked
            ? "No se puede subir hasta que exista el comprobante de pago."
            : "Aún no se ha subido."}
        </p>
      )}
    </div>
  );
}
