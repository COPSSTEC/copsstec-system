"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  MONTHLY_FEE,
  YEARLY_FEE,
  formatUsd,
  type OpenPayment,
  type RenewalPaymentInfo,
  type RenewalPlan,
} from "@/modules/payments/domain/types";

interface RenewalVoucherFormProps {
  openPayment: OpenPayment | null;
  paymentInfo: RenewalPaymentInfo | null;
  isSubmitting?: boolean;
  error?: string | null;
  onChoosePlan: (plan: RenewalPlan) => Promise<unknown>;
  onUpload: (file: File, plan: RenewalPlan) => Promise<void>;
}

function planFromPayment(payment: OpenPayment | null): RenewalPlan {
  if (payment?.plan === "yearly" || payment?.amount === YEARLY_FEE) {
    return "yearly";
  }
  return "monthly";
}

export function RenewalVoucherForm({
  openPayment,
  paymentInfo,
  isSubmitting = false,
  error = null,
  onChoosePlan,
  onUpload,
}: RenewalVoucherFormProps) {
  const [plan, setPlan] = useState<RenewalPlan>(planFromPayment(openPayment));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setPlan(planFromPayment(openPayment));
  }, [openPayment]);

  const status = openPayment?.status ?? "";
  const inReview = status === "pending_review";
  const rejected = status === "rejected";
  const canChangePlan = !openPayment || status === "pending_payment" || rejected;
  const amount = openPayment?.amount ?? (plan === "yearly" ? YEARLY_FEE : MONTHLY_FEE);
  const qrSrc = paymentInfo?.qr_payload
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentInfo.qr_payload)}`
    : null;

  async function handlePlanSelect(next: RenewalPlan) {
    setPlan(next);
    setLocalError(null);
    if (!canChangePlan) {
      return;
    }
    if (openPayment && status !== "rejected" && next === planFromPayment(openPayment)) {
      return;
    }
    try {
      await onChoosePlan(next);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo actualizar el plan.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);

    if (inReview) {
      return;
    }

    const file = new FormData(event.currentTarget).get("voucher");
    if (!(file instanceof File) || file.size === 0) {
      setLocalError("Debes adjuntar el comprobante de pago.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setLocalError("El archivo no puede superar 5 MB.");
      return;
    }

    try {
      await onUpload(file, plan);
      event.currentTarget.reset();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    }
  }

  return (
    <div className="renewal-form">
      {inReview ? (
        <p>
          Recibimos tu comprobante. Cuando el administrador lo apruebe se renovará tu membresía.
        </p>
      ) : null}
      {rejected && openPayment?.admin_observation ? (
        <div className="action-alert action-alert-error">
          <strong>Comprobante rechazado</strong>
          <span>{openPayment.admin_observation}</span>
        </div>
      ) : null}

      <div className="plan-options" role="radiogroup" aria-label="Plan de renovación">
        <button
          aria-pressed={plan === "monthly"}
          className={`plan-option ${plan === "monthly" ? "is-active" : ""}`}
          disabled={isSubmitting || !canChangePlan}
          onClick={() => void handlePlanSelect("monthly")}
          type="button"
        >
          <strong>Mensual</strong>
          <span>{formatUsd(MONTHLY_FEE)}</span>
        </button>
        <button
          aria-pressed={plan === "yearly"}
          className={`plan-option ${plan === "yearly" ? "is-active" : ""}`}
          disabled={isSubmitting || !canChangePlan}
          onClick={() => void handlePlanSelect("yearly")}
          type="button"
        >
          <strong>Anual</strong>
          <span>{formatUsd(YEARLY_FEE)}</span>
        </button>
      </div>

      {paymentInfo ? (
        <div className="payment-grid">
          <div className="payment-qr">
            {qrSrc ? <img alt="QR de transferencia COPSSTEC" src={qrSrc} /> : null}
            <small>Al escanear verás los datos de la transferencia.</small>
          </div>
          <dl className="payment-details">
            <div>
              <dt>Banco</dt>
              <dd>{paymentInfo.bank_name}</dd>
            </div>
            <div>
              <dt>Tipo de cuenta</dt>
              <dd>{paymentInfo.account_type}</dd>
            </div>
            <div>
              <dt>Número</dt>
              <dd>{paymentInfo.account_number}</dd>
            </div>
            <div>
              <dt>Titular</dt>
              <dd>{paymentInfo.account_holder}</dd>
            </div>
            {paymentInfo.account_ruc ? (
              <div>
                <dt>RUC</dt>
                <dd>{paymentInfo.account_ruc}</dd>
              </div>
            ) : null}
            <div>
              <dt>Valor</dt>
              <dd>USD {amount}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="muted">Cargando datos de transferencia...</p>
      )}

      {inReview ? (
        <p className="muted">Tu comprobante está en revisión. No es necesario volver a subirlo.</p>
      ) : (
        <form className="form-stack" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field">
            Comprobante de pago
            <input accept="image/png,image/jpeg,image/webp" name="voucher" required type="file" />
          </label>
          {localError || error ? <p className="form-error">{localError ?? error}</p> : null}
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Subiendo..." : "Subir comprobante"}
          </button>
        </form>
      )}
    </div>
  );
}
