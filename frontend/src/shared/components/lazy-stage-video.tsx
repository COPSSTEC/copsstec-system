"use client";

import { useEffect, useRef } from "react";

interface LazyStageVideoProps {
  src: string;
}

export function LazyStageVideo({ src }: LazyStageVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          video.pause();
          return;
        }

        if (video.getAttribute("src") !== src) {
          video.src = src;
        }
        void video.play().catch(() => undefined);
      },
      { rootMargin: "200px" },
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
      video.pause();
    };
  }, [src]);

  return <video loop muted playsInline preload="none" ref={videoRef} />;
}
