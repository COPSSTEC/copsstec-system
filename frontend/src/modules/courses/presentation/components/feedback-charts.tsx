const SCORE_LABELS = ["Muy mala", "Mala", "Regular", "Buena", "Excelente"] as const;
const SCORE_COLORS = ["#b91c1c", "#c2410c", "#d97706", "#047857", "#1d4ed8"] as const;
const TONE_COLORS = {
  primary: "#1d4ed8",
  success: "#047857",
  warning: "#d97706",
  danger: "#b91c1c",
} as const;

interface FeedbackDonutProps {
  percent: number;
  center: string;
  label: string;
  hint?: string;
  tone?: keyof typeof TONE_COLORS;
}

export function FeedbackDonut({
  percent,
  center,
  label,
  hint,
  tone = "primary",
}: FeedbackDonutProps) {
  const clamped = Math.max(0, Math.min(percent, 100));
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <article className={`feedback-donut is-${tone}`}>
      <div className="feedback-donut-ring">
        <svg aria-hidden="true" viewBox="0 0 88 88">
          <circle className="feedback-donut-track" cx="44" cy="44" r={radius} />
          <circle
            className="feedback-donut-fill"
            cx="44"
            cy="44"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <strong>{center}</strong>
      </div>
      <span>{label}</span>
      {hint ? <em>{hint}</em> : null}
    </article>
  );
}

interface FeedbackBarChartProps {
  title: string;
  average: number | null;
  counts: number[];
}

export function FeedbackBarChart({ title, average, counts }: FeedbackBarChartProps) {
  const max = Math.max(...counts, 1);
  const values = [1, 2, 3, 4, 5].map((score) => counts[score - 1] ?? 0);

  return (
    <article className="feedback-bar-chart">
      <header>
        <h3>{title}</h3>
        <strong>{average === null ? "—" : `${average.toFixed(2)} / 5`}</strong>
      </header>
      <svg aria-hidden="true" className="feedback-bar-plot" viewBox="0 0 260 168">
        {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
          const y = 132 - tick * 112;
          return <line key={tick} stroke="#e2e8f0" x1="28" x2="250" y1={y} y2={y} />;
        })}
        {values.map((count, index) => {
          const height = (count / max) * 112;
          const x = 40 + index * 42;
          return (
            <g key={SCORE_LABELS[index]}>
              <rect fill={SCORE_COLORS[index]} height={Math.max(height, 2)} rx="6" width="26" x={x} y={132 - height} />
              <text fill="#64748b" fontSize="10" textAnchor="middle" x={x + 13} y="148">
                {index + 1}
              </text>
              <text fill="#172033" fontSize="11" fontWeight="700" textAnchor="middle" x={x + 13} y={124 - height}>
                {count}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="feedback-bar-legend">
        {SCORE_LABELS.map((label, index) => (
          <li key={label}>
            <i style={{ background: SCORE_COLORS[index] }} />
            {index + 1} {label}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function scoreCounts(distribution: Record<string, number> | undefined): number[] {
  return [1, 2, 3, 4, 5].map((score) =>
    Number(distribution?.[String(score)] ?? distribution?.[score as unknown as string] ?? 0),
  );
}
