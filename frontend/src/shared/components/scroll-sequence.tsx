"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { LANDING_FRAME_COUNT, landingFrameSrc } from "@/config/landing-media";

interface ScrollSequenceProps {
  children: ReactNode;
}

const PIXELS_PER_FRAME = 12;
const SMOOTHING = 0.18;
const FRAME_CACHE: Array<HTMLImageElement | null> = Array.from(
  { length: LANDING_FRAME_COUNT },
  () => null,
);

export function ScrollSequence({ children }: ScrollSequenceProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawnRef = useRef<HTMLImageElement | null>(null);
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let alive = true;

    function resize() {
      const next = canvasRef.current;
      const parent = next?.parentElement;
      if (!next || !parent) {
        return;
      }

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      next.width = Math.max(1, Math.floor(width * ratio));
      next.height = Math.max(1, Math.floor(height * ratio));
    }

    function drawFrame(
      context: CanvasRenderingContext2D,
      frame: HTMLImageElement,
      canvasWidth: number,
      canvasHeight: number,
      alpha: number,
    ) {
      const scale = Math.max(canvasWidth / frame.width, canvasHeight / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      context.globalAlpha = alpha;
      context.drawImage(
        frame,
        (canvasWidth - drawWidth) / 2,
        (canvasHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    }

    function paint(progress: number) {
      const nextCanvas = canvasRef.current;
      if (!nextCanvas) {
        return;
      }

      const context = nextCanvas.getContext("2d", { alpha: false });
      if (!context) {
        return;
      }

      const exact = progress * (LANDING_FRAME_COUNT - 1);
      const firstIndex = Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, Math.floor(exact)));
      const secondIndex = Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, firstIndex + 1));
      const blend = exact - firstIndex;
      const first = FRAME_CACHE[firstIndex] ?? lastDrawnRef.current;
      const second = FRAME_CACHE[secondIndex] ?? first;

      if (!first) {
        return;
      }

      lastDrawnRef.current = second ?? first;
      context.globalAlpha = 1;
      context.fillStyle = "#0f172a";
      context.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      drawFrame(context, first, nextCanvas.width, nextCanvas.height, 1);
      if (second && second !== first && blend > 0.01) {
        drawFrame(context, second, nextCanvas.width, nextCanvas.height, blend);
      }
      context.globalAlpha = 1;
      trackRef.current?.style.setProperty("--sequence-progress", progress.toFixed(4));
    }

    function loadFrame(index: number) {
      if (index < 0 || index >= LANDING_FRAME_COUNT || FRAME_CACHE[index]) {
        return;
      }

      const image = new Image();
      image.decoding = "async";
      image.src = landingFrameSrc(index + 1);
      image.onload = () => {
        FRAME_CACHE[index] = image;
      };
    }

    function preloadAround(index: number) {
      loadFrame(index);
      for (let offset = 1; offset <= 24; offset += 1) {
        loadFrame(index + offset);
        loadFrame(index - offset);
      }
    }

    function progressFromScroll() {
      const track = trackRef.current;
      if (!track) {
        return 0;
      }

      const maxScroll = Math.max(1, track.offsetHeight - window.innerHeight);
      return Math.min(1, Math.max(0, -track.getBoundingClientRect().top / maxScroll));
    }

    function loop() {
      if (!alive) {
        return;
      }

      targetRef.current = progressFromScroll();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      displayRef.current = reduced
        ? targetRef.current
        : displayRef.current + (targetRef.current - displayRef.current) * SMOOTHING;
      preloadAround(Math.round(displayRef.current * (LANDING_FRAME_COUNT - 1)));
      paint(displayRef.current);
      rafRef.current = window.requestAnimationFrame(loop);
    }

    function restart() {
      resize();
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(loop);
      }
    }

    for (let index = 0; index < 24; index += 1) {
      loadFrame(index);
    }

    restart();
    window.addEventListener("resize", resize);
    window.addEventListener("pageshow", restart);
    document.addEventListener("visibilitychange", restart);

    return () => {
      alive = false;
      window.removeEventListener("resize", resize);
      window.removeEventListener("pageshow", restart);
      document.removeEventListener("visibilitychange", restart);
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  return (
    <section
      className="landing-sequence"
      id="inicio"
      ref={trackRef}
      style={{ height: `calc(100vh + ${LANDING_FRAME_COUNT * PIXELS_PER_FRAME}px)` }}
    >
      <div className="landing-sequence-sticky">
        <canvas aria-hidden="true" className="landing-sequence-canvas" ref={canvasRef} />
        <div className="landing-sequence-scrim" />
        {children}
      </div>
    </section>
  );
}
