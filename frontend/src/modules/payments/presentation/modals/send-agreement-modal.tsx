"use client";

import { formatUsd } from "@/modules/payments/domain/types";

export interface SendAgreementMember {
  user_id: number;
  member_name: string;
  email?: string | null;
  pending_balance?: string | null;
}

interface SendAgreementModalProps {
  member: SendAgreementMember;
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function SendAgreementModal({
  member,
  isSubmitting = false,
  error = null,
  onClose,
  onConfirm,
}: SendAgreementModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog send-agreement-dialog">
        <h2>Enviar acuerdo de débito</h2>
        <p className="muted">
          Se enviará un correo con el enlace para descargar la autorización ADV y subir los
          documentos. El enlace vence en 30 días.
        </p>
        <dl className="send-agreement-facts">
          <div>
            <dt>Miembro</dt>
            <dd>{member.member_name}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{member.email?.trim() || "Sin correo"}</dd>
          </div>
          <div>
            <dt>Monto adeudado</dt>
            <dd>{formatUsd(member.pending_balance || "0")}</dd>
          </div>
        </dl>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="primary-button send-agreement-button"
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
            type="button"
          >
            {isSubmitting ? "Enviando..." : "Enviar acuerdo"}
          </button>
        </div>
      </div>
    </div>
  );
}
