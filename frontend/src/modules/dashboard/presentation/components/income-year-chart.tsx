"use client";

import type { DashboardIncomeMonth } from "@/modules/dashboard/domain/types";
import { DownloadIcon } from "@/modules/dashboard/presentation/components/dashboard-icons";
import { DashboardLineChart } from "@/modules/dashboard/presentation/components/dashboard-line-chart";

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const SERIES_COLORS = {
  memberships: "#3b82f6",
  courses: "#38bdf8",
  reservations: "#f59e0b",
} as const;

interface IncomeYearChartProps {
  year: number;
  years: number[];
  months: DashboardIncomeMonth[];
  downloading?: boolean;
  onYearChange: (year: number) => void;
  onDownload: () => void;
}

function parseAmount(value?: string): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUsd(value: number): string {
  return `$${Math.round(value).toLocaleString("es-EC")}`;
}

function seriesForMonths(months: DashboardIncomeMonth[]): {
  memberships: number[];
  courses: number[];
  reservations: number[];
} {
  const byMonth = new Map(months.map((item) => [item.month, item]));

  return {
    memberships: MONTH_LABELS.map((_, index) => parseAmount(byMonth.get(index + 1)?.memberships)),
    courses: MONTH_LABELS.map((_, index) => parseAmount(byMonth.get(index + 1)?.courses)),
    reservations: MONTH_LABELS.map((_, index) => parseAmount(byMonth.get(index + 1)?.reservations)),
  };
}

export function IncomeYearChart({
  year,
  years,
  months,
  downloading = false,
  onYearChange,
  onDownload,
}: IncomeYearChartProps) {
  const options = years.includes(year) ? years : [...years, year].sort((a, b) => a - b);
  const values = seriesForMonths(months);

  return (
    <article className="admin-dashboard-card">
      <header className="admin-dashboard-card-head">
        <div>
          <h2>Ingresos por año</h2>
          <p>Ingresos mensuales por categoría (membresías, cursos, reservaciones)</p>
        </div>
        <div className="admin-dashboard-inline-tools">
          <select
            aria-label="Seleccione el año"
            onChange={(event) => onYearChange(Number(event.target.value))}
            value={year}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <button
            aria-label="Descargar ingresos"
            className="admin-dashboard-ghost"
            disabled={downloading}
            onClick={onDownload}
            type="button"
          >
            <DownloadIcon />
          </button>
        </div>
      </header>
      <DashboardLineChart
        compact
        formatY={formatUsd}
        labels={MONTH_LABELS}
        series={[
          { label: "Membresías", color: SERIES_COLORS.memberships, values: values.memberships },
          { label: "Cursos", color: SERIES_COLORS.courses, values: values.courses },
          { label: "Reservaciones", color: SERIES_COLORS.reservations, values: values.reservations },
        ]}
      />
      <ul className="admin-dashboard-legend">
        <li>
          <i style={{ background: SERIES_COLORS.memberships }} />
          Membresías
        </li>
        <li>
          <i style={{ background: SERIES_COLORS.courses }} />
          Cursos
        </li>
        <li>
          <i style={{ background: SERIES_COLORS.reservations }} />
          Reservaciones
        </li>
      </ul>
    </article>
  );
}