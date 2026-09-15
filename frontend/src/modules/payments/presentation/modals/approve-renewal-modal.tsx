"use client";

import { FormEvent, useState } from "react";

import { formatUsd, type Payment } from "@/modules/payments/domain/types";
import { paymentVoucherUrl } from "@/modules/payments/infrastructure/payments-api";

interface ApproveRenewalModalProps {
  payment: Payment | {
    id: number;
    member_name?: string;
    amount: string;
    date_register: string;
    voucher_url: string | null;
    status: string;
  };
  isSubmitting?: boolean;
  error?: string | null;
  onClose: () => void;
  onApprove: (paymentId: number) => Promise<void>;
  onReject: (paymentId: number, observation: string) => Promise<void>;
}

export function ApproveRenewalModal({
  payment,
  isSubmitting = false,
  error = null,
  onClose,
  onApprove,
  onReject,
}: ApproveRenewalModalProps) {
  const [observation, setObservation] = useState("");
  const [mode, setMode] = useState<"review" | "reject">("review");
  const [localError, setLocalError] = useState<string | null>(null);
  const voucher = paymentVoucherUrl(payment.voucher_url);

  async function handleApprove() {
    setLocalError(null);
    try {
      await onApprove(payment.id);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo aprobar el pago.");
    }
  }

  async function handleReject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = observation.trim();
    if (!text) {
      setLocalError("La observación es obligatoria para rechazar.");
      return;
    }
    setLocalError(null);
    try {
      await onReject(payment.id, text);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo rechazar el pago.");
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog approve-dialog">
        <h2>Revisar voucher</h2>
        <p className="muted">
          {payment.member_name ? `${payment.member_name} · ` : ""}
          {formatUsd(payment.amount)} · {payment.date_register}
        </p>
        {voucher ? (
          <a className="voucher-preview-link" href={voucher} rel="noreferrer" target="_blank">
            <img alt="Comprobante de renovación" className="voucher-preview" src={voucher} />
            Ver comprobante en tamaño completo
          </a>
        ) : (
          <p className="muted">Este pago no tiene comprobante adjunto.</p>
        )}
        {localError || error ? <p className="form-error">{localError ?? error}</p> : null}

        {mode === "reject" ? (
          <form className="form-stack" onSubmit={(event) => void handleReject(event)}>
            <label className="field">
              Observación
              <textarea
                maxLength={500}
                onChange={(event) => setObservation(event.target.value)}
                required
                rows={3}
                value={observation}
              />
            </label>
            <div className="table-actions">
              <button className="secondary-button" onClick={() => setMode("review")} type="button">
                Volver
              </button>
              <button className="danger-button" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Rechazando..." : "Rechazar"}
              </button>
            </div>
          </form>
        ) : (
          <div className="table-actions">
            <button className="secondary-button" onClick={onClose} type="button">
              Cerrar
            </button>
            <button className="danger-button" onClick={() => setMode("reject")} type="button">
              Rechazar
            </button>
            <button
              className="primary-button"
              disabled={isSubmitting}
              onClick={() => void handleApprove()}
              type="button"
            >
              {isSubmitting ? "Aprobando..." : "Aprobar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
