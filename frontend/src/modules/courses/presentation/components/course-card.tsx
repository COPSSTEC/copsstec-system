import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";
import { CourseCover } from "@/modules/courses/presentation/components/course-cover";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import {
  courseScheduleLabel,
  courseScheduleState,
  formatCourseDates,
  formatCoursePrice,
} from "@/modules/courses/presentation/lib/public-courses";

interface CourseCardProps {
  course: Course;
}

export function CourseCard({ course }: CourseCardProps) {
  const schedule = courseScheduleState(course);

  return (
    <article className="course-card">
      <CourseCover image={course.image} title={course.title} />
      <div className="course-card-body">
        <div className="course-meta">
          <span>{course.type_modality ?? "Modalidad por confirmar"}</span>
          <strong>{formatCoursePrice(course.value)}</strong>
        </div>
        <span className={`course-schedule-badge is-${schedule}`}>{courseScheduleLabel(schedule)}</span>
        <h3>{course.title}</h3>
        <p className="muted course-card-about">{course.about}</p>
        <ul className="course-card-facts">
          <li>
            <CourseUiIcon name="calendar" />
            <span>{formatCourseDates(course)}</span>
          </li>
          <li>
            <CourseUiIcon name="clock" />
            <span>
              {course.hour_init} a {course.hour_final}
            </span>
          </li>
          <li>
            <CourseUiIcon name="user" />
            <span>{course.capacitator}</span>
          </li>
        </ul>
        <Link className="primary-button button-link" href={`/cursos/${course.id}`}>
          Ver detalle e inscribirme
        </Link>
      </div>
    </article>
  );
}
