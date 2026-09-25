import type { CSSProperties } from "react";

export const DEFAULT_OVERLAY_COLOR = "#0f172a";
export const DEFAULT_OVERLAY_OPACITY = 68;

export function normalizeOverlayColor(value: string | null | undefined): string {
  const color = (value || DEFAULT_OVERLAY_COLOR).trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : DEFAULT_OVERLAY_COLOR;
}

export function normalizeOverlayOpacity(value: number | null | undefined): number {
  const opacity = Number(value);
  if (!Number.isFinite(opacity)) {
    return DEFAULT_OVERLAY_OPACITY;
  }
  return Math.min(90, Math.max(10, Math.round(opacity)));
}

function hexToRgb(color: string | null | undefined): string {
  const hex = normalizeOverlayColor(color).slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `${red}, ${green}, ${blue}`;
}

export function documentCoverStyle(
  coverSrc: string | null,
  overlayColor?: string | null,
  overlayOpacity?: number | null,
): CSSProperties {
  const rgb = hexToRgb(overlayColor);
  const bottom = normalizeOverlayOpacity(overlayOpacity) / 100;
  const top = Math.min(0.18, bottom * 0.2);
  const overlay = `linear-gradient(180deg, rgba(${rgb}, ${top}), rgba(${rgb}, ${bottom}))`;
  if (coverSrc) {
    return {
      backgroundImage: `${overlay}, url("${coverSrc}")`,
    };
  }
  return {
    backgroundImage: overlay,
  };
}
