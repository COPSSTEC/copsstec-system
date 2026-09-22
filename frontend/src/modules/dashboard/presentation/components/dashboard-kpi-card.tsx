"use client";

import type { ReactNode } from "react";

import { DashboardSparkline } from "@/modules/dashboard/presentation/components/dashboard-sparkline";

interface DashboardKpiCardProps {
  title: string;
  value: string;
  hint: string;
  hintTone?: "up" | "down" | "neutral";
  icon: ReactNode;
  tone: "blue" | "red" | "purple" | "green" | "amber";
  sparkline: number[];
}

export function DashboardKpiCard({
  title,
  value,
  hint,
  hintTone = "neutral",
  icon,
  tone,
  sparkline,
}: DashboardKpiCardProps) {
  const sparkColor =
    tone === "red" ? "#ef4444" : tone === "purple" ? "#8b5cf6" : tone === "green" ? "#22c55e" : tone === "amber" ? "#f59e0b" : "#3b82f6";

  return (
    <article className={`admin-dashboard-kpi is-${tone}`}>
      <div className="admin-dashboard-kpi-top">
        <span className="admin-dashboard-kpi-icon">{icon}</span>
        <span>{title}</span>
      </div>
      <strong>{value}</strong>
      <div className="admin-dashboard-kpi-foot">
        <p className={`admin-dashboard-hint is-${hintTone}`}>{hint}</p>
        <DashboardSparkline color={sparkColor} values={sparkline} />
      </div>
    </article>
  );
}