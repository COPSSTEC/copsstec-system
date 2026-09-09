interface StatCardProps {
  title: string;
  value: string;
  description: string;
}

export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <article className="card">
      <span className="muted">{title}</span>
      <p className="stat-value">{value}</p>
      <p className="muted">{description}</p>
    </article>
  );
}
