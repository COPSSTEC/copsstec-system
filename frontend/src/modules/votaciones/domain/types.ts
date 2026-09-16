export type ElectionStatus =
  | "en_preparacion"
  | "publicada"
  | "en_votacion"
  | "cerrada"
  | "finalizada";

export type ListStatus = "borrador" | "activa" | "suspendida" | "retirada";
export type ElectionType = "lista_completa" | "voto_por_cargos";

export interface GuideStep {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

export interface ElectionPeriod {
  id: number;
  title: string;
  status: ElectionStatus;
  voting_starts_on: string | null;
  voting_ends_on: string | null;
  term_starts_on: string | null;
  term_ends_on: string | null;
  is_open: boolean;
}

export interface ElectionPosition {
  id: number;
  election_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  photo_required: boolean;
  full_name_required: boolean;
  short_profile_required: boolean;
  profession_required: boolean;
  visible_to_members: boolean;
}

export interface CalendarEvent {
  id: number;
  event_key: string;
  title: string;
  starts_on: string | null;
  ends_on: string | null;
  sort_order: number;
}

export interface MessageTemplate {
  id: number;
  template_key: string;
  title: string;
  subject: string;
  body: string;
  channel_email: boolean;
  channel_portal: boolean;
  channel_internal: boolean;
  scheduled_at: string | null;
  last_sent_at: string | null;
}

export interface MessageDelivery {
  template_key: string;
  scheduled_at: string | null;
  last_sent_at: string | null;
  total: number;
  sent: number;
  pending: number;
  failed: number;
}

export interface ElectionCandidate {
  id: number;
  list_id: number;
  position_id: number;
  position_name: string;
  full_name: string;
  profession: string;
  short_profile: string;
  photo_url: string | null;
  sort_order: number;
}

export interface ElectionList {
  id: number;
  election_id: number;
  name: string;
  slogan: string;
  color: string | null;
  logo_url: string | null;
  description: string;
  work_plan_url: string | null;
  work_plan_summary: string;
  backing_document_url: string | null;
  status: ListStatus;
  sort_order: number;
  candidates: ElectionCandidate[];
}

export interface Election {
  id: number;
  title: string;
  subtitle: string;
  tagline: string;
  status: ElectionStatus;
  voting_starts_on: string | null;
  voting_ends_on: string | null;
  term_starts_on: string | null;
  term_ends_on: string | null;
  calendar_public: boolean;
  work_plan_required: boolean;
  photo_required: boolean;
  accept_position_required: boolean;
  list_logo_enabled: boolean;
  list_color_required: boolean;
  backing_document_required: boolean;
  registration_deadline: string | null;
  max_file_mb: number;
  show_work_plan: boolean;
  show_all_photos: boolean;
  show_process_status: boolean;
  members_only: boolean;
  auto_publish_on_vote_start: boolean;
  publish_from: string | null;
  publish_until: string | null;
  logo_url: string | null;
  banner_url: string | null;
  primary_color: string;
  secondary_color: string;
  election_type: ElectionType;
  one_vote_per_member: boolean;
  secret_vote: boolean;
  confirm_vote: boolean;
  allow_blank_vote: boolean;
  positions: ElectionPosition[];
  calendar: CalendarEvent[];
  templates: MessageTemplate[];
  is_readonly: boolean;
  guide: GuideStep[];
  periods: ElectionPeriod[];
}

export interface ElectionVoter {
  user_id: number;
  names: string;
  lastname: string;
  identifier: string;
  member_code: string;
  profession: string;
  email: string;
  photo_url: string | null;
  last_access: string | null;
  payment_status: string;
  voting_enabled: boolean;
  has_voted: boolean;
  province: string;
  city: string;
  type_profile?: string;
}

export interface VoterListResult {
  items: ElectionVoter[];
  total: number;
  enabled_count: number;
  disabled_count: number;
  pending_payment_count: number;
  padro_total: number;
  provinces?: string[];
}

export interface ReportRow {
  list_id: number | null;
  name: string;
  slogan: string;
  color: string | null;
  logo_url: string | null;
  principal_name: string;
  votes: number;
  percentage: number;
  result_status: string;
}

export interface ReportTimeline {
  key: string;
  title: string;
  occurred_at: string | null;
  detail: string;
  tone: string;
}

export interface ElectionReport {
  election_id: number;
  title: string;
  status: ElectionStatus;
  eligible: number;
  votes_cast: number;
  participation: number;
  blank_votes: number;
  blank_percentage: number;
  lists_count: number;
  updated_at: string | null;
  rows: ReportRow[];
  timeline: ReportTimeline[];
}

export interface MemberNotice {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

export interface MemberPortal {
  election: Election;
  lists: ElectionList[];
  voting_enabled: boolean;
  has_voted: boolean;
  can_vote: boolean;
  notices: MemberNotice[];
}

export type AdminTab = "listas" | "calendario" | "configuracion" | "votantes" | "reportes";
export type ConfigPanel = "cargos" | "diseno" | "opciones" | "mensajes";

export const ELECTION_STATUS_LABELS: Record<ElectionStatus, string> = {
  en_preparacion: "En preparación",
  publicada: "Publicada",
  en_votacion: "En votación",
  cerrada: "Cerrada",
  finalizada: "Finalizada",
};

export const LIST_STATUS_LABELS: Record<ListStatus, string> = {
  borrador: "Borrador",
  activa: "Activa",
  suspendida: "Suspendida",
  retirada: "Retirada",
};

export function mediaUrl(path: string | null | undefined): string {
  if (!path) {
    return "";
  }
  if (path.startsWith("http")) {
    return path;
  }
  const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${api}${path}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) {
    return value;
  }
  return `${day}/${month}/${year}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()} ${hours}:${minutes}`;
}

export const SINGLE_DATE_CALENDAR_KEYS = [
  "convocatoria",
  "publicacion_listas",
  "inicio_gestion",
  "fin_gestion",
] as const;

export const CALENDAR_EVENT_COLORS: Record<string, string> = {
  convocatoria: "#2563eb",
  inscripcion_listas: "#0ea5e9",
  revision_listas: "#8b5cf6",
  publicacion_listas: "#14b8a6",
  campana: "#f59e0b",
  votacion: "#1d4ed8",
  escrutinio: "#6366f1",
  inicio_gestion: "#16a34a",
  fin_gestion: "#dc2626",
};

export interface WorkPlanItem {
  title: string;
  body: string;
}

const MONTH_SHORT = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];
const MONTH_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function isSingleDateCalendarEvent(eventKey: string): boolean {
  return (SINGLE_DATE_CALENDAR_KEYS as readonly string[]).includes(eventKey);
}

