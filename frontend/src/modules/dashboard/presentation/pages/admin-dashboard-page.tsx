"use client";

import { useMemo, useState } from "react";

import type { DashboardIncomeMonth, PendingApproval } from "@/modules/dashboard/domain/types";
import { AcademicTitlesChart } from "@/modules/dashboard/presentation/components/academic-titles-chart";
import { DashboardAside } from "@/modules/dashboard/presentation/components/dashboard-aside";
import {
  DollarIcon,
  DownloadIcon,
  InactiveIcon,
  MedicalIcon,
  PersonIcon,
  RefreshIcon,
  TechnicalIcon,
} from "@/modules/dashboard/presentation/components/dashboard-icons";
import { DashboardKpiCard } from "@/modules/dashboard/presentation/components/dashboard-kpi-card";
import { DemographicsPanel } from "@/modules/dashboard/presentation/components/demographics-panel";
import { IncomeYearChart } from "@/modules/dashboard/presentation/components/income-year-chart";
import { PaymentStatusChart } from "@/modules/dashboard/presentation/components/payment-status-chart";
import { useAdminDashboard } from "@/modules/dashboard/presentation/hooks/use-admin-dashboard";
import { PendingMembersModal } from "@/modules/dashboard/presentation/modals/pending-members-modal";
import { ApproveMemberModal } from "@/modules/members/presentation/modals/approve-member-modal";

function formatMomHint(percent: number | null, extra?: string): string {
  if (percent === null) {
    return extra ?? "—";
  }
  const rounded = Number.isInteger(percent) ? String(percent) : percent.toFixed(1);
  const sign = percent > 0 ? "+" : "";
  return extra ? `${sign}${rounded}% ${extra}` : `${sign}${rounded}% vs. mes anterior`;
}

function momTone(percent: number | null): "up" | "down" | "neutral" {
  if (percent === null || percent === 0) {
    return "neutral";
  }
  return percent > 0 ? "up" : "down";
}

function shareHint(part: number, total: number): string {
  if (total <= 0) {
    return "—";
  }
  return `del total (${Math.round((part / total) * 100)}%)`;
}

function monthTotal(month?: DashboardIncomeMonth): number {
  if (!month) {
    return 0;
  }
  return [month.memberships, month.courses, month.reservations].reduce((sum, value) => sum + Number(value || 0), 0);
}

