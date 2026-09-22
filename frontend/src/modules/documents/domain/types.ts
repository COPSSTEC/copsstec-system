import { resolveMediaSrc } from "@/shared/lib/media";

export const DOCUMENT_KEYS = [
  "member_guide",
  "statutes",
  "safety_talks",
  "brand_manual",
] as const;

export type MemberDocumentKey = (typeof DOCUMENT_KEYS)[number];

export interface MemberDocument {
  document_key: MemberDocumentKey;
  title: string;
  file_path: string | null;
  original_filename?: string | null;
  available: boolean;
  updated_at?: string | null;
}

export function documentFileSrc(path: string | null | undefined): string | null {
  return resolveMediaSrc(path);
}

export function documentDownloadName(document: MemberDocument): string {
  if (document.original_filename) {
    return document.original_filename;
  }
  return `${document.title}.pdf`;
}
