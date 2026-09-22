import { formatUsd, type Payment } from "@/modules/payments/domain/types";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import {
  paymentMethodLabel,
  paymentVisual,
} from "@/modules/payments/presentation/lib/member-payments";

interface MemberPaymentRowProps {
  isSelected?: boolean;
  onSelect: () => void;
  payment: Payment;
}

export function MemberPaymentRow({ isSelected = false, onSelect, payment }: MemberPaymentRowProps) {
  const visual = paymentVisual(payment);

  return (
    <article className={`member-payments-row ${isSelected ? "is-selected" : ""}`}>
      <button className="member-payments-row-main" onClick={onSelect} type="button">
        <span className={`member-payments-row-icon is-${visual.tone}`}>
          <PaymentUiIcon name={visual.icon} />
        </span>
        <div className="member-payments-row-copy">
          <strong>{visual.title}</strong>
          {visual.subtitle !== visual.title ? <span>{visual.subtitle}</span> : null}
          <small>
            <span>
              <PaymentUiIcon name="calendar" />
              {payment.date_register || "—"}
            </span>
            <span>
              <PaymentUiIcon name="wallet" />
              {paymentMethodLabel(payment.last_digits)}
            </span>
          </small>
        </div>
        <div className="member-payments-row-side">
          <b>{formatUsd(payment.amount)}</b>
          <PaymentStatusBadge status={payment.status} />
        </div>
      </button>
      <button className="member-payments-row-detail" onClick={onSelect} type="button">
        Ver detalle
        <PaymentUiIcon name="arrow" />
      </button>
    </article>
  );
}
