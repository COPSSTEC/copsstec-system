import { resolveMediaSrc } from "@/shared/lib/media";

export const VISIBLE_NOTICE_STATE_ID = 4;
export const HIDDEN_NOTICE_STATE_ID = 5;

export const NOTICE_IMPORTANCE = ["baja", "media", "alta"] as const;
export type NoticeImportance = (typeof NOTICE_IMPORTANCE)[number];

export interface MemberNotice {
  id: number;
  title: string;
  excerpt: string;
  description: string;
  image: string;
  importance: NoticeImportance;
  published_at: string | null;
}

export interface AdminNotice extends MemberNotice {
  state_id: number;
  created_by: number;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface NoticeFormInput {
  title: string;
  description: string;
  state_id: number;
  importance: NoticeImportance;
  published_at: string;
}

export const EMPTY_NOTICE_FORM: NoticeFormInput = {
  title: "",
  description: "",
  state_id: VISIBLE_NOTICE_STATE_ID,
  importance: "media",
  published_at: "",
};

export function noticeCoverSrc(path: string | null | undefined): string | null {
  return resolveMediaSrc(path);
}

export function formatNoticeDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function isNoticeScheduled(notice: Pick<AdminNotice, "state_id" | "published_at">): boolean {
  if (notice.state_id !== VISIBLE_NOTICE_STATE_ID || !notice.published_at) {
    return false;
  }
  const date = new Date(notice.published_at);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

export function toDatetimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  if (!value.trim()) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString();
}
