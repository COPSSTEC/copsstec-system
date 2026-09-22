import type { MemberCourse } from "@/modules/courses/domain/types";
import { CourseCover } from "@/modules/courses/presentation/components/course-cover";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import {
  courseCategoryLabel,
  formatMemberDateRange,
  formatMemberTimeRange,
  isCourseActive,
  isMemberEnrolled,
} from "@/modules/courses/presentation/lib/member-courses";

interface MemberCourseCardProps {
  course: MemberCourse;
  isSelected: boolean;
  onSelect: () => void;
  onEnroll?: () => void;
}

export function MemberCourseCard({ course, isSelected, onSelect, onEnroll }: MemberCourseCardProps) {
  const enrolled = isMemberEnrolled(course);
  const active = isCourseActive(course);

  return (
    <article
      className={`member-course-card ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
    >
      <div className="member-course-card-media">
        <CourseCover image={course.image} title={course.title} />
        <span className={`member-course-chip ${enrolled ? (active ? "is-active" : "is-finished") : "is-modality"}`}>
          {enrolled ? (
            <>
              <CourseUiIcon name="checkCircle" />
              {active ? "Activo" : "Finalizado"}
            </>
          ) : (
            course.type_modality || "Online"
          )}
        </span>
        <span className={`member-course-chip is-status ${enrolled ? "is-enrolled" : "is-available"}`}>
          {enrolled ? "Inscrito" : "Disponible"}
        </span>
      </div>

      <div className="member-course-card-body">
        <h3>{course.title}</h3>
        <ul className="member-course-facts">
          <li>
            <CourseUiIcon name="calendar" />
            <span>{formatMemberDateRange(course)}</span>
          </li>
          <li>
            <CourseUiIcon name="clock" />
            <span>{formatMemberTimeRange(course)}</span>
          </li>
          <li>
            <CourseUiIcon name="globe" />
            <span>{course.type_modality || "Online"}</span>
          </li>
          <li>
            <CourseUiIcon name="user" />
            <span>{course.capacitator || "Por confirmar"}</span>
          </li>
          <li>
            <CourseUiIcon name="tag" />
            <span>{courseCategoryLabel(course)}</span>
          </li>
        </ul>

        {enrolled || !onEnroll ? (
          <button className="member-course-outline-btn" onClick={onSelect} type="button">
            Ver detalle
            <CourseUiIcon name="arrow" />
          </button>
        ) : (
          <button
            className="primary-button"
            onClick={(event) => {
              event.stopPropagation();
              onEnroll();
            }}
            type="button"
          >
            Inscribirme
          </button>
        )}
      </div>
    </article>
  );
}
