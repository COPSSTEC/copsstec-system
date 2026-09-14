"use client";

import { useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { ApprovalPreview } from "@/modules/membership/domain/types";
import { approveMember, getApprovalPreview, mediaUrl } from "@/modules/membership/infrastructure/membership-api";

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

  const voucher = mediaUrl(preview?.voucher_url ?? null);

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
            {voucher ? (
              <a href={voucher} rel="noreferrer" target="_blank">
                Ver comprobante de pago
              </a>
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
            disabled={isSubmitting || !preview}
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