export function formatMonthYear(value: string | null | undefined): string {
  if (!value) {
    return "Por definir";
  }
  const label = new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function calendarEventDate(event: { event_key: string; starts_on: string | null; ends_on: string | null }): {
  start: string | null;
  end: string | null;
  single: boolean;
} {
  const single = isSingleDateCalendarEvent(event.event_key);
  if (!single) {
    return { start: event.starts_on, end: event.ends_on, single: false };
  }
  if (
    event.event_key === "fin_gestion" &&
    event.ends_on &&
    (!event.starts_on || event.ends_on > event.starts_on)
  ) {
    return { start: event.ends_on, end: null, single: true };
  }
  return { start: event.starts_on, end: null, single: true };
}

export function formatCronogramaDate(startsOn: string | null, endsOn: string | null, single = false): string {
  if (!startsOn) {
    return "Sin fecha";
  }
  const start = parseIsoDate(startsOn);
  if (!start) {
    return formatDate(startsOn);
  }
  const startLabel = `${String(start.getDate()).padStart(2, "0")} ${MONTH_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  if (single || !endsOn || endsOn === startsOn) {
    return startLabel;
  }
  const end = parseIsoDate(endsOn);
  if (!end) {
    return startLabel;
  }
  const endDay = String(end.getDate()).padStart(2, "0");
  const endMonth = MONTH_SHORT[end.getMonth()];
  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    return `${String(start.getDate()).padStart(2, "0")} ${MONTH_SHORT[start.getMonth()]} al ${endDay} ${endMonth} ${end.getFullYear()}`;
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${String(start.getDate()).padStart(2, "0")} ${MONTH_SHORT[start.getMonth()]} al ${endDay} ${endMonth} ${end.getFullYear()}`;
  }
  return `${startLabel} al ${endDay} ${endMonth} ${end.getFullYear()}`;
}

function parseIsoDate(value: string): Date | null {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return new Date(year, month - 1, day);
}

export function formatLongSpanishDate(value: string | null | undefined): string {
  if (!value) {
    return "Por definir";
  }
  const date = parseIsoDate(value);
  if (!date) {
    return formatDate(value);
  }
  return `${String(date.getDate()).padStart(2, "0")} ${MONTH_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

export function parseWorkPlanItems(summary: string | null | undefined): WorkPlanItem[] {
  const raw = (summary || "").trim();
  if (!raw) {
    return [];
  }
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (typeof item === "string") {
              const title = item.trim();
              return title ? { title, body: "" } : null;
            }
            if (item && typeof item === "object" && "title" in item) {
              const title = String((item as WorkPlanItem).title || "").trim();
              const body = String((item as WorkPlanItem).body || "").trim();
              return title ? { title, body } : null;
            }
            return null;
          })
          .filter((item): item is WorkPlanItem => Boolean(item));
      }
    } catch {
      // El resumen puede ser texto plano de periodos anteriores.
    }
  }
  return raw
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.replace(/^\d+[\).:-]\s*/, "").trim())
        .filter(Boolean);
      if (!lines.length) {
        return null;
      }
      const [first, ...rest] = lines;
      const [title, ...inline] = first.split(/\s+[—–|:]\s+/);
      return {
        title: (title || first).trim(),
        body: [...inline, ...rest].join(" ").trim(),
      };
    })
    .filter((item): item is WorkPlanItem => Boolean(item?.title));
}

export function serializeWorkPlanItems(items: WorkPlanItem[]): string {
  return JSON.stringify(
    items
      .map((item) => ({ title: item.title.trim(), body: item.body.trim() }))
      .filter((item) => item.title),
  );
}
