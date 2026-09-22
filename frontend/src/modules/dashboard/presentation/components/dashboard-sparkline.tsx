interface DashboardSparklineProps {
  values: number[];
  color: string;
}

export function DashboardSparkline({ values, color }: DashboardSparklineProps) {
  const width = 72;
  const height = 22;
  const safe = values.length > 0 ? values : [0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const span = max - min || 1;

  const points = safe.map((value, index) => {
    const x = safe.length === 1 ? width / 2 : (index / (safe.length - 1)) * width;
    const y = height - ((value - min) / span) * (height - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <svg aria-hidden="true" className="admin-dashboard-sparkline" height={height} viewBox={`0 0 ${width} ${height}`} width={width}>
      <polyline fill="none" points={points.join(" ")} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}