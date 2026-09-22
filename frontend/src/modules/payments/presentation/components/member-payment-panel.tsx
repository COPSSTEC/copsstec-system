import { formatUsd, type Payment, type SubscriptionSummary } from "@/modules/payments/domain/types";
import { paymentVoucherUrl } from "@/modules/payments/infrastructure/payments-api";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import {
  isPendingStatus,
  paymentCoveragePeriod,
  paymentMethodLabel,
  paymentObservation,
  paymentReceiptNumber,
  paymentStatusBanner,
  paymentVisual,
  receiptFileMeta,
} from "@/modules/payments/presentation/lib/member-payments";

interface MemberPaymentPanelProps {
  isBusy?: boolean;
  onClose: () => void;
  onDownload: () => void;
  onPay?: () => void;
  onPrint: () => void;
  onShare: () => void;
  payment: Payment | null;
  subscription: SubscriptionSummary | null;
}

export function MemberPaymentPanel({
  isBusy = false,
  onClose,
  onDownload,
  onPay,
  onPrint,
  onShare,
  payment,
  subscription,
}: MemberPaymentPanelProps) {
  if (!payment) {
    return (
      <aside className="member-payments-panel" onClick={(event) => event.stopPropagation()}>
        <div className="member-payments-panel-empty">
          <PaymentUiIcon name="invoice" />
          <h3>Selecciona un pago</h3>
          <p>Elige una fila para ver el detalle y descargar el comprobante.</p>
        </div>
      </aside>
    );
  }

  const visual = paymentVisual(payment);
  const banner = paymentStatusBanner(payment.status);
  const coverage = paymentCoveragePeriod(payment, subscription);
  const file = receiptFileMeta(payment);
  const voucher = paymentVoucherUrl(payment.voucher_url);
  const canPay = Boolean(onPay && isPendingStatus(payment.status));

  return (
    <aside className="member-payments-panel" onClick={(event) => event.stopPropagation()}>
      <i aria-hidden="true" className="member-payments-sheet-handle" />
      <header className="member-payments-panel-head">
        <h2>Detalle del pago</h2>
        <button aria-label="Cerrar detalle" className="member-payments-icon-btn" onClick={onClose} type="button">
          <PaymentUiIcon name="close" />
        </button>
      </header>

      <div className="member-payments-panel-scroll">
      <div className={`member-payments-banner is-${banner.tone}`}>
        <span className="member-payments-banner-icon">
          <PaymentUiIcon name={banner.tone === "danger" ? "close" : "check"} />
        </span>
        <div>
          <strong>{banner.title}</strong>
          <p>{banner.hint}</p>
        </div>
      </div>

      <dl className="member-payments-facts">
        <div>
          <dt>Concepto</dt>
          <dd>
            <b>{visual.title}</b>
            {visual.subtitle !== visual.title ? <span>{visual.subtitle}</span> : null}
          </dd>
        </div>
        <div>
          <dt>Monto</dt>
          <dd>{formatUsd(payment.amount)}</dd>
        </div>
        <div>
          <dt>Estado</dt>
          <dd>
            <PaymentStatusBadge status={payment.status} />
          </dd>
        </div>
        <div>
          <dt>Fecha de pago</dt>
          <dd>
            <span className="member-payments-fact-line">
              <PaymentUiIcon name="calendar" />
              <span>{payment.date_register || "—"}</span>
            </span>
          </dd>
        </div>
        <div>
          <dt>Forma de pago</dt>
          <dd>
            <span className="member-payments-fact-line">
              <PaymentUiIcon name="wallet" />
              <span>{paymentMethodLabel(payment.last_digits, true)}</span>
            </span>
          </dd>
        </div>
        <div>
          <dt>Número de comprobante</dt>
          <dd>
            <span className="member-payments-fact-line">
              <span>{paymentReceiptNumber(payment)}</span>
            </span>
          </dd>
        </div>
        {coverage ? (
          <div>
            <dt>Periodo de vigencia</dt>
            <dd>
              <span className="member-payments-fact-line">
                <PaymentUiIcon name="clock" />
                <span>{coverage}</span>
              </span>
            </dd>
          </div>
        ) : null}
        <div className="is-block">
          <dt>Observaciones</dt>
          <dd>
            <PaymentUiIcon name="file" />
            <span>{paymentObservation(payment)}</span>
          </dd>
        </div>
      </dl>

      <section className="member-payments-receipt">
        <h3>Comprobante de pago</h3>
        <div className="member-payments-file">
          {voucher && !voucher.toLowerCase().endsWith(".pdf") ? (
            <img alt="Comprobante de pago" src={voucher} />
          ) : (
            <span className="member-payments-file-icon">
              <PaymentUiIcon name="file" />
            </span>
          )}
          <div>
            <strong title={file.name}>{file.name}</strong>
            <span>{file.detail}</span>
          </div>
        </div>
      </section>
      </div>

      <div className="member-payments-panel-footer">
      {canPay ? (
        <button className="primary-button member-payments-download" disabled={isBusy} onClick={onPay} type="button">
          {payment.status === "pending_review" ? "Ver comprobante" : "Pagar cuota"}
        </button>
      ) : null}

      <button
        className="primary-button member-payments-download"
        disabled={isBusy}
        onClick={onDownload}
        type="button"
      >
        <PaymentUiIcon name="download" />
        Descargar comprobante
      </button>

      <div className="member-payments-panel-actions">
        <button className="member-payments-ghost-btn" disabled={isBusy} onClick={onPrint} type="button">
          <PaymentUiIcon name="printer" />
          Imprimir
        </button>
        <button className="member-payments-ghost-btn" disabled={isBusy} onClick={onShare} type="button">
          <PaymentUiIcon name="share" />
          Compartir
        </button>
      </div>
      </div>
    </aside>
  );
}
