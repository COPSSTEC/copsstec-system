"use client";

import type { OpenPayment, RenewalPaymentInfo, RenewalPlan } from "@/modules/payments/domain/types";
import { RenewalVoucherForm } from "@/modules/payments/presentation/components/renewal-voucher-form";

interface MemberRenewalModalProps {
  open: boolean;
  error?: string | null;
  isSubmitting?: boolean;
  openPayment: OpenPayment | null;
  paymentInfo: RenewalPaymentInfo | null;
  onClose: () => void;
  onUpload: (file: File, plan: RenewalPlan) => Promise<void>;
}

export function MemberRenewalModal({
  open,
  error,
  isSubmitting,
  openPayment,
  paymentInfo,
  onClose,
  onUpload,
}: MemberRenewalModalProps) {
  if (!open) {
    return null;
  }

  const inReview = openPayment?.status === "pending_review";

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog member-payments-dialog">
        <div className="member-payments-header">
          <div>
            <h2>Pagar cuota</h2>
            <p className="muted">
              {inReview
                ? "Tu comprobante está en revisión."
                : "Elige el pago que debes, transfiere y sube el comprobante."}
            </p>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <RenewalVoucherForm
          error={error}
          isSubmitting={isSubmitting}
          onUpload={onUpload}
          openPayment={openPayment}
          paymentInfo={paymentInfo}
        />
      </div>
    </div>
  );
}
