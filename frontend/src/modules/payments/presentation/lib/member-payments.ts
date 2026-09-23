import {
  formatIsoDate,
  formatUsd,
  paymentTitle,
  paymentTypeLabel,
  type Payment,
  type SubscriptionSummary,
} from "@/modules/payments/domain/types";
import { paymentVoucherUrl } from "@/modules/payments/infrastructure/payments-api";

export const MEMBER_PAYMENTS_PAGE_SIZE = 5;

export type MemberPaymentTab = "all" | "pending" | "paid" | "history";

export type PaymentIconTone = "blue" | "rose" | "violet" | "amber" | "slate" | "indigo";

export type PaymentIconName =
  | "crown"
  | "gavel"
  | "file"
  | "graduation"
  | "badge"
  | "users"
  | "calendar"
  | "shield"
  | "wallet"
  | "invoice"
  | "check"
  | "close"
  | "search"
  | "download"
  | "printer"
  | "share"
  | "arrow"
  | "clock"
  | "plus"
  | "eye"
  | "pencil"
  | "trash"
  | "warning"
  | "dollar"
  | "filter";

export interface PaymentVisual {
  icon: PaymentIconName;
  tone: PaymentIconTone;
  title: string;
  subtitle: string;
}

export function isPendingStatus(status: string): boolean {
  return status === "pending_payment" || status === "pending_review";
}

export function isPaidStatus(status: string): boolean {
  return status === "approved";
}

export function isHistoryStatus(status: string): boolean {
  return status === "approved" || status === "rejected";
}

export function isMembershipActive(status: string | null | undefined): boolean {
  return status === "al_dia" || status === "gracia";
}

export function membershipStatusTitle(status: string | null | undefined): string {
  if (status === "al_dia") {
    return "Activa";
  }
  if (status === "gracia") {
    return "En gracia";
  }
  if (status === "vencida") {
    return "Vencida";
  }
  if (status === "sin_historial") {
    return "Sin historial";
  }
  return "Sin registro";
}

export function membershipStatusHint(subscription: SubscriptionSummary | null): string {
  if (!subscription) {
    return "Aún no hay historial de membresía.";
  }
  if (subscription.status === "al_dia") {
    return "Tu membresía se encuentra al día.";
  }
  if (subscription.status === "gracia") {
    return "Estás en el periodo de gracia. Renueva para no perder el acceso.";
  }
  if (subscription.status === "vencida") {
    return "Debes renovar tu membresía para continuar.";
  }
  return "Aún no hay un pago de membresía registrado.";
}

