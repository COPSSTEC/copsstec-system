"use client";

import type { PendingApproval, UpcomingDue } from "@/modules/dashboard/domain/types";
import { UsersIcon } from "@/modules/dashboard/presentation/components/dashboard-icons";

interface DashboardAsideProps {
  pendingApprovals: PendingApproval[];
  upcomingDues: UpcomingDue[];
  pendingPayments: number;
  onOpenPending: () => void;
  onDownloadDebtors: () => void;
}

const MONTHS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];

function dueDateParts(value: string): { month: string; day: string } {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { month: "—", day: "—" };
  }
  return {
    month: MONTHS[parsed.getMonth()] ?? "—",
    day: String(parsed.getDate()).padStart(2, "0"),
  };
}

function dueHint(daysLeft: number): string {
  if (daysLeft < 0) {
    return `venció hace ${Math.abs(daysLeft)} días`;
  }
  if (daysLeft === 0) {
    return "vence hoy";
  }
  return `vence en ${daysLeft} días`;
}

export function DashboardAside({
  pendingApprovals,
  upcomingDues,
  pendingPayments,
  onOpenPending,
  onDownloadDebtors,
}: DashboardAsideProps) {
  const recent = pendingApprovals.slice(0, 5);

  return (
    <aside className="admin-dashboard-aside">
      <section className="admin-dashboard-card">
        <header className="admin-dashboard-card-head">
          <h2>Actividad reciente</h2>
          <button className="admin-dashboard-text-link" onClick={onOpenPending} type="button">
            Ver pendientes
          </button>
        </header>
        {recent.length === 0 ? (
          <p className="admin-dashboard-empty">No hay actividad reciente.</p>
        ) : (
          <ul className="admin-dashboard-activity">
            {recent.map((item) => (
              <li key={item.user_id}>
                <span className="is-blue">
                  <UsersIcon size={14} />
                </span>
                <div>
                  <strong>Nuevo miembro registrado</strong>
                  <em>
                    {item.names} {item.lastname}
                  </em>
                  <small>{item.date_register || "Sin fecha"}</small>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-dashboard-card">
        <header className="admin-dashboard-card-head">
          <h2>Próximos vencimientos</h2>
        </header>
        {upcomingDues.length === 0 ? (
          <p className="admin-dashboard-empty">No hay vencimientos próximos.</p>
        ) : (
          <ul className="admin-dashboard-dues">
            {upcomingDues.map((item) => {
              const parts = dueDateParts(item.coverage_until);
              return (
                <li key={item.user_id}>
                  <time>
                    <small>{parts.month}</small>
                    <strong>{parts.day}</strong>
                  </time>
                  <div>
                    <strong>Pago de membresía</strong>
                    <em>
                      {item.names} {item.lastname}
                    </em>
                    <small>{dueHint(item.days_left)}</small>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-dashboard-card">
        <header className="admin-dashboard-card-head">
          <h2>Tareas pendientes</h2>
        </header>
        <ul className="admin-dashboard-tasks">
          <li>
            <button onClick={onDownloadDebtors} type="button">
              <strong>{pendingPayments.toLocaleString("es-EC")}</strong>
              Miembros con pagos pendientes
            </button>
          </li>
          <li>
            <button onClick={onOpenPending} type="button">
              <strong>{pendingApprovals.length.toLocaleString("es-EC")}</strong>
              Solicitudes de aprobación
            </button>
          </li>
        </ul>
      </section>
    </aside>
  );
}