"use client";

import { useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { ApprovalPreview } from "@/modules/membership/domain/types";
import {
  approveMember,
  downloadOnboardingDocument,
  getApprovalPreview,
} from "@/modules/membership/infrastructure/membership-api";

interface ApproveMemberModalProps {
  memberId: number;
  memberName: string;
  onClose: () => void;
  onApproved: (message: string) => void;
}

export function ApproveMemberModal({
  memberId,
  memberName,
  onClose,
  onApproved,
}: ApproveMemberModalProps) {
  const token = getStoredToken();
  const [preview, setPreview] = useState<ApprovalPreview | null>(null);
  const [emailCorp, setEmailCorp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }

    async function load() {
      try {
        if (!token) {
          setError("Sesión requerida.");
          return;
        }
        const data = await getApprovalPreview(token, memberId);
        setPreview(data);
        setEmailCorp(data.suggested_corporate_email);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar la aprobación.");
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [memberId, token]);

  async function handleApprove() {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const result = await approveMember(token, memberId, emailCorp.trim());
      onApproved(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo aprobar al miembro.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasVoucher = Boolean(preview?.voucher_url);
  const hasSignedAuthorization = Boolean(preview?.signed_authorization_url);
  const hasIdentityDocument = Boolean(preview?.identity_document_url);
  const missingDocuments = Boolean(preview) && (!hasVoucher || !hasSignedAuthorization || !hasIdentityDocument);

  async function handleDownload(kind: "authorization" | "identity" | "voucher") {
    if (!token) {
      return;
    }
    setError(null);
    try {
      await downloadOnboardingDocument(token, memberId, kind);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el documento.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog approve-dialog">
        <h2>Aprobar afiliación</h2>
        <p className="muted">Se habilitará a {memberName} y se creará su correo corporativo.</p>
        {isLoading ? <p className="muted">Cargando datos...</p> : null}
        {preview ? (
          <div className="approve-grid">
            <p>
              <strong>{preview.names} {preview.lastname}</strong>
              <span className="table-subtitle">Cédula {preview.identifier}</span>
            </p>
            <label className="field">
              Correo personal
              <input disabled value={preview.personal_email} />
            </label>
            <label className="field">
              Correo corporativo
              <input
                onChange={(event) => setEmailCorp(event.target.value)}
                type="email"
                value={emailCorp}
              />
            </label>
            <div className="approve-documents">
              {hasVoucher ? (
                <button className="secondary-button" onClick={() => void handleDownload("voucher")} type="button">
                  Descargar comprobante
                </button>
              ) : (
                <p className="muted">No hay comprobante de pago.</p>
              )}
              {hasSignedAuthorization ? (
                <button className="secondary-button" onClick={() => void handleDownload("authorization")} type="button">
                  Descargar autorización firmada
                </button>
              ) : (
                <p className="muted">No hay autorización firmada.</p>
              )}
              {hasIdentityDocument ? (
                <button className="secondary-button" onClick={() => void handleDownload("identity")} type="button">
                  Descargar cédula
                </button>
              ) : (
                <p className="muted">No hay copia de cédula.</p>
              )}
            </div>
            {missingDocuments ? (
              <p className="form-error">
                Faltan documentos. No se puede aprobar sin comprobante, autorización firmada y cédula.
              </p>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button"
            disabled={isSubmitting || !preview || missingDocuments}
            onClick={() => void handleApprove()}
            type="button"
          >
            {isSubmitting ? "Aprobando..." : "Aprobar"}
          </button>
        </div>
      </div>
    </div>
  );
}
