"use client";

import { useState } from "react";

import { formatUsd, periodLabel, type PaymentPlan } from "@/modules/payments/domain/types";
import { PaymentPlanStatusBadge } from "@/modules/payments/presentation/components/payment-plan-status-badge";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import { PlanScheduleTable } from "@/modules/payments/presentation/components/plan-schedule-table";
import { planMessageParagraphs } from "@/modules/payments/presentation/lib/payment-plans";

interface MemberPaymentPlanCardProps {
  plan: PaymentPlan;
}

export function MemberPaymentPlanCard({ plan }: MemberPaymentPlanCardProps) {
  const [showSchedule, setShowSchedule] = useState(false);
  const next = plan.next_installment;
  const paragraphs = planMessageParagraphs(plan, plan.installments);

  return (
    <section className="member-payment-plan">
      <header className="member-payment-plan-head">
        <div className="member-payments-kpi-icon is-blue">
          <PaymentUiIcon name="calendar" />
        </div>
        <div>
          <h2>Convenio de pago de membresía</h2>
          <p>
            Débito automático del 1 al {plan.debit_window_days} de cada mes en {plan.bank.bank_name || "tu cuenta"}
            {plan.bank.account_number ? ` · cuenta ${plan.bank.account_number.slice(-4).padStart(8, "•")}` : ""}
          </p>
        </div>
        <PaymentPlanStatusBadge status={plan.status} />
      </header>

      <dl className="member-payment-plan-facts">
        <div>
          <dt>Próximo débito</dt>
          <dd>
            {next ? formatUsd(next.total_amount) : formatUsd(plan.monthly_fee)}
            <small>
              {next
                ? `Del 1 al ${plan.debit_window_days} de ${periodLabel(next.period)} · ${formatUsd(next.fee_amount)} cuota${
                    Number(next.debt_amount) > 0 ? ` + ${formatUsd(next.debt_amount)} abono` : ""
                  }`
                : "Cuota mensual regular"}
            </small>
          </dd>
        </div>
        <div>
          <dt>Deuda restante</dt>
          <dd>
            {formatUsd(plan.remaining_debt)}
            <small>De {formatUsd(plan.debt_total)} · abonado {formatUsd(plan.debt_paid)}</small>
          </dd>
        </div>
        <div>
          <dt>Fin del convenio</dt>
          <dd>
            {periodLabel(plan.end_period)}
            <small>
              Desde {periodLabel(plan.regular_from_period)}: {formatUsd(plan.monthly_fee)} mensuales
            </small>
          </dd>
        </div>
      </dl>

      <div className="payment-plan-message">
        {paragraphs.map((paragraph) => (
          <p className={paragraph.startsWith("•") ? "is-bullet" : ""} key={paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      <button className="secondary-button" onClick={() => setShowSchedule((value) => !value)} type="button">
        {showSchedule ? "Ocultar calendario" : "Ver calendario mes a mes"}
      </button>
      {showSchedule ? <PlanScheduleTable highlightPeriod={next?.period} items={plan.installments} /> : null}
    </section>
  );
}
