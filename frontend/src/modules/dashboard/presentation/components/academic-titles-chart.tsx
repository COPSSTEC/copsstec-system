"use client";

import type { DashboardTitles } from "@/modules/dashboard/domain/types";
import { DashboardBarChart } from "@/modules/dashboard/presentation/components/dashboard-bar-chart";
import { DownloadIcon } from "@/modules/dashboard/presentation/components/dashboard-icons";

interface AcademicTitlesChartProps {
  titles: DashboardTitles;
  downloading?: boolean;
  onDownload: () => void;
}

export function AcademicTitlesChart({
  titles,
  downloading = false,
  onDownload,
}: AcademicTitlesChartProps) {
  const topItems = titles.top_third.slice(0, 6);

  return (
    <article className="admin-dashboard-card">
      <header className="admin-dashboard-card-head">
        <div>
          <h2>Distribución por título académico</h2>
          <p>Miembros habilitados según título de tercer nivel, cuarto nivel o ambos</p>
        </div>
        <button
          aria-label="Descargar títulos"
          className="admin-dashboard-ghost"
          disabled={downloading}
          onClick={onDownload}
          type="button"
        >
          <DownloadIcon />
        </button>
      </header>
      <DashboardBarChart
        colors={["#3b82f6", "#8b5cf6", "#14b8a6", "#cbd5e1"]}
        compact
        items={[
          { label: "Tercer nivel", count: titles.third_level },
          { label: "Cuarto nivel", count: titles.fourth_level },
          { label: "Ambos", count: titles.both },
          { label: "Sin título", count: titles.none },
        ]}
      />
      <div className="admin-dashboard-title-mini">
        <h3>Top títulos de tercer nivel</h3>
        {topItems.length === 0 ? (
          <p className="admin-dashboard-empty">Sin títulos registrados.</p>
        ) : (
          <ol>
            {topItems.map((item, index) => (
              <li key={item.label}>
                <span>{index + 1}</span>
                <em>{item.label}</em>
                <strong>{item.count}</strong>
              </li>
            ))}
          </ol>
        )}
      </div>
    </article>
  );
}