import {
  formatPaymentMethod,
  formatUsd,
  paymentTitle,
  type Payment,
} from "@/modules/payments/domain/types";
import { paymentVoucherUrl } from "@/modules/payments/infrastructure/payments-api";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";

interface PaymentListItemProps {
  payment: Payment;
  onEdit?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
  onReview?: (payment: Payment) => void;
  readOnly?: boolean;
}

function PencilIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <path d="M4 7h16" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <path
        d="M6 7l1 13h10l1-13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

export function PaymentListItem({
  payment,
  onEdit,
  onDelete,
  onReview,
  readOnly = false,
}: PaymentListItemProps) {
  const voucher = paymentVoucherUrl(payment.voucher_url);
  const canReview = Boolean(voucher && payment.status === "pending_review" && onReview);

  return (
    <article className="payment-card">
      <div className="payment-card-top">
        <div>
          <strong>{paymentTitle(payment)}</strong>
          <div className="payment-card-meta">
            <PaymentStatusBadge status={payment.status} />
          </div>
        </div>
        <div className="payment-card-side">
          <span className="payment-card-amount">{formatUsd(payment.amount)}</span>
          {readOnly ? null : (
            <div className="payment-card-actions">
              {onEdit ? (
                <button
                  aria-label="Editar pago"
                  className="icon-button"
                  onClick={() => onEdit(payment)}
                  type="button"
                >
                  <PencilIcon />
                </button>
              ) : null}
              {onDelete ? (
                <button
                  aria-label="Eliminar pago"
                  className="icon-button icon-button-danger"
                  onClick={() => onDelete(payment)}
                  type="button"
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <p className="payment-card-line">Fecha de pago: {payment.date_register || "—"}</p>
      <p className="payment-card-line">Forma de pago: {formatPaymentMethod(payment.last_digits)}</p>
      {voucher ? (
        <div className="payment-card-voucher">
          <a href={voucher} rel="noreferrer" target="_blank">
            <img alt="Comprobante de pago" className="voucher-thumb" src={voucher} />
            Ver voucher
          </a>
          {canReview ? (
            <button className="secondary-button" onClick={() => onReview?.(payment)} type="button">
              Aprobar / Rechazar
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
