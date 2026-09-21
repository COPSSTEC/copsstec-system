import type { AdminCourse } from "@/modules/courses/domain/types";
import { CourseStatusBadge } from "@/modules/courses/presentation/components/course-status-badge";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";

interface AdminCourseCardProps {
  course: AdminCourse;
  selected: boolean;
  onSelect: (courseId: number) => void;
}

export function AdminCourseCard({ course, selected, onSelect }: AdminCourseCardProps) {
  return (
    <article className={`admin-course-card${selected ? " is-selected" : ""}`}>
      <header>
        <h3>{course.title}</h3>
        <CourseStatusBadge course={course} />
      </header>
      <p className="admin-course-card-meta">
        <span>
          Inscritos <strong>{course.inscriptions_count}</strong>
        </span>
        <span>
          Asistentes <strong>{course.attendees_count}</strong>
        </span>
      </p>
      <button onClick={() => onSelect(course.id)} type="button">
        Ver panel
        <CourseUiIcon name="arrow" />
      </button>
    </article>
  );
}
