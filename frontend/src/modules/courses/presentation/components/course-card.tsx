import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";

interface CourseCardProps {
  course: Course;
}

function formatPrice(value: string): string {
  const amount = Number(value.replace(",", "."));

  if (!Number.isFinite(amount) || amount === 0) {
    return "Gratis";
  }

  return `$${amount.toFixed(2)}`;
}

export function CourseCard({ course }: CourseCardProps) {
  return (
    <article className="course-card">
      <div className="course-image" style={{ backgroundImage: `url(${course.image})` }} />
      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.type_modality ?? "Modalidad por confirmar"}</span>
          <strong>{formatPrice(course.value)}</strong>
        </div>
        <h3>{course.title}</h3>
        <p className="muted">{course.about}</p>
        <p>
          {course.date_course}
          {course.date_course_final !== course.date_course ? ` - ${course.date_course_final}` : ""} ·{" "}
          {course.hour_init} a {course.hour_final}
        </p>
        <p className="muted">Capacitador: {course.capacitator}</p>
        <Link className="primary-button button-link" href={`/cursos/${course.id}`}>
          Ver detalle e inscribirme
        </Link>
      </div>
    </article>
  );
}
