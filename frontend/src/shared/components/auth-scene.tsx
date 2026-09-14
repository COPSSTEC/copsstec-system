"use client";

import { useState } from "react";

import { LOGIN_MEDIA } from "@/config/login-media";

interface AuthSceneProps {
  children: React.ReactNode;
}

export function AuthScene({ children }: AuthSceneProps) {
  const [hasVideo, setHasVideo] = useState(true);

  return (
    <main className="auth-scene">
      {hasVideo && (
        <video
          autoPlay
          className="auth-scene-video"
          loop
          muted
          playsInline
          poster={LOGIN_MEDIA.posterSrc}
          onError={() => setHasVideo(false)}
        >
          <source src={LOGIN_MEDIA.videoSrc} type="video/mp4" />
        </video>
      )}
      <div className="auth-scene-overlay" />
      <div className="auth-scene-content">{children}</div>
    </main>
  );
}
