import { BRAND_MEDIA } from "@/config/brand-media";
import type { AdminCourse, CourseFormInput, CourseInscription } from "@/modules/courses/domain/types";

export const EMPTY_COURSE: CourseFormInput = {
  state_id: 4,
  title: "",
  value: "0",
  location: "",
  capacitator: "",
  capacitator_about: "",
  date_course: "",
  date_course_final: "",
  hour_init: "",
  hour_final: "",
  about: "",
  image: "",
  type_modality: "Online",
  link: "",
};

export function stateLabel(stateId: number | null): string {
  const labels: Record<number, string> = {
    4: "Visible",
    5: "Oculto",
    7: "Rechazado",
    8: "Por aprobar",
    9: "Inscrito",
    11: "Asistió",
    14: "Pagado",
    15: "Enviado",
  };

  return stateId ? labels[stateId] ?? `Estado ${stateId}` : "Sin estado";
}

export function courseStatus(course: AdminCourse): "visible" | "hidden" | "finished" {
  if (course.finished_at) {
    return "finished";
  }

  return course.state_id === 4 ? "visible" : "hidden";
}

export function courseStatusLabel(course: AdminCourse): string {
  if (course.finished_at) {
    return "Finalizado";
  }

  return stateLabel(course.state_id);
}

export function attendanceRate(course: AdminCourse): number {
  if (course.inscriptions_count === 0) {
    return 0;
  }

  return Math.round((course.attendees_count / course.inscriptions_count) * 100);
}

export function courseToForm(course: AdminCourse): CourseFormInput {
  return {
    state_id: course.state_id,
    title: course.title,
    value: course.value,
    location: course.location,
    capacitator: course.capacitator,
    capacitator_about: course.capacitator_about,
    date_course: course.date_course,
    date_course_final: course.date_course_final,
    hour_init: course.hour_init,
    hour_final: course.hour_final,
    about: course.about,
    image: course.image,
    type_modality: course.type_modality,
    link: course.link,
  };
}

export function matchesCourseQuery(course: AdminCourse, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [course.title, course.location, course.capacitator, course.type_modality ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export function matchesInscriptionQuery(inscription: CourseInscription, query: string): boolean {
  const term = query.trim().toLowerCase();
  if (!term) {
    return true;
  }

  return [inscription.names, inscription.lastname ?? "", inscription.email, inscription.identifier]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export function feedbackStatus(inscription: CourseInscription): "pending" | "sent" | "answered" {
  if (inscription.feedback_used_at) {
    return "answered";
  }

  if (inscription.feedback_sent_at) {
    return "sent";
  }

  return "pending";
}

export function feedbackStatusLabel(inscription: CourseInscription): string {
  const status = feedbackStatus(inscription);
  if (status === "answered") {
    return "Respondida";
  }

  if (status === "sent") {
    return "Enviada";
  }

  return "Pendiente";
}

export function memberDisplayName(member: {
  name: string;
  names: string | null;
  lastname: string | null;
}): string {
  const full = [member.names, member.lastname].filter(Boolean).join(" ").trim();
  return full || member.name;
}

export function formatCoursePrice(value: string): string {
  const amount = Number(String(value).replace(",", "."));
  if (!Number.isFinite(amount) || amount === 0) {
    return "0 USD";
  }

  return `${amount.toFixed(2)} USD`;
}

export function initialsFromName(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? parts[0]?.[1] ?? ""}`.toUpperCase() || "CS";
}

export function normalizeCourseForm(form: CourseFormInput): CourseFormInput {
  return {
    ...form,
    title: form.title.trim() || "Título del curso",
    location: form.location.trim() || "Virtual / Presencial",
    capacitator: form.capacitator.trim() || "Por confirmar",
    capacitator_about: form.capacitator_about.trim() || "Información del capacitador pendiente.",
    about: form.about.trim() || "Descripción del curso, objetivos y contenido.",
    image: form.image.trim() || BRAND_MEDIA.logoLong,
    type_modality: form.type_modality?.trim() || "Online",
    date_course: form.date_course.trim() || "Por confirmar",
    date_course_final: form.date_course_final.trim() || form.date_course.trim() || "Por confirmar",
    hour_init: form.hour_init.trim() || "08:00",
    hour_final: form.hour_final.trim() || "17:00",
    value: form.value.trim() || "0",
  };
}

export function percentOf(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export interface InscriptionFilters {
  state: string;
  attendance: string;
  payment: string;
  certificate: string;
}

export const EMPTY_INSCRIPTION_FILTERS: InscriptionFilters = {
  state: "",
  attendance: "",
  payment: "",
  certificate: "",
};

export function matchesInscriptionFilters(
  inscription: CourseInscription,
  filters: InscriptionFilters,
): boolean {
  if (filters.state && String(inscription.state_id) !== filters.state) {
    return false;
  }

  if (filters.attendance === "yes" && !inscription.attended_at) {
    return false;
  }

  if (filters.attendance === "no" && inscription.attended_at) {
    return false;
  }

  if (filters.payment && String(inscription.payment_state_id ?? "") !== filters.payment) {
    return false;
  }

  if (filters.certificate === "yes" && !inscription.certificate_id) {
    return false;
  }

  if (filters.certificate === "no" && inscription.certificate_id) {
    return false;
  }

  return true;
}
