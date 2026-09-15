"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { LANDING_FRAME_COUNT, landingFrameSrc } from "@/config/landing-media";

interface ScrollSequenceProps {
  children: ReactNode;
}

export function ScrollSequence({ children }: ScrollSequenceProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<Array<HTMLImageElement | null>>(
    Array.from({ length: LANDING_FRAME_COUNT }, () => null),
  );
  const loadingRef = useRef<Array<boolean>>(Array.from({ length: LANDING_FRAME_COUNT }, () => false));
  const currentRef = useRef(0);
  const lastDrawnRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    function resize() {
      const next = canvasRef.current;
      const parent = next?.parentElement;
      if (!next || !parent) {
        return;
      }

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      next.width = Math.max(1, Math.floor(width * ratio));
      next.height = Math.max(1, Math.floor(height * ratio));
      paint(currentRef.current);
    }

    function paint(index: number) {
      const nextCanvas = canvasRef.current;
      const nextContext = nextCanvas?.getContext("2d");
      if (!nextCanvas || !nextContext) {
        return;
      }

      const frame = framesRef.current[index] ?? lastDrawnRef.current;
      if (!frame) {
        return;
      }

      lastDrawnRef.current = frame;
      const canvasWidth = nextCanvas.width;
      const canvasHeight = nextCanvas.height;
      const scale = Math.max(canvasWidth / frame.width, canvasHeight / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      const offsetX = (canvasWidth - drawWidth) / 2;
      const offsetY = (canvasHeight - drawHeight) / 2;

      nextContext.fillStyle = "#0f172a";
      nextContext.fillRect(0, 0, canvasWidth, canvasHeight);
      nextContext.drawImage(frame, offsetX, offsetY, drawWidth, drawHeight);
    }

    function loadFrame(index: number) {
      if (index < 0 || index >= LANDING_FRAME_COUNT) {
        return;
      }
      if (framesRef.current[index] || loadingRef.current[index]) {
        return;
      }

      loadingRef.current[index] = true;
      const image = new Image();
      image.decoding = "async";
      image.src = landingFrameSrc(index + 1);
      image.onload = () => {
        framesRef.current[index] = image;
        loadingRef.current[index] = false;
        if (index === currentRef.current) {
          paint(index);
        }
      };
      image.onerror = () => {
        loadingRef.current[index] = false;
      };
    }

    function preloadAround(index: number) {
      loadFrame(index);
      for (let offset = 1; offset <= 8; offset += 1) {
        loadFrame(index + offset);
        loadFrame(index - offset);
      }
    }

    function frameFromScroll() {
      const track = trackRef.current;
      if (!track) {
        return 0;
      }

      const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -track.getBoundingClientRect().top / maxScroll));
      return Math.round(progress * (LANDING_FRAME_COUNT - 1));
    }

    let frameHandle = 0;

    function onScroll() {
      if (frameHandle) {
        return;
      }

      frameHandle = window.requestAnimationFrame(() => {
        frameHandle = 0;
        const index = frameFromScroll();
        currentRef.current = index;
        preloadAround(index);
        paint(index);
      });
    }

    for (let index = 0; index < 12; index += 1) {
      loadFrame(index);
    }

    resize();
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", resize);
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
    };
  }, []);

  return (
    <section
      className="landing-sequence"
      id="inicio"
      ref={trackRef}
      style={{ height: `calc(100vh + ${LANDING_FRAME_COUNT * 28}px)` }}
    >
      <div className="landing-sequence-sticky">
        <canvas aria-hidden="true" className="landing-sequence-canvas" ref={canvasRef} />
        <div className="landing-sequence-scrim" />
        {children}
      </div>
    </section>
  );
}
