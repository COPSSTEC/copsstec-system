"use client";

import { useState } from "react";

import type { DashboardDemographics, DashboardExportKey } from "@/modules/dashboard/domain/types";
import { DashboardBarChart, DEMOGRAPHIC_COLORS } from "@/modules/dashboard/presentation/components/dashboard-bar-chart";
import { DownloadIcon } from "@/modules/dashboard/presentation/components/dashboard-icons";

const TABS = [
  { key: "gender", label: "Género", exportKey: "gender" },
  { key: "province", label: "Provincia", exportKey: "province" },
  { key: "city", label: "Ciudad", exportKey: "city" },
  { key: "age_range", label: "Edad", exportKey: "age" },
  { key: "blood_type", label: "Tipo de sangre", exportKey: "blood_type" },
  { key: "profile_type", label: "Tipo de perfil", exportKey: "profile_type" },
] as const;

type DemographicTab = (typeof TABS)[number]["key"];

interface DemographicsPanelProps {
  demographics: DashboardDemographics;
  downloading?: DashboardExportKey | null;
  onDownload: (key: DashboardExportKey) => void;
}

export function DemographicsPanel({
  demographics,
  downloading = null,
  onDownload,
}: DemographicsPanelProps) {
  const [tab, setTab] = useState<DemographicTab>("gender");
  const active = TABS.find((item) => item.key === tab) ?? TABS[0];
  const items = demographics[active.key] ?? [];
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const isDownloading = downloading === active.exportKey;

  return (
    <article className="admin-dashboard-card">
      <header className="admin-dashboard-card-head">
        <div>
          <h2>Distribución por {active.label.toLowerCase()}</h2>
          <p>Miembros habilitados por {active.label.toLowerCase()}</p>
        </div>
        <div className="admin-dashboard-inline-tools">
          <select
            aria-label="Dimensión demográfica"
            onChange={(event) => setTab(event.target.value as DemographicTab)}
            value={tab}
          >
            {TABS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            aria-label={`Descargar ${active.label}`}
            className="admin-dashboard-ghost"
            disabled={isDownloading}
            onClick={() => onDownload(active.exportKey)}
            type="button"
          >
            <DownloadIcon />
          </button>
        </div>
      </header>
      <div className="admin-dashboard-split">
        <DashboardBarChart compact items={items} />
        <ul className="admin-dashboard-percent-list">
          {items.slice(0, 6).map((item, index) => {
            const percent = total > 0 ? ((item.count / total) * 100).toFixed(1) : "0.0";
            return (
              <li key={`${item.label}-${index}`}>
                <i style={{ background: DEMOGRAPHIC_COLORS[index % DEMOGRAPHIC_COLORS.length] }} />
                <span>{item.label}</span>
                <strong>
                  {item.count.toLocaleString("es-EC")}
                  <em>{percent}%</em>
                </strong>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}