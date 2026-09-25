export interface DashboardCountItem {
  label: string;
  count: number;
}

export interface DashboardCards {
  active: number;
  inactive: number;
  technical: number;
  medical: number;
  active_mom_percent: number | null;
  inactive_mom_percent: number | null;
}

export interface DashboardPayments {
  al_dia: number;
  pendiente: number;
}

export interface DashboardIncomeMonth {
  month: number;
  memberships: string;
  courses: string;
  reservations: string;
}

export interface DashboardIncome {
  year: number;
  available_years: number[];
  months: DashboardIncomeMonth[];
}

export interface DashboardDemographics {
  gender: DashboardCountItem[];
  province: DashboardCountItem[];
  city: DashboardCountItem[];
  age_range: DashboardCountItem[];
  blood_type: DashboardCountItem[];
  profile_type: DashboardCountItem[];
}

export interface DashboardTitles {
  third_level: number;
  fourth_level: number;
  both: number;
  none: number;
  top_third: DashboardCountItem[];
  top_fourth: DashboardCountItem[];
}

export interface PendingApproval {
  user_id: number;
  names: string;
  lastname: string;
  identifier: string;
  email: string;
  date_register: string;
}

export interface UpcomingDue {
  user_id: number;
  names: string;
  lastname: string;
  coverage_until: string;
  days_left: number;
}

export interface AdminDashboardSnapshot {
  cards: DashboardCards;
  payments: DashboardPayments;
  income: DashboardIncome;
  demographics: DashboardDemographics;
  titles: DashboardTitles;
  pending_approvals: PendingApproval[];
  upcoming_dues?: UpcomingDue[];
}

export const DASHBOARD_EXPORT_KEYS = [
  "active",
  "inactive",
  "technical",
  "medical",
  "payments",
  "debtors",
  "income",
  "gender",
  "province",
  "city",
  "age",
  "blood_type",
  "profile_type",
  "titles",
] as const;

export type DashboardExportKey = (typeof DASHBOARD_EXPORT_KEYS)[number];

export interface MemberFeedNotice {
  id: number;
  title: string;
  excerpt: string;
  description: string;
  image: string;
  importance: "baja" | "media" | "alta";
  published_at: string | null;
}

export interface MemberFeedBlog {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  created_at: string | null;
}

export interface MemberFeedCourse {
  id: number;
  title: string;
  image: string;
  date_course: string;
  type_modality: string | null;
  location: string;
}

export interface MemberFeedJob {
  id: number;
  title: string;
  name_enterprise: string;
  location: string;
  type: string;
  logo: string;
  link: string;
}

export interface MemberFeedDocument {
  document_key: "member_guide" | "statutes" | "safety_talks" | "brand_manual" | "board_resolutions";
  title: string;
  file_path: string | null;
  available: boolean;
  cover_path?: string | null;
}

export interface MemberDashboardSnapshot {
  notices: {
    high: MemberFeedNotice[];
    medium: MemberFeedNotice[];
    low: MemberFeedNotice[];
  };
  blogs: MemberFeedBlog[];
  courses: MemberFeedCourse[];
  jobs: MemberFeedJob[];
  documents: MemberFeedDocument[];
}
