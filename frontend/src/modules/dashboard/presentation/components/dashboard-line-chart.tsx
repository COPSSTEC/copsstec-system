export interface DashboardLineSeries {
  label: string;
  color: string;
  values: number[];
}

interface DashboardLineChartProps {
  series: DashboardLineSeries[];
  labels: string[];
  formatY?: (value: number) => string;
  compact?: boolean;
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

function toPath(points: Array<{ x: number; y: number }>): string {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function DashboardLineChart({
  series,
  labels,
  formatY = (value) => String(value),
  compact = false,
}: DashboardLineChartProps) {
  const width = 640;
  const height = compact ? 176 : 280;
  const pad = compact
    ? { top: 10, right: 12, bottom: 26, left: 46 }
    : { top: 18, right: 18, bottom: 36, left: 58 };
  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const maxValue = Math.max(...series.flatMap((item) => item.values), 0);
  const niceMax = niceCeil(maxValue);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => niceMax * ratio);
  const pointCount = labels.length;

  function xAt(index: number): number {
    if (pointCount <= 1) {
      return pad.left + innerWidth / 2;
    }
    return pad.left + (index / (pointCount - 1)) * innerWidth;
  }

  function yAt(value: number): number {
    return pad.top + innerHeight - (value / niceMax) * innerHeight;
  }

  return (
    <svg
      aria-label="Gráfico de líneas"
      className={`admin-dashboard-svg${compact ? " is-compact" : ""}`}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
    >
      {ticks.map((tick) => {
        const y = yAt(tick);
        return (
          <g key={`line-tick-${tick}`}>
            <line stroke="#eef2f7" x1={pad.left} x2={width - pad.right} y1={y} y2={y} />
            <text fill="#94a3b8" fontSize={compact ? "10" : "11"} textAnchor="end" x={pad.left - 6} y={y + 3}>
              {formatY(tick)}
            </text>
          </g>
        );
      })}
      {labels.map((label, index) => (
        <text
          fill="#64748b"
          fontSize={compact ? "10" : "11"}
          key={label}
          textAnchor="middle"
          x={xAt(index)}
          y={height - 10}
        >
          {label}
        </text>
      ))}
      {series.map((item) => {
        const points = item.values.map((value, index) => ({ x: xAt(index), y: yAt(value) }));
        const line = toPath(points);
        const area = `${line} L ${xAt(pointCount - 1)} ${pad.top + innerHeight} L ${xAt(0)} ${pad.top + innerHeight} Z`;

        return (
          <g key={item.label}>
            <path d={area} fill={item.color} fillOpacity="0.12" />
            <path d={line} fill="none" stroke={item.color} strokeLinecap="round" strokeWidth={compact ? "2" : "2.5"} />
            {points.map((point, index) => (
              <circle cx={point.x} cy={point.y} fill={item.color} key={`${item.label}-${index}`} r={compact ? 2 : 3}>
                <title>
                  {item.label} {labels[index]}: {formatY(item.values[index] ?? 0)}
                </title>
              </circle>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
