"use client";

import { BRAND_MEDIA } from "@/config/brand-media";
import { BrandImage } from "@/shared/components/brand-image";

interface AppLogoProps {
  compact?: boolean;
  variant?: "mark" | "full";
}

export function AppLogo({ compact = false, variant }: AppLogoProps) {
  const resolvedVariant = variant ?? (compact ? "mark" : "full");

  if (resolvedVariant === "mark") {
    return (
      <BrandImage
        alt="COPSSTEC"
        className="app-logo-mark-image"
        fallback={<span className="app-logo-mark">CS</span>}
        sources={[BRAND_MEDIA.iconShort, BRAND_MEDIA.iconShortFallback]}
      />
    );
  }

  return (
    <BrandImage
      alt="COPSSTEC"
      className="app-logo-long-image"
      fallback={
        <div className="app-logo">
          <span className="app-logo-mark">CS</span>
          <div>
            <span className="app-logo-title">COPSSTEC</span>
            <span className="app-logo-subtitle">Sistema administrativo</span>
          </div>
        </div>
      }
      sources={[BRAND_MEDIA.logoLong, BRAND_MEDIA.logoLongFallback]}
    />
  );
}
