"use client";

import { formatIsoDate, formatUsd } from "@/modules/payments/domain/types";
import { PaymentListItem } from "@/modules/payments/presentation/components/payment-list-item";
import { RenewalVoucherForm } from "@/modules/payments/presentation/components/renewal-voucher-form";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { useMyPayments } from "@/modules/payments/presentation/hooks/use-my-payments";
import { RoleGate } from "@/shared/components/role-gate";

export function MemberPaymentsPage() {
  const payments = useMyPayments();

  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading">
        <h1>Mis pagos</h1>
        <p>Consulta tu cobertura, el pago pendiente y el historial de cuotas.</p>
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
      </section>

      <section className="card">
        <h2>Pendiente</h2>
        <p className="muted">Elige el plan, transfiere y sube el comprobante para renovar.</p>
        <RenewalVoucherForm
          error={payments.error}
          isSubmitting={payments.isSubmitting}
          onChoosePlan={payments.choosePlan}
          onUpload={payments.uploadVoucher}
          openPayment={payments.openPayment}
          paymentInfo={payments.paymentInfo}
        />
      </section>

      <section className="card">
        <h2>Historial</h2>
        <p className="muted">Pagos aprobados y rechazados. No se pueden editar ni eliminar.</p>
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
    </RoleGate>
  );
}
