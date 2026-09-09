export interface Course {
  id: number;
  state_id: number;
  created_by: number;
  title: string;
  value: string;
  location: string;
  capacitator: string;
  capacitator_about: string;
  date_course: string;
  date_course_final: string;
  hour_init: string;
  hour_final: string;
  about: string;
  image: string;
  type_modality: string | null;
  link: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  finished_at: string | null;
}

export interface AdminCourse extends Course {
  inscriptions_count: number;
  attendees_count: number;
  pending_payments_count: number;
  certificates_sent_count: number;
}

export interface MemberCourse extends Course {
  inscription_id: number | null;
  inscription_state_id: number | null;
  attended_at: string | null;
  inscription_created_at: string | null;
  certificate_id: number | null;
  certificate_code: string | null;
  certificate_sent_at: string | null;
}

export interface CourseInscription {
  id: number;
  course_id: number;
  state_id: number;
  participant_type: "member" | "guest";
  user_id: number | null;
  profile_id: number | null;
  names: string;
  email: string;
  identifier: string;
  cellphone: string | null;
  country: string | null;
  province: string | null;
  city: string | null;
  organization: string | null;
  attended_at: string | null;
  completed_at: string | null;
  payment_state_id: number | null;
  voucher_path: string | null;
  certificate_id: number | null;
  certificate_code: string | null;
  certificate_sent_at: string | null;
}

export interface MemberOption {
  id: number;
  name: string;
  email: string;
  names: string | null;
  lastname: string | null;
  identifier: string | null;
}

export type CourseFormInput = Omit<
  Course,
  "id" | "created_by" | "deleted_at" | "deleted_by" | "created_at" | "updated_at" | "finished_at"
>;

export interface BulkActionResponse {
  processed: number;
  skipped: number;
  errors: string[];
}
