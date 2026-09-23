import {
  formatIsoDate,
  formatUsd,
  type Payment,
  type SubscriptionSummary,
} from "@/modules/payments/domain/types";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import {
  coverageHint,
  isMembershipActive,
  membershipStatusHint,
  membershipStatusTitle,
  pendingAmountTotal,
  type PaymentIconName,
  type PaymentIconTone,
} from "@/modules/payments/presentation/lib/member-payments";

interface MemberPaymentKpisProps {
  isLoading: boolean;
  items: Payment[];
  subscription: SubscriptionSummary | null;
}

export function MemberPaymentKpis({ isLoading, items, subscription }: MemberPaymentKpisProps) {
  const openPending = pendingAmountTotal(items);
  const debt = Number(subscription?.pending_balance || 0);
  const pending = Math.max(openPending, Number.isNaN(debt) ? 0 : debt);
  const active = isMembershipActive(subscription?.status);

  return (
    <section className="member-payments-kpis">
      <KpiCard
        hint={isLoading ? "Cargando estado..." : membershipStatusHint(subscription)}
        icon="shield"
        label="Estado de membresía"
        tone={active ? "green" : subscription?.status === "vencida" ? "rose" : "slate"}
        value={isLoading ? "—" : membershipStatusTitle(subscription?.status)}
      />
      <KpiCard
        hint={isLoading ? "Cargando cobertura..." : coverageHint(subscription)}
        icon="calendar"
        label="Cobertura vigente hasta"
        tone="blue"
        value={isLoading ? "—" : formatIsoDate(subscription?.coverage_until)}
      />
      <KpiCard
        hint={
          Number(subscription?.credit_balance || 0) > 0
            ? "Disponible para próximas cuotas."
            : "Sin saldo a favor."
        }
        icon="wallet"
        label="Saldo a favor"
        tone="slate"
        value={isLoading ? "—" : formatUsd(subscription?.credit_balance || "0")}
      />
      <KpiCard
        hint={pending > 0 ? "Cuotas de membresía adeudadas." : "No tienes cargos vencidos."}
        icon="invoice"
        label="Pendiente por pagar"
        tone={pending > 0 ? "rose" : "slate"}
        value={isLoading ? "—" : formatUsd(pending)}
      />
    </section>
  );
}

function KpiCard({
  hint,
  icon,
  label,
  tone,
  value,
}: {
  hint: string;
  icon: PaymentIconName;
  label: string;
  tone: PaymentIconTone | "green";
  value: string;
}) {
  return (
    <article className="member-payments-kpi">
      <div className={`member-payments-kpi-icon is-${tone}`}>
        <PaymentUiIcon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{hint}</p>
      </div>
    </article>
  );
}
