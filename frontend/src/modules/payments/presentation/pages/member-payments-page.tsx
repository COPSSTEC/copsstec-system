"use client";

import { useState } from "react";

import { formatIsoDate, formatUsd, memberNeedsRenewal } from "@/modules/payments/domain/types";
import { PaymentListItem } from "@/modules/payments/presentation/components/payment-list-item";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { useMyPayments } from "@/modules/payments/presentation/hooks/use-my-payments";
import { MemberRenewalModal } from "@/modules/payments/presentation/modals/member-renewal-modal";
import { RoleGate } from "@/shared/components/role-gate";

export function MemberPaymentsPage() {
  const payments = useMyPayments();
  const [renewalOpen, setRenewalOpen] = useState(false);
  const needsRenewal = memberNeedsRenewal(payments.subscription, payments.openPayment);
  const inReview = payments.openPayment?.status === "pending_review";

  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Mis pagos</h1>
          <p>Consulta tu cobertura y el historial de cuotas. Si debes una cuota, ábrela para pagarla.</p>
        </div>
        {needsRenewal ? (
          <button className="create-button" onClick={() => setRenewalOpen(true)} type="button">
            {inReview ? "Ver comprobante" : "Pagar cuota"}
          </button>
        ) : null}
      </section>

      {payments.error ? (
        <div className="action-alert action-alert-error">
          <strong>Error</strong>
          <span>{payments.error}</span>
        </div>
      ) : null}

      <section className="card">
        <h2>Estado de suscripción</h2>
        {payments.isLoading ? (
          <p className="muted">Cargando cobertura...</p>
        ) : payments.subscription ? (
          <dl className="payment-details">
            <div>
              <dt>Cobertura hasta</dt>
              <dd>{formatIsoDate(payments.subscription.coverage_until)}</dd>
            </div>
            <div>
              <dt>Saldo a favor</dt>
              <dd>{formatUsd(payments.subscription.credit_balance)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>
                <SubscriptionStatusBadge status={payments.subscription.status} />
              </dd>
            </div>
            {payments.subscription.days_overdue > 0 ? (
              <div>
                <dt>Días de mora</dt>
                <dd>{payments.subscription.days_overdue}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className="muted">Aún no hay historial de membresía registrado.</p>
        )}
        {!payments.isLoading && !needsRenewal ? (
          <p className="muted">No tienes pagos pendientes por cancelar.</p>
        ) : null}
      </section>

      <section className="card">
        <h2>Historial</h2>
        <p className="muted">Pagos registrados. No se pueden editar ni eliminar.</p>
        {payments.isLoading ? <p className="muted">Cargando historial...</p> : null}
        <div className="payment-card-list">
          {payments.history.map((payment) => (
            <PaymentListItem key={payment.id} payment={payment} readOnly />
          ))}
          {!payments.isLoading && payments.history.length === 0 ? (
            <p className="muted">Todavía no hay pagos en el historial.</p>
          ) : null}
        </div>
      </section>

      <MemberRenewalModal
        error={payments.error}
        isSubmitting={payments.isSubmitting}
        onClose={() => setRenewalOpen(false)}
        onUpload={async (file, plan) => {
          await payments.uploadVoucher(file, plan);
          setRenewalOpen(false);
        }}
        open={renewalOpen}
        openPayment={payments.openPayment}
        paymentInfo={payments.paymentInfo}
      />
    </RoleGate>
  );
}
