"use client";

import { useState } from "react";

import { BRAND_MEDIA } from "@/config/brand-media";
import { BrandImage } from "@/shared/components/brand-image";
import { resolveMediaSrc } from "@/shared/lib/media";

interface CourseCoverProps {
  image: string | null | undefined;
  title: string;
  className?: string;
}

function isCustomImage(path: string | null | undefined): boolean {
  if (!path?.trim()) {
    return false;
  }

  return !path.startsWith("/media/brand/");
}

export function CourseCover({ image, title, className = "" }: CourseCoverProps) {
  const src = resolveMediaSrc(image);
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && isCustomImage(image) && !failed;

  return (
    <div className={`course-cover ${showPhoto ? "" : "is-fallback"} ${className}`.trim()}>
      {showPhoto ? (
        <img alt={title} onError={() => setFailed(true)} src={src ?? ""} />
      ) : (
        <BrandImage
          alt="COPSSTEC"
          className="course-cover-logo"
          fallback={<span className="course-cover-mark">CS</span>}
          sources={[BRAND_MEDIA.logoLong, BRAND_MEDIA.logoLongFallback, BRAND_MEDIA.iconShort]}
        />
      )}
    </div>
  );
}
