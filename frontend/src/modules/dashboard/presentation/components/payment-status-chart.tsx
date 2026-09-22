"use client";

import { AlertCircleIcon, CheckCircleIcon, DownloadIcon } from "@/modules/dashboard/presentation/components/dashboard-icons";
import { DashboardBarChart } from "@/modules/dashboard/presentation/components/dashboard-bar-chart";

interface PaymentStatusChartProps {
  alDia: number;
  pendiente: number;
  downloading?: "payments" | "debtors" | null;
  onDownload: () => void;
  onDownloadDebtors: () => void;
}

export function PaymentStatusChart({
  alDia,
  pendiente,
  downloading = null,
  onDownload,
  onDownloadDebtors,
}: PaymentStatusChartProps) {
  const total = alDia + pendiente;
  const percent = total > 0 ? Math.round((alDia / total) * 100) : 0;

  return (
    <article className="admin-dashboard-card">
      <header className="admin-dashboard-card-head">
        <div>
          <h2>Estado de pagos</h2>
          <p>Miembros habilitados con pagos al día frente a pendientes de membresía</p>
        </div>
        <button
          aria-label="Descargar detalle de pagos"
          className="admin-dashboard-ghost"
          disabled={downloading === "payments"}
          onClick={onDownload}
          type="button"
        >
          <DownloadIcon />
        </button>
      </header>
      <div className="admin-dashboard-split">
        <DashboardBarChart
          colors={["#22c55e", "#ef4444"]}
          compact
          items={[
            { label: "Al día", count: alDia },
            { label: "Pendiente", count: pendiente },
          ]}
        />
        <div className="admin-dashboard-split-meta">
          <strong>{percent}%</strong>
          <span>tienen pagos al día</span>
          <ul>
            <li>
              <CheckCircleIcon size={14} />
              <em>{alDia.toLocaleString("es-EC")}</em> Al día
            </li>
            <li>
              <AlertCircleIcon size={14} />
              <em>{pendiente.toLocaleString("es-EC")}</em> Pendiente
            </li>
          </ul>
          <button
            className="admin-dashboard-text-link"
            disabled={downloading === "debtors"}
            onClick={onDownloadDebtors}
            type="button"
          >
            Descargar deudores
          </button>
        </div>
      </div>
    </article>
  );
}