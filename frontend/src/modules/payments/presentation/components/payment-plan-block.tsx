"use client";

import { useCallback, useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { formatUsd, periodLabel, type PaymentPlan } from "@/modules/payments/domain/types";
import { cancelPaymentPlan, getMemberPaymentPlan } from "@/modules/payments/infrastructure/payments-api";
import { PaymentPlanStatusBadge } from "@/modules/payments/presentation/components/payment-plan-status-badge";
import { PlanScheduleTable } from "@/modules/payments/presentation/components/plan-schedule-table";
import { CreatePaymentPlanModal } from "@/modules/payments/presentation/modals/create-payment-plan-modal";

interface PaymentPlanBlockProps {
  memberId: number;
  memberName: string;
  hasPendingBalance: boolean;
  onChanged: () => void;
}

export function PaymentPlanBlock({ memberId, memberName, hasPendingBalance, onChanged }: PaymentPlanBlockProps) {
  const [plan, setPlan] = useState<PaymentPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setIsLoading(true);
    try {
      setPlan(await getMemberPaymentPlan(token, memberId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el convenio.");
    } finally {
      setIsLoading(false);
    }
  }, [memberId]);

  useEffect(() => {
    setNotice("");
    setError("");
    void load();
  }, [load]);

  async function cancel() {
    const token = getStoredToken();
    if (!token || !plan) {
      return;
    }
    setIsCancelling(true);
    setError("");
    try {
      await cancelPaymentPlan(token, plan.id);
      setConfirmCancel(false);
      setNotice("Convenio cancelado.");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar el convenio.");
    } finally {
      setIsCancelling(false);
    }
  }

  const canCreate = !isLoading && hasPendingBalance && plan?.status !== "active";

  return (
    <section className="admin-payments-detail-block">
      <div className="admin-payments-history-head">
        <h3>Convenio de pago</h3>
        {plan ? <PaymentPlanStatusBadge status={plan.status} /> : null}
      </div>
      {isLoading ? <p className="muted">Cargando convenio...</p> : null}

      {!isLoading && plan ? (
        <>
          <dl className="admin-payments-facts">
            <div>
              <dt>Deuda inicial</dt>
              <dd>{formatUsd(plan.debt_total)}</dd>
            </div>
            <div>
              <dt>Abonado</dt>
              <dd>{formatUsd(plan.debt_paid)}</dd>
            </div>
            <div>
              <dt>Restante</dt>
              <dd>{formatUsd(plan.remaining_debt)}</dd>
            </div>
            <div>
              <dt>Débito mensual</dt>
              <dd>
                {formatUsd(plan.monthly_total)}
                <small className="table-subtitle">
                  {formatUsd(plan.monthly_fee)} cuota + {formatUsd(plan.installment_amount)} abono
                </small>
              </dd>
            </div>
            <div>
              <dt>Vigencia</dt>
              <dd>
                {periodLabel(plan.start_period)} – {periodLabel(plan.end_period)}
              </dd>
            </div>
            <div>
              <dt>Cuenta</dt>
              <dd>
                {plan.bank.bank_name || "—"}
                <small className="table-subtitle">
                  {plan.bank.account_type} {plan.bank.account_number}
                </small>
              </dd>
            </div>
          </dl>
          {plan.next_installment ? (
            <p className="admin-payments-agreement-line">
              Próximo débito: del 1 al {plan.debit_window_days} de {periodLabel(plan.next_installment.period)} por{" "}
              <strong>{formatUsd(plan.next_installment.total_amount)}</strong>
            </p>
          ) : null}
          <PlanScheduleTable highlightPeriod={plan.next_installment?.period} items={plan.installments} />
          {plan.status === "active" ? (
            <div className="admin-payments-docs-actions">
              <button className="secondary-button" onClick={() => setConfirmCancel(true)} type="button">
                Cancelar convenio
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {!isLoading && !plan ? (
        <p className="muted">
          {hasPendingBalance
            ? "No tiene convenio. Crea uno para cobrar la deuda junto con la cuota mensual."
            : "Sin deuda pendiente: no necesita convenio."}
        </p>
      ) : null}

      {canCreate ? (
        <div className="admin-payments-docs-actions">
          <button className="primary-button" onClick={() => setCreateOpen(true)} type="button">
            Crear convenio
          </button>
        </div>
      ) : null}

      {notice ? <p className="admin-payments-agreement-line">{notice}</p> : null}
      {error ? <p className="admin-payments-docs-error">{error}</p> : null}

      {createOpen ? (
        <CreatePaymentPlanModal
          memberId={memberId}
          memberName={memberName}
          onClose={() => setCreateOpen(false)}
          onCreated={(result) => {
            setCreateOpen(false);
            setPlan(result.plan);
            setNotice(result.message);
            onChanged();
          }}
        />
      ) : null}

      {confirmCancel && plan ? (
        <div className="modal-backdrop">
          <div className="confirm-dialog">
            <h2>Cancelar convenio</h2>
            <p className="muted">
              Se eliminarán las cuotas pendientes. Los débitos ya confirmados se conservan y la deuda restante
              volverá a calcularse normalmente.
            </p>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="table-actions">
              <button className="secondary-button" onClick={() => setConfirmCancel(false)} type="button">
                Volver
              </button>
              <button className="danger-button" disabled={isCancelling} onClick={() => void cancel()} type="button">
                {isCancelling ? "Cancelando..." : "Cancelar convenio"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
