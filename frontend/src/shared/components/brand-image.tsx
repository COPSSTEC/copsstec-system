"use client";

import { useState, type ReactNode } from "react";

interface BrandImageProps {
  sources: readonly string[];
  alt: string;
  className?: string;
  fallback: ReactNode;
}

export function BrandImage({ sources, alt, className, fallback }: BrandImageProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  if (!source) {
    return fallback;
  }

  return (
    <img
      alt={alt}
      className={className}
      src={source}
      onError={() => setSourceIndex((current) => current + 1)}
    />
  );
}
