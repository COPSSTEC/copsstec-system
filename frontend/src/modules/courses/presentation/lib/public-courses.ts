import type { Course } from "@/modules/courses/domain/types";

export type CourseScheduleState = "upcoming" | "ongoing" | "finished";

export function parseCourseDate(value: string): Date | null {
  const text = value.trim();
  if (!text) {
    return null;
  }

  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }

  const dmy = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/);
  if (dmy) {
    return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function courseScheduleState(course: Course): CourseScheduleState {
  if (course.finished_at) {
    return "finished";
  }

  const start = parseCourseDate(course.date_course);
  const end = parseCourseDate(course.date_course_final) ?? start;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (end && end < today) {
    return "finished";
  }

  if (start && start > today) {
    return "upcoming";
  }

  return "ongoing";
}

export function courseScheduleLabel(state: CourseScheduleState): string {
  if (state === "upcoming") {
    return "Próximo";
  }

  if (state === "ongoing") {
    return "En curso";
  }

  return "Finalizado";
}

export function isPaidCourse(course: Course): boolean {
  const amount = Number(String(course.value).replace(",", "."));
  return Number.isFinite(amount) && amount > 0;
}

export function formatCoursePrice(value: string): string {
  const amount = Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) {
    return "Gratis";
  }

  return `$${amount.toFixed(2)}`;
}

export function formatCourseDates(course: Course): string {
  if (!course.date_course) {
    return "Fecha por confirmar";
  }

  if (!course.date_course_final || course.date_course_final === course.date_course) {
    return course.date_course;
  }

  return `${course.date_course} – ${course.date_course_final}`;
}

export function matchesPublicCourseFilters(
  course: Course,
  filters: {
    query: string;
    dateFrom: string;
    dateTo: string;
    schedule: string;
    price: string;
    modality: string;
  },
): boolean {
  const term = filters.query.trim().toLowerCase();
  if (
    term &&
    ![course.title, course.about, course.capacitator, course.location, course.type_modality ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(term)
  ) {
    return false;
  }

  if (filters.schedule && courseScheduleState(course) !== filters.schedule) {
    return false;
  }

  if (filters.price === "free" && isPaidCourse(course)) {
    return false;
  }

  if (filters.price === "paid" && !isPaidCourse(course)) {
    return false;
  }

  if (filters.modality && (course.type_modality ?? "") !== filters.modality) {
    return false;
  }

  const start = parseCourseDate(course.date_course);
  const end = parseCourseDate(course.date_course_final) ?? start;
  const from = parseCourseDate(filters.dateFrom);
  const to = parseCourseDate(filters.dateTo);

  if (from && end && end < from) {
    return false;
  }

  if (to && start && start > to) {
    return false;
  }

  return true;
}
