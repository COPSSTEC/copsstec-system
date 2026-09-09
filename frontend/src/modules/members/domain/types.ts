export interface MemberColumn {
  id: string;
  label: string;
  source: string;
  default_visible: boolean;
  sortable: boolean;
  filterable: boolean;
  filter_type: "text" | "date-range" | string;
}

export interface Member {
  user_id: number;
  profile_id: number | null;
  name: string;
  login_email: string;
  state_id: number;
  state_label: string;
  last_conexion: string | null;
  names: string;
  lastname: string;
  identifier: string;
  email: string;
  birtday: string;
  blood_type: string;
  mobile_phone: string;
  fixed_phone: string;
  title_academic: string;
  level_academic: string;
  cod_senescyt: string;
  date_register: string;
  linkdink: string;
  want_notifications: boolean;
  is_work: boolean;
  foto_id: string;
  province: string | null;
  city: string | null;
  street_principal: string | null;
  street_secondary: string | null;
  type_profile: string | null;
  date_exit: string | null;
  fourth_title: string | null;
  type_commision: string | null;
  codigo_senescyt_cuarto: string | null;
  cod: string | null;
  gender: string | null;
  created_at: string | null;
}

export interface MemberListResponse {
  items: Member[];
  page: number;
  page_size: number;
  total: number;
  columns: MemberColumn[];
}

export interface MemberWriteInput {
  names: string;
  lastname: string;
  identifier: string;
  email: string;
  login_email: string;
  birtday: string;
  mobile_phone: string;
  date_register: string;
  blood_type: string;
  fixed_phone: string;
  title_academic: string;
  level_academic: string;
  cod_senescyt: string;
  linkdink: string;
  want_notifications: boolean;
  is_work: boolean;
  foto_id: string;
  province: string;
  city: string;
  street_principal: string;
  street_secondary: string;
  gender: string;
  type_profiles: string[];
  commissions: string[];
  fourth_title: string;
  codigo_senescyt_cuarto: string;
}

export interface MemberListQuery {
  page: number;
  pageSize: number;
  q: string;
  sortBy: string;
  sortDir: "asc" | "desc";
  filters: Record<string, string>;
}

export const EMPTY_MEMBER_FORM: MemberWriteInput = {
  names: "",
  lastname: "",
  identifier: "",
  email: "",
  login_email: "",
  birtday: "",
  mobile_phone: "",
  date_register: "",
  blood_type: "",
  fixed_phone: "",
  title_academic: "",
  level_academic: "",
  cod_senescyt: "",
  linkdink: "",
  want_notifications: true,
  is_work: false,
  foto_id: "",
  province: "",
  city: "",
  street_principal: "",
  street_secondary: "",
  gender: "",
  type_profiles: ["miembro"],
  commissions: ["NA"],
  fourth_title: "",
  codigo_senescyt_cuarto: "",
};

export const PROFILE_TYPE_OPTIONS = [
  { value: "miembro", label: "Miembro" },
  { value: "fundador", label: "Fundador" },
  { value: "directivo", label: "Directivo" },
] as const;

export const COMMISSION_OPTIONS = [
  { value: "NA", label: "Ninguna" },
  { value: "TV", label: "CANAL DIGITAL COPSSTEC TV" },
  { value: "INT", label: "RELACIONES INTERNACIONALES" },
  { value: "MRT", label: "MÉRITOS Y RECONOCIMIENTOS" },
  { value: "ETC", label: "ÉTICA Y HONOR" },
  { value: "INV", label: "INVESTIGACIÓN E INNOVACIÓN" },
  { value: "SST", label: "REVISTA SST ECUADOR" },
  { value: "EDU", label: "CAPACITACIÓN Y EDUCACIÓN" },
] as const;

export function splitCsv(value: string | null | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function memberPhotoSrc(fotoId: string): string | null {
  if (!fotoId) {
    return null;
  }

  if (fotoId.startsWith("http://") || fotoId.startsWith("https://")) {
    return fotoId;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${apiUrl}${fotoId.startsWith("/") ? fotoId : `/${fotoId}`}`;
}

export const ENABLED_STATE_ID = 1;
export const DISABLED_STATE_ID = 3;
