import type { DashboardCountItem } from "@/modules/dashboard/domain/types";

export const DEMOGRAPHIC_COLORS = [
  "#3b82f6",
  "#f9a8d4",
  "#cbd5e1",
  "#22c55e",
  "#a855f7",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#14b8a6",
  "#8b5cf6",
];

interface DashboardBarChartProps {
  items: DashboardCountItem[];
  colors?: string[];
  compact?: boolean;
  emptyLabel?: string;
}

function niceCeil(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
}

function displayLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return "Sin dato";
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function DashboardBarChart({
  items,
  colors = DEMOGRAPHIC_COLORS,
  compact = false,
  emptyLabel = "No hay datos para mostrar.",
}: DashboardBarChartProps) {
  if (items.length === 0) {
    return <p className="admin-dashboard-empty">{emptyLabel}</p>;
  }

  const maxValue = Math.max(...items.map((item) => item.count), 0);
  const niceMax = niceCeil(maxValue);
  const ticks = compact ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  const many = items.length > 6;
  const barSlot = compact ? (many ? 28 : items.length <= 2 ? 72 : 48) : many ? 36 : items.length <= 2 ? 120 : 72;
  const pad = compact
    ? { top: 18, right: 8, bottom: many ? 46 : 28, left: 32 }
    : { top: 28, right: 16, bottom: many ? 68 : 42, left: 44 };
  const innerWidth = Math.max(items.length * barSlot, compact ? 180 : 280);
  const width = pad.left + pad.right + innerWidth;
  const height = compact ? 168 : 268;
  const plotHeight = height - pad.top - pad.bottom;
  const gap = compact ? 10 : many ? 8 : 20;
  const barWidth = Math.max(
    compact ? 18 : 10,
    Math.min(compact ? 36 : many ? 22 : 72, (innerWidth - gap * items.length) / items.length),
  );

  return (
    <div className={`admin-dashboard-chart-scroll${compact ? " is-compact" : ""}`}>
      <svg
        aria-label="Gráfico de barras"
        className="admin-dashboard-svg"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
      >
        {ticks.map((ratio) => {
          const tick = Math.round(niceMax * ratio);
          const y = pad.top + plotHeight - (tick / niceMax) * plotHeight;
          return (
            <g key={`tick-${tick}`}>
              <line stroke="#eef2f7" x1={pad.left} x2={width - pad.right} y1={y} y2={y} />
              <text fill="#94a3b8" fontSize={compact ? "10" : "11"} textAnchor="end" x={pad.left - 6} y={y + 3}>
                {tick}
              </text>
            </g>
          );
        })}
        {items.map((item, index) => {
          const slot = innerWidth / items.length;
          const x = pad.left + slot * index + (slot - barWidth) / 2;
          const barHeight = item.count === 0 ? 2 : (item.count / niceMax) * plotHeight;
          const y = pad.top + plotHeight - barHeight;
          const color = colors[index % colors.length];
          const labelY = height - (many ? 34 : 10);
          const visibleLabel = displayLabel(item.label);
          const truncated = visibleLabel.length > 12 ? `${visibleLabel.slice(0, 11)}…` : visibleLabel;

          return (
            <g key={`${item.label}-${index}`}>
              <rect fill={color} height={barHeight} rx="6" width={barWidth} x={x} y={y} />
              <text
                fill="#334155"
                fontSize={compact ? "10" : "11"}
                fontWeight="700"
                textAnchor="middle"
                x={x + barWidth / 2}
                y={Math.max(pad.top + 10, y - 5)}
              >
                {item.count}
              </text>
              <text
                fill="#64748b"
                fontSize="10"
                textAnchor={many ? "end" : "middle"}
                transform={many ? `rotate(-36 ${x + barWidth / 2} ${labelY})` : undefined}
                x={x + barWidth / 2}
                y={labelY}
              >
                <title>{visibleLabel}</title>
                {truncated}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}