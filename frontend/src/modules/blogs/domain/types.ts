import { resolveMediaSrc } from "@/shared/lib/media";

export const VISIBLE_BLOG_STATE_ID = 4;
export const HIDDEN_BLOG_STATE_ID = 5;

export interface PublicBlogListItem {
  id: number;
  state_id: number;
  title: string;
  excerpt: string;
  image: string;
  link: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface PublicBlog {
  id: number;
  state_id: number;
  title: string;
  description: string;
  image: string;
  link: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminBlog extends PublicBlog {
  created_by: number;
  excerpt: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface BlogFormInput {
  title: string;
  description: string;
  state_id: number;
}

export const EMPTY_BLOG_FORM: BlogFormInput = {
  title: "",
  description: "",
  state_id: VISIBLE_BLOG_STATE_ID,
};

export function blogCoverSrc(path: string | null | undefined): string | null {
  return resolveMediaSrc(path);
}

export function formatBlogDate(value: string | null): string {
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