function formatUsd(value: number): string {
  return `$${value.toLocaleString("es-EC", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatLongDate(value = new Date()): string {
  const text = new Intl.DateTimeFormat("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function trendFromPercent(percent: number | null): number[] {
  if (percent === null) {
    return [8, 8, 8, 8, 8];
  }
  if (percent > 0) {
    return [4, 5, 6, 8, 11];
  }
  if (percent < 0) {
    return [11, 9, 7, 6, 4];
  }
  return [6, 6, 6, 6, 6];
}

export function AdminDashboardPage() {
  const {
    snapshot,
    year,
    setYear,
    isLoading,
    error,
    notice,
    setNotice,
    reload,
    download,
    downloadingKey,
  } = useAdminDashboard();
  const [pendingOpen, setPendingOpen] = useState(false);
  const [approving, setApproving] = useState<PendingApproval | null>(null);
  const today = useMemo(() => new Date(), []);

  const incomeMonths = snapshot?.income.months ?? [];
  const currentMonthNumber = today.getMonth() + 1;
  const latestIncomeMonth = [...incomeMonths]
    .filter((item) => year !== today.getFullYear() || item.month <= currentMonthNumber)
    .reverse()
    .find((item) => monthTotal(item) >= 10);
  const previousIncomeMonth = latestIncomeMonth
    ? incomeMonths.find((item) => item.month === latestIncomeMonth.month - 1)
    : undefined;
  const monthIncome = monthTotal(latestIncomeMonth);
  const previousIncome = monthTotal(previousIncomeMonth);
  const incomeMom = previousIncome > 0 ? ((monthIncome - previousIncome) / previousIncome) * 100 : null;
  const incomeSpark = incomeMonths.map((item) => monthTotal(item));

  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard-hero">
        <div>
          <p className="admin-dashboard-kicker">Panel de administración</p>
          <h1>Dashboard de administración</h1>
          <p>Gestión y visualización de miembros, pagos, ingresos y contenido del COPSSTEC.</p>
        </div>
        <div className="admin-dashboard-hero-side">
          <em>Profesionales que protegen vidas</em>
          <time>{formatLongDate(today)}</time>
          <div className="admin-dashboard-heading-actions">
            <button
              className="admin-dashboard-action is-light"
              disabled={downloadingKey === "income"}
              onClick={() => void download("income")}
              type="button"
            >
              <DownloadIcon />
              Descargar reporte
            </button>
            <button className="admin-dashboard-action" disabled={isLoading} onClick={() => void reload()} type="button">
              <RefreshIcon />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>
      </header>

      {notice ? <p className="form-success">{notice}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {isLoading && !snapshot ? <p className="muted">Cargando indicadores...</p> : null}

      {snapshot ? (
        <div className="admin-dashboard-body">
          <div className="admin-dashboard-kpis">
            <DashboardKpiCard
              hint={formatMomHint(snapshot.cards.active_mom_percent)}
              hintTone={momTone(snapshot.cards.active_mom_percent)}
              icon={<PersonIcon />}
              sparkline={trendFromPercent(snapshot.cards.active_mom_percent)}
              title="Total miembros activos"
              tone="blue"
              value={snapshot.cards.active.toLocaleString("es-EC")}
            />
            <DashboardKpiCard
              hint={formatMomHint(snapshot.cards.inactive_mom_percent)}
              hintTone={momTone(snapshot.cards.inactive_mom_percent)}
              icon={<InactiveIcon />}
              sparkline={trendFromPercent(snapshot.cards.inactive_mom_percent)}
              title="Miembros inactivos"
              tone="red"
              value={snapshot.cards.inactive.toLocaleString("es-EC")}
            />
            <DashboardKpiCard
              hint={formatMomHint(null, shareHint(snapshot.cards.technical, snapshot.cards.active))}
              hintTone="up"
              icon={<TechnicalIcon />}
              sparkline={trendFromPercent(8)}
              title="Miembros técnicos"
              tone="purple"
              value={snapshot.cards.technical.toLocaleString("es-EC")}
            />
            <DashboardKpiCard
              hint={formatMomHint(null, shareHint(snapshot.cards.medical, snapshot.cards.active))}
              hintTone="up"
              icon={<MedicalIcon />}
              sparkline={trendFromPercent(4)}
              title="Miembros médicos"
              tone="green"
              value={snapshot.cards.medical.toLocaleString("es-EC")}
            />
            <DashboardKpiCard
              hint={formatMomHint(incomeMom)}
              hintTone={momTone(incomeMom)}
              icon={<DollarIcon />}
              sparkline={incomeSpark.length > 0 ? incomeSpark : [0]}
              title="Ingresos del mes"
              tone="amber"
              value={formatUsd(monthIncome)}
            />
          </div>

          <div className="admin-dashboard-grid">
            <div className="admin-dashboard-main">
              <div className="admin-dashboard-charts">
                <PaymentStatusChart
                  alDia={snapshot.payments.al_dia}
                  downloading={
                    downloadingKey === "payments" || downloadingKey === "debtors" ? downloadingKey : null
                  }
                  onDownload={() => void download("payments")}
                  onDownloadDebtors={() => void download("debtors")}
                  pendiente={snapshot.payments.pendiente}
                />
                <IncomeYearChart
                  downloading={downloadingKey === "income"}
                  months={snapshot.income.months}
                  onDownload={() => void download("income")}
                  onYearChange={setYear}
                  year={year}
                  years={snapshot.income.available_years}
                />
              </div>
              <div className="admin-dashboard-charts">
                <DemographicsPanel
                  demographics={snapshot.demographics}
                  downloading={downloadingKey}
                  onDownload={(key) => void download(key)}
                />
                <AcademicTitlesChart
                  downloading={downloadingKey === "titles"}
                  onDownload={() => void download("titles")}
                  titles={snapshot.titles}
                />
              </div>
            </div>
            <DashboardAside
              onDownloadDebtors={() => void download("debtors")}
              onOpenPending={() => setPendingOpen(true)}
              pendingApprovals={snapshot.pending_approvals}
              pendingPayments={snapshot.payments.pendiente}
              upcomingDues={snapshot.upcoming_dues ?? []}
            />
          </div>
        </div>
      ) : null}

      {pendingOpen ? (
        <PendingMembersModal
          items={snapshot?.pending_approvals ?? []}
          onApprove={(item) => setApproving(item)}
          onClose={() => setPendingOpen(false)}
        />
      ) : null}

      {approving ? (
        <ApproveMemberModal
          memberId={approving.user_id}
          memberName={`${approving.names} ${approving.lastname}`.trim()}
          onApproved={(message) => {
            setNotice(message);
            setApproving(null);
            setPendingOpen(false);
            void reload();
          }}
          onClose={() => setApproving(null)}
        />
      ) : null}
    </section>
  );
}