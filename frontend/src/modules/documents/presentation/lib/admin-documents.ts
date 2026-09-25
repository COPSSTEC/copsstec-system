import type { MemberDocument } from "@/modules/documents/domain/types";

export const MAX_PDF_BYTES = 20 * 1024 * 1024;
export const MAX_PDF_LABEL = "20 MB";

export const MAX_COVER_BYTES = 5 * 1024 * 1024;
export const MAX_COVER_LABEL = "5 MB";

const PRACTICE_ITEMS = [
  "Solo formato PDF",
  `Tamaño máximo: ${MAX_PDF_LABEL}`,
  "Portada JPG, PNG o WEBP",
  "Documentos visibles para todos los socios",
] as const;

export const DOCUMENT_PRACTICES = PRACTICE_ITEMS;

export function documentKeyLabel(key: string): string {
  return key.replaceAll("-", "_").toUpperCase();
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(kilobytes >= 10 ? 0 : 1)} KB`;
  }
  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}

export function formatDocumentDate(value: string | null | undefined): string {
  if (!value) {
    return "Sin archivo";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShortDocumentDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function latestDocumentUpdate(documents: MemberDocument[]): string | null {
  const stamps = documents
    .filter((item) => item.available && item.updated_at)
    .map((item) => item.updated_at as string)
    .sort((left, right) => new Date(right).getTime() - new Date(left).getTime());
  return stamps[0] ?? null;
}

export function validatePdfFile(file: File): string | null {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return "El archivo debe ser un PDF.";
  }
  if (file.size > MAX_PDF_BYTES) {
    return `El PDF no puede superar ${MAX_PDF_LABEL}.`;
  }
  if (!file.size) {
    return "El archivo está vacío.";
  }
  return null;
}

export function validateCoverFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const isImage =
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp");
  if (!isImage) {
    return "La portada debe ser JPG, PNG o WEBP.";
  }
  if (file.size > MAX_COVER_BYTES) {
    return `La portada no puede superar ${MAX_COVER_LABEL}.`;
  }
  if (!file.size) {
    return "La imagen está vacía.";
  }
  return null;
}
