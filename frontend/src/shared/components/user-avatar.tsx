"use client";

import { BRAND_MEDIA } from "@/config/brand-media";
import { BrandImage } from "@/shared/components/brand-image";
import { resolveMediaSrc } from "@/shared/lib/media";

interface UserAvatarProps {
  name?: string | null;
  fotoId?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function UserAvatar({ name, fotoId, size = "md", className = "" }: UserAvatarProps) {
  const photoSrc = resolveMediaSrc(fotoId);
  const classes = `user-avatar user-avatar-${size} ${className}`.trim();

  if (photoSrc) {
    return (
      <BrandImage
        alt={name || "Foto de perfil"}
        className={classes}
        fallback={
          <BrandImage
            alt="COPSSTEC"
            className={classes}
            fallback={<span className={`${classes} user-avatar-fallback`}>CS</span>}
            sources={[BRAND_MEDIA.iconShort, BRAND_MEDIA.iconShortFallback]}
          />
        }
        sources={[photoSrc]}
      />
    );
  }

  return (
    <BrandImage
      alt="COPSSTEC"
      className={classes}
      fallback={<span className={`${classes} user-avatar-fallback`}>CS</span>}
      sources={[BRAND_MEDIA.iconShort, BRAND_MEDIA.iconShortFallback]}
    />
  );
}
