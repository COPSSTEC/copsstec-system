import type { Course, MemberCourse } from "@/modules/courses/domain/types";
import { courseScheduleState, parseCourseDate } from "@/modules/courses/presentation/lib/public-courses";

export const MEMBER_COURSE_PREVIEW = 3;

export const COURSE_CATEGORIES = [
  { id: "legislacion", label: "Legislación y normativa" },
  { id: "salud", label: "Salud ocupacional" },
  { id: "innovacion", label: "Innovación y tecnología" },
  { id: "ambiente", label: "Medio ambiente" },
  { id: "formacion", label: "Formación profesional" },
] as const;

const CATEGORY_KEYWORDS: Record<(typeof COURSE_CATEGORIES)[number]["id"], string[]> = {
  legislacion: ["responsabilidad", "patronal", "normativ", "legal", "legisl", "sso"],
  salud: ["ergonom", "salud", "postura", "ocupacional", "prevencion", "vigilancia"],
  innovacion: ["inteligencia", "artificial", "tecnolog", "industria", "innov"],
  ambiente: ["ambiental", "ambiente", "sostenib", "ecolog"],
  formacion: [],
};

export type MemberCourseFilter = "enrolled" | "available" | "all";
export type MemberCoursePanelTab = "materials" | "schedule" | "more";

export function isMemberEnrolled(course: MemberCourse): boolean {
  return course.inscription_id !== null;
}

export function canDownloadCertificate(course: MemberCourse): boolean {
  return isMemberEnrolled(course) && Boolean(course.attended_at);
}

export function isCourseActive(course: Course): boolean {
  return courseScheduleState(course) !== "finished";
}

export function courseCategoryId(course: Course): (typeof COURSE_CATEGORIES)[number]["id"] {
  const haystack = `${course.title} ${course.about}`.toLowerCase();

  for (const category of COURSE_CATEGORIES) {
    if (category.id === "formacion") {
      continue;
    }

    if (CATEGORY_KEYWORDS[category.id].some((keyword) => haystack.includes(keyword))) {
      return category.id;
    }
  }

  return "formacion";
}

export function courseCategoryLabel(course: Course): string {
  const id = courseCategoryId(course);
  return COURSE_CATEGORIES.find((category) => category.id === id)?.label ?? "Formación profesional";
}

export function formatMemberDate(value: string): string {
  const parsed = parseCourseDate(value);
  if (!parsed) {
    return value?.trim() || "Fecha por confirmar";
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${parsed.getFullYear()}`;
}

export function formatMemberDateRange(course: Course): string {
  const start = formatMemberDate(course.date_course);
  if (!course.date_course_final || course.date_course_final === course.date_course) {
    return start;
  }

  return `${start} – ${formatMemberDate(course.date_course_final)}`;
}

export function formatMemberTime(value: string): string {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return value || "--:--";
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

export function formatMemberTimeRange(course: Course): string {
  return `${formatMemberTime(course.hour_init)} a ${formatMemberTime(course.hour_final)}`;
}

function timeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function courseDurationLabel(course: Course): string {
  const start = timeToMinutes(course.hour_init);
  const end = timeToMinutes(course.hour_final);
  if (start === null || end === null) {
    return "Por confirmar";
  }

  let diff = end - start;
  if (diff === 0) {
    return "Por confirmar";
  }
  if (diff < 0) {
    diff += 24 * 60;
  }

  const hours = Math.max(1, Math.round(diff / 60));
  return hours === 1 ? "1 hora" : `${hours} horas`;
}

export function matchesMemberCourseFilters(
  course: MemberCourse,
  filters: { query: string; category: string },
): boolean {
  const term = filters.query.trim().toLowerCase();
  if (
    term &&
    ![
      course.title,
      course.about,
      course.capacitator,
      course.location,
      course.type_modality ?? "",
      courseCategoryLabel(course),
    ]
      .join(" ")
      .toLowerCase()
      .includes(term)
  ) {
    return false;
  }

  if (filters.category && courseCategoryId(course) !== filters.category) {
    return false;
  }

  return true;
}

export function visibleCategories(courses: MemberCourse[]): Array<(typeof COURSE_CATEGORIES)[number]> {
  const used = new Set(courses.map((course) => courseCategoryId(course)));
  return COURSE_CATEGORIES.filter((category) => used.has(category.id));
}