export function daysUntilIso(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

export function coverageHint(subscription: SubscriptionSummary | null): string {
  const days = daysUntilIso(subscription?.coverage_until);
  if (days === null) {
    return "Sin cobertura registrada.";
  }
  if (days > 1) {
    return `Faltan ${days} días`;
  }
  if (days === 1) {
    return "Falta 1 día";
  }
  if (days === 0) {
    return "Vence hoy";
  }
  if (days === -1) {
    return "Venció hace 1 día";
  }
  return `Venció hace ${Math.abs(days)} días`;
}

export function pendingAmountTotal(items: Payment[]): number {
  return items
    .filter((item) => isPendingStatus(item.status))
    .reduce((sum, item) => {
      const value = Number(item.amount);
      return sum + (Number.isNaN(value) ? 0 : value);
    }, 0);
}

export function matchesMemberPaymentTab(payment: Payment, tab: MemberPaymentTab): boolean {
  if (tab === "pending") {
    return isPendingStatus(payment.status);
  }
  if (tab === "paid") {
    return isPaidStatus(payment.status);
  }
  if (tab === "history") {
    return isHistoryStatus(payment.status);
  }
  return true;
}

export function matchesMemberPaymentFilters(
  payment: Payment,
  query: string,
  type: string,
): boolean {
  if (type && normalizeType(payment.type) !== type) {
    return false;
  }

  const haystack = [
    paymentTitle(payment),
    payment.description,
    paymentTypeLabel(payment.type),
    payment.amount,
    payment.date_register,
    payment.status,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query.trim().toLowerCase());
}

export function visiblePaymentTypes(items: Payment[]): string[] {
  const seen = new Set<string>();
  const types: string[] = [];

  for (const item of items) {
    const type = normalizeType(item.type);
    if (!type || seen.has(type)) {
      continue;
    }
    seen.add(type);
    types.push(type);
  }

  return types;
}

export function paymentVisual(payment: Payment): PaymentVisual {
  const type = normalizeType(payment.type);
  const title = paymentTitle(payment);

  if (type === "membresía" || type === "inscripcion") {
    return {
      icon: "crown",
      tone: "blue",
      title,
      subtitle: membershipSubtitle(payment),
    };
  }
  if (type === "multa") {
    return {
      icon: "gavel",
      tone: "rose",
      title,
      subtitle: payment.description || "Sanción COPSSTEC",
    };
  }
  if (type === "curso") {
    return {
      icon: "graduation",
      tone: "amber",
      title,
      subtitle: payment.description || "Capacitación COPSSTEC",
    };
  }
  if (type === "carnet") {
    return {
      icon: "badge",
      tone: "slate",
      title,
      subtitle: payment.description || "Emisión de certificado",
    };
  }
  if (type === "congreso") {
    return {
      icon: "users",
      tone: "indigo",
      title,
      subtitle: payment.description || "Congreso COPSSTEC",
    };
  }
  if (type === "reservaciones") {
    return {
      icon: "calendar",
      tone: "violet",
      title,
      subtitle: payment.description || "Reservación",
    };
  }

  return {
    icon: "file",
    tone: "violet",
    title,
    subtitle: paymentTypeLabel(payment.type),
  };
}

export function paymentMethodLabel(lastDigits: string | null | undefined, detailed = false): string {
  if (lastDigits && lastDigits !== "any" && lastDigits !== "NA") {
    return detailed ? `Tarjeta de crédito · **** ${lastDigits}` : "Tarjeta de crédito";
  }
  return detailed ? "Transferencia bancaria" : "Transferencia";
}

export function paymentReceiptNumber(payment: Payment): string {
  const year = yearFromDate(payment.date_register || payment.created_at);
  return `PAG-${year}-${String(payment.id).padStart(4, "0")}`;
}

export function paymentReceiptFilename(payment: Payment): string {
  const year = yearFromDate(payment.date_register || payment.created_at);
  const slug = slugify(normalizeType(payment.type)) || "pago";
  const extension = receiptExtension(payment);
  return `comprobante_${slug}_${year}${extension}`;
}

export function paymentCoveragePeriod(
  payment: Payment,
  subscription: SubscriptionSummary | null,
): string | null {
  const type = normalizeType(payment.type);
  if (type !== "membresía" && type !== "inscripcion") {
    return null;
  }

  const start = formatIsoDate(payment.date_register) || payment.date_register;
  const months = Number(payment.amount) >= 120 ? 12 : Number(payment.amount) >= 50 ? 5 : 1;
  const computedEnd = addMonthsToDate(payment.date_register, months);
  const end =
    payment.status === "approved" && subscription?.coverage_until
      ? formatIsoDate(subscription.coverage_until)
      : computedEnd;

  if (!start || start === "—") {
    return end;
  }
  if (!end || end === "—") {
    return start;
  }
  return `${start} – ${end}`;
}

export function paymentObservation(payment: Payment): string {
  if (payment.admin_observation?.trim()) {
    return payment.admin_observation.trim();
  }
  if (payment.status === "approved") {
    return "Pago correspondiente a tu cuota. Gracias por tu compromiso con COPSSTEC.";
  }
  if (payment.status === "pending_review") {
    return "Tu comprobante está en revisión. Te avisaremos cuando el administrador lo apruebe.";
  }
  if (payment.status === "pending_payment") {
    return "Este pago está pendiente. Transfiere y sube el comprobante para continuar.";
  }
  if (payment.status === "rejected") {
    return "El comprobante fue rechazado. Revisa la observación o carga uno nuevo.";
  }
  return "Sin observaciones.";
}

export function paymentStatusBanner(status: string): { title: string; hint: string; tone: string } {
  if (status === "approved") {
    return {
      title: "Pago aprobado",
      hint: "Este pago ha sido procesado exitosamente.",
      tone: "success",
    };
  }
  if (status === "pending_review") {
    return {
      title: "Comprobante en revisión",
      hint: "El administrador está validando tu voucher.",
      tone: "warning",
    };
  }
  if (status === "pending_payment") {
    return {
      title: "Pago pendiente",
      hint: "Debes completar la transferencia y subir el comprobante.",
      tone: "info",
    };
  }
  if (status === "rejected") {
    return {
      title: "Pago rechazado",
      hint: "El comprobante no fue aceptado. Puedes cargar uno nuevo.",
      tone: "danger",
    };
  }
  return {
    title: "Estado del pago",
    hint: status,
    tone: "muted",
  };
}

export function receiptFileMeta(payment: Payment): { name: string; detail: string } {
  const voucher = paymentVoucherUrl(payment.voucher_url);
  const date = payment.date_register || formatIsoDate(payment.created_at);
  const friendly = paymentReceiptFilename(payment);
  if (voucher) {
    const raw = voucher.split("/").pop() || friendly;
    const extension = (/\.(pdf|png|jpe?g|webp)$/i.exec(raw)?.[0] || ".png").toLowerCase();
    const kind = extension === ".pdf" ? "PDF" : "Imagen";
    return {
      name: friendly.replace(/\.[^.]+$/, extension),
      detail: `${kind} · Subido el ${date || "—"}`,
    };
  }

  return {
    name: friendly.replace(/\.[^.]+$/, ".pdf"),
    detail: `Recibo COPSSTEC · ${date || "—"}`,
  };
}

export function paymentShareText(payment: Payment): string {
  const visual = paymentVisual(payment);
  return [
    visual.title,
    formatUsd(payment.amount),
    payment.date_register,
    `Comprobante ${paymentReceiptNumber(payment)}`,
  ].join(" · ");
}

export function buildReceiptHtml(
  payment: Payment,
  subscription: SubscriptionSummary | null,
): string {
  const visual = paymentVisual(payment);
  const voucher = paymentVoucherUrl(payment.voucher_url);
  const coverage = paymentCoveragePeriod(payment, subscription);
  const observation = paymentObservation(payment);

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(paymentReceiptFilename(payment))}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #172033; margin: 0; padding: 32px; }
      .sheet { max-width: 640px; margin: 0 auto; border: 1px solid #dfe5ef; border-radius: 16px; padding: 28px; }
      img.logo { max-width: 180px; height: auto; }
      h1 { font-size: 22px; margin: 18px 0 6px; }
      p { color: #64748b; margin: 0 0 18px; }
      dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; margin: 0; }
      dt { color: #64748b; font-size: 12px; }
      dd { margin: 4px 0 0; font-weight: 700; }
      .voucher { margin-top: 24px; }
      .voucher img { max-width: 100%; border: 1px solid #dfe5ef; border-radius: 12px; }
      @media print { body { padding: 0; } .sheet { border: 0; } }
    </style>
  </head>
  <body>
    <article class="sheet">
      <img alt="COPSSTEC" class="logo" src="${window.location.origin}/media/brand/logo-long.png" />
      <h1>Comprobante de pago</h1>
      <p>${escapeHtml(paymentReceiptNumber(payment))} · Colegio de Profesionales de Seguridad y Salud en el Trabajo</p>
      <dl>
        <div><dt>Concepto</dt><dd>${escapeHtml(visual.title)}</dd></div>
        <div><dt>Detalle</dt><dd>${escapeHtml(visual.subtitle)}</dd></div>
        <div><dt>Monto</dt><dd>${escapeHtml(formatUsd(payment.amount))}</dd></div>
        <div><dt>Estado</dt><dd>${escapeHtml(payment.status === "approved" ? "Aprobado" : payment.status)}</dd></div>
        <div><dt>Fecha de pago</dt><dd>${escapeHtml(payment.date_register || "—")}</dd></div>
        <div><dt>Forma de pago</dt><dd>${escapeHtml(paymentMethodLabel(payment.last_digits, true))}</dd></div>
        ${coverage ? `<div><dt>Periodo de vigencia</dt><dd>${escapeHtml(coverage)}</dd></div>` : ""}
        <div><dt>Observaciones</dt><dd>${escapeHtml(observation)}</dd></div>
      </dl>
      ${voucher ? `<div class="voucher"><img alt="Comprobante" src="${escapeHtml(voucher)}" /></div>` : ""}
    </article>
  </body>
</html>`;
}

export async function downloadPaymentReceipt(payment: Payment): Promise<void> {
  const voucher = paymentVoucherUrl(payment.voucher_url);
  if (voucher) {
    const response = await fetch(voucher);
    if (!response.ok) {
      throw new Error("No se pudo descargar el comprobante.");
    }
    const blob = await response.blob();
    triggerDownload(blob, fileNameFromUrl(voucher) || paymentReceiptFilename(payment));
    return;
  }

  const blob = new Blob([buildReceiptHtml(payment, null)], { type: "text/html;charset=utf-8" });
  triggerDownload(blob, paymentReceiptFilename(payment).replace(/\.[^.]+$/, ".html"));
}

export function printPaymentReceipt(
  payment: Payment,
  subscription: SubscriptionSummary | null,
): void {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=720,height=900");
  if (!popup) {
    throw new Error("Permite las ventanas emergentes para imprimir el comprobante.");
  }
  popup.document.write(buildReceiptHtml(payment, subscription));
  popup.document.close();
  popup.focus();
  popup.onload = () => {
    popup.print();
  };
  window.setTimeout(() => {
    try {
      popup.print();
    } catch {
      // El usuario puede imprimir desde la ventana abierta.
    }
  }, 400);
}

function normalizeType(type: string): string {
  return type === "membresia" ? "membresía" : type;
}

function membershipSubtitle(payment: Payment): string {
  const amount = Number(payment.amount);
  if (amount >= 120) {
    return "Membresía anual COPSSTEC";
  }
  if (amount === 50) {
    return "Afiliación COPSSTEC";
  }
  if (amount >= 10 && amount < 50) {
    return "Membresía mensual COPSSTEC";
  }
  return payment.description || "Membresía COPSSTEC";
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase();
}

function yearFromDate(value: string | undefined): string {
  if (!value) {
    return String(new Date().getFullYear());
  }
  const iso = /^(\d{4})-/.exec(value);
  if (iso) {
    return iso[1];
  }
  const register = /\/(\d{4})$/.exec(value);
  if (register) {
    return register[1];
  }
  return String(new Date().getFullYear());
}

function addMonthsToDate(value: string, months: number): string {
  const register = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const date = register
    ? new Date(Number(register[3]), Number(register[2]) - 1, Number(register[1]))
    : /^\d{4}-\d{2}-\d{2}/.test(value)
      ? new Date(`${value.slice(0, 10)}T00:00:00`)
      : null;

  if (!date || Number.isNaN(date.getTime())) {
    return "—";
  }

  date.setMonth(date.getMonth() + months);
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function receiptExtension(payment: Payment): string {
  const voucher = payment.voucher_url || "";
  const match = /\.(pdf|png|jpe?g|webp)$/i.exec(voucher);
  if (match) {
    return match[0].toLowerCase();
  }
  return ".pdf";
}

function fileNameFromUrl(url: string): string | null {
  try {
    const name = new URL(url, window.location.origin).pathname.split("/").pop();
    return name || null;
  } catch {
    return url.split("/").pop() || null;
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
