export type AccessLevel = "admin" | "member" | "operations" | "restricted";

export interface Profile {
  id: number;
  user_id: number;
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
  state_id: number;
  type_profile: string | null;
  date_exit: string | null;
  fourth_title: string | null;
  type_commision: string | null;
  codigo_senescyt_cuarto: string | null;
  cod: string | null;
  gender: string | null;
}

export interface User {
  id: number;
  name: string;
  email: string;
  state_id: number;
  email_verified_at: string | null;
  last_conexion: string | null;
  must_change_password: boolean;
  roles: string[];
  access_level: AccessLevel;
  allowed_routes: string[];
  profile: Profile | null;
}

export interface NavigationItem {
  label: string;
  href: string;
  children?: NavigationItem[];
}

export interface AccessPolicy {
  roles: string[];
  access_level: AccessLevel;
  allowed_routes: string[];
  navigation: NavigationItem[];
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: "bearer";
  user: User;
}

export interface AffiliationResumeResponse {
  message: string;
  debug_code?: string;
}

export interface RefreshSessionResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function passwordChangeRedirect(): string {
  return "/cambiar-contrasena";
}
