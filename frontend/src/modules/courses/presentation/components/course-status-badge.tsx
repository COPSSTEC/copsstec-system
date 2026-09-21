import type { AdminCourse } from "@/modules/courses/domain/types";
import { courseStatus, courseStatusLabel } from "@/modules/courses/presentation/lib/course-admin";

interface CourseStatusBadgeProps {
  course: AdminCourse;
}

export function CourseStatusBadge({ course }: CourseStatusBadgeProps) {
  const status = courseStatus(course);

  return (
    <span className={`course-status-badge is-${status}`}>
      <i />
      {courseStatusLabel(course)}
    </span>
  );
}
