import type { AdminPaymentStats } from "@/modules/payments/domain/types";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import {
  formatKpiUsd,
  formatMomHint,
  monthOverMonth,
  momTone,
  shareHint,
  trendFromPercent,
} from "@/modules/payments/presentation/lib/admin-payments";
import { DashboardKpiCard } from "@/modules/dashboard/presentation/components/dashboard-kpi-card";

interface AdminPaymentsKpisProps {
  stats: AdminPaymentStats | null;
  isLoading: boolean;
}

export function AdminPaymentsKpis({ stats, isLoading }: AdminPaymentsKpisProps) {
  const approvedMom = stats ? monthOverMonth(stats.approved_month, stats.approved_prev_month) : null;
  const pendingMom = stats ? monthOverMonth(stats.pending_month, stats.pending_prev_month) : null;

  return (
    <section className="admin-dashboard-kpis admin-payments-kpis">
      <DashboardKpiCard
        hint={isLoading ? "Cargando..." : formatMomHint(approvedMom)}
        hintTone={momTone(approvedMom)}
        icon={<PaymentUiIcon name="check" />}
        sparkline={trendFromPercent(approvedMom)}
        title="Aprobados (mes)"
        tone="green"
        value={isLoading ? "—" : String(stats?.approved_month ?? 0)}
      />
      <DashboardKpiCard
        hint={isLoading ? "Cargando..." : formatMomHint(pendingMom)}
        hintTone={momTone(pendingMom)}
        icon={<PaymentUiIcon name="clock" />}
        sparkline={trendFromPercent(pendingMom)}
        title="Pagos pendientes"
        tone="amber"
        value={isLoading ? "—" : String(stats?.pending_count ?? 0)}
      />
      <DashboardKpiCard
        hint={
          isLoading
            ? "Cargando..."
            : shareHint(stats?.members_al_dia ?? 0, stats?.members_total ?? 0)
        }
        hintTone="neutral"
        icon={<PaymentUiIcon name="users" />}
        sparkline={trendFromPercent(null)}
        title="Miembros al día"
        tone="blue"
        value={isLoading ? "—" : String(stats?.members_al_dia ?? 0)}
      />
      <DashboardKpiCard
        hint={
          isLoading
            ? "Cargando..."
            : shareHint(stats?.members_vencidas ?? 0, stats?.members_total ?? 0)
        }
        hintTone={(stats?.members_vencidas ?? 0) > 0 ? "down" : "neutral"}
        icon={<PaymentUiIcon name="warning" />}
        sparkline={trendFromPercent((stats?.members_vencidas ?? 0) > 0 ? 10 : null)}
        title="Membresías vencidas"
        tone="red"
        value={isLoading ? "—" : String(stats?.members_vencidas ?? 0)}
      />
      <DashboardKpiCard
        hint={isLoading ? "Cargando..." : "Saldo de cuotas adeudadas"}
        hintTone={(Number(stats?.pending_balance_total) || 0) > 0 ? "down" : "neutral"}
        icon={<PaymentUiIcon name="dollar" />}
        sparkline={trendFromPercent(null)}
        title="Saldo pendiente"
        tone="green"
        value={isLoading ? "—" : formatKpiUsd(stats?.pending_balance_total ?? "0")}
      />
    </section>
  );
}
