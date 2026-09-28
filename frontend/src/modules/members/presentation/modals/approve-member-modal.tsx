"use client";

import { useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { fetchMemberDocumentBlob, type MemberPreviewKind } from "@/modules/members/infrastructure/members-api";
import { OnboardingDocumentRow } from "@/modules/members/presentation/components/onboarding-document-row";
import { MemberDocumentViewerModal } from "@/modules/members/presentation/modals/member-document-viewer-modal";
import type { ApprovalPreview } from "@/modules/membership/domain/types";
import { approveMember, getApprovalPreview } from "@/modules/membership/infrastructure/membership-api";

interface ApproveMemberModalProps {
  memberId: number;
  memberName: string;
  onClose: () => void;
  onApproved: (message: string) => void;
}

interface ViewerState {
  title: string;
  blobUrl: string;
  contentType: string;
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
  const [viewer, setViewer] = useState<ViewerState | null>(null);

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

  useEffect(() => {
    return () => {
      if (viewer) {
        window.URL.revokeObjectURL(viewer.blobUrl);
      }
    };
  }, [viewer]);

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

  const stage = preview?.onboarding_stage ?? "legacy_no_payment";
  const awaitingVoucher = stage === "awaiting_voucher";
  const showDocuments = stage === "awaiting_documents" || stage === "ready_to_approve";
  const canApprove = stage === "legacy_no_payment" || stage === "ready_to_approve";

  async function openDocument(kind: MemberPreviewKind, title: string) {
    if (!token) {
      return;
    }
    setError(null);
    try {
      const { blob, contentType } = await fetchMemberDocumentBlob(token, memberId, kind);
      if (viewer) {
        window.URL.revokeObjectURL(viewer.blobUrl);
      }
      setViewer({
        title,
        blobUrl: window.URL.createObjectURL(blob),
        contentType,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir el documento.");
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
            {awaitingVoucher ? (
              <div className="approve-voucher-alert">
                <p>
                  Aún no ha subido el comprobante de pago. Mientras no complete el pago, no puede
                  subir la autorización, la cédula ni la solicitud.
                </p>
                <div className="approve-documents">
                  <OnboardingDocumentRow label="Autorización" locked uploaded={false} />
                  <OnboardingDocumentRow label="Cédula" locked uploaded={false} />
                  <OnboardingDocumentRow label="Solicitud" locked uploaded={false} />
                </div>
              </div>
            ) : null}
            {showDocuments ? (
              <div className="approve-documents">
                <OnboardingDocumentRow
                  label="Comprobante"
                  onPreview={() => void openDocument("voucher", "Comprobante de pago")}
                  uploaded={preview.has_voucher}
                />
                <OnboardingDocumentRow
                  label="Autorización"
                  onPreview={() => void openDocument("authorization", "Autorización firmada")}
                  uploaded={preview.has_signed_authorization}
                />
                <OnboardingDocumentRow
                  label="Cédula"
                  onPreview={() => void openDocument("identity", "Cédula")}
                  uploaded={preview.has_identity_document}
                />
                <OnboardingDocumentRow
                  label="Solicitud"
                  onPreview={() => void openDocument("solicitud", "Solicitud firmada")}
                  uploaded={preview.has_signed_solicitud}
                />
              </div>
            ) : null}
            {stage === "legacy_no_payment" ? (
              <p className="muted">
                Este miembro no tiene pago de afiliación en el sistema nuevo. Puedes aprobarlo y crear su
                correo corporativo.
              </p>
            ) : null}
            {showDocuments && stage !== "ready_to_approve" ? (
              <p className="form-error">
                Faltan documentos. No se puede aprobar sin comprobante, autorización firmada, cédula y
                solicitud.
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
            disabled={isSubmitting || !preview || !canApprove}
            onClick={() => void handleApprove()}
            type="button"
          >
            {isSubmitting ? "Aprobando..." : "Aprobar"}
          </button>
        </div>
      </div>
      {viewer ? (
        <MemberDocumentViewerModal
          blobUrl={viewer.blobUrl}
          contentType={viewer.contentType}
          onClose={() => {
            window.URL.revokeObjectURL(viewer.blobUrl);
            setViewer(null);
          }}
          title={viewer.title}
        />
      ) : null}
    </div>
  );
}
