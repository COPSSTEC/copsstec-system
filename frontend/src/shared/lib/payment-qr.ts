export const PAYMENT_QR_URL = (
  process.env.NEXT_PUBLIC_PAYMENT_QR_URL ?? "https://ppls.me/b04dm5gdKNmDX2OswEnlA"
).trim();

export function paymentQrImageSrc(size = 220): string | null {
  if (!PAYMENT_QR_URL) {
    return null;
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(PAYMENT_QR_URL)}`;
}
