interface CourseDonutProps {
  value: number;
  total: number;
  label: string;
  tone?: "primary" | "success" | "warning" | "danger";
}

export function CourseDonut({ value, total, label, tone = "primary" }: CourseDonutProps) {
  const percent = total <= 0 ? 0 : Math.round((value / total) * 100);
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(percent, 100) / 100) * circumference;

  return (
    <article className={`course-donut is-${tone}`}>
      <svg aria-hidden="true" viewBox="0 0 44 44">
        <circle className="course-donut-track" cx="22" cy="22" r={radius} />
        <circle
          className="course-donut-fill"
          cx="22"
          cy="22"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <em>{percent}%</em>
      </div>
    </article>
  );
}
