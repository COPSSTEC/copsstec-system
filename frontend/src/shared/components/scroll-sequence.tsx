"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { LANDING_FRAME_COUNT, landingFrameSrc } from "@/config/landing-media";

interface ScrollSequenceProps {
  children: ReactNode;
}

const PIXELS_PER_FRAME = 48;
const SMOOTHING = 0.12;

export function ScrollSequence({ children }: ScrollSequenceProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<Array<HTMLImageElement | null>>(
    Array.from({ length: LANDING_FRAME_COUNT }, () => null),
  );
  const loadingRef = useRef<Array<boolean>>(Array.from({ length: LANDING_FRAME_COUNT }, () => false));
  const lastDrawnRef = useRef<HTMLImageElement | null>(null);
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafRef = useRef(0);

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
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      next.width = Math.max(1, Math.floor(width * ratio));
      next.height = Math.max(1, Math.floor(height * ratio));
      paint(displayRef.current);
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
      const offsetX = (canvasWidth - drawWidth) / 2;
      const offsetY = (canvasHeight - drawHeight) / 2;
      context.globalAlpha = alpha;
      context.drawImage(frame, offsetX, offsetY, drawWidth, drawHeight);
    }

    function paint(progress: number) {
      const nextCanvas = canvasRef.current;
      const context = nextCanvas?.getContext("2d", { alpha: false });
      if (!nextCanvas || !context) {
        return;
      }

      const exact = progress * (LANDING_FRAME_COUNT - 1);
      const firstIndex = Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, Math.floor(exact)));
      const secondIndex = Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, firstIndex + 1));
      const blend = exact - firstIndex;
      const first = framesRef.current[firstIndex] ?? lastDrawnRef.current;
      const second = framesRef.current[secondIndex] ?? first;

      if (!first) {
        return;
      }

      lastDrawnRef.current = second ?? first;
      context.fillStyle = "#0f172a";
      context.globalAlpha = 1;
      context.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      drawFrame(context, first, nextCanvas.width, nextCanvas.height, 1);
      if (second && second !== first && blend > 0.01) {
        drawFrame(context, second, nextCanvas.width, nextCanvas.height, blend);
      }
      context.globalAlpha = 1;

      trackRef.current?.style.setProperty("--sequence-progress", progress.toFixed(4));
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
        const current = displayRef.current * (LANDING_FRAME_COUNT - 1);
        if (Math.abs(current - index) < 2) {
          paint(displayRef.current);
        }
      };
      image.onerror = () => {
        loadingRef.current[index] = false;
      };
    }

    function preloadAround(index: number) {
      loadFrame(index);
      for (let offset = 1; offset <= 18; offset += 1) {
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

    function tick() {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const next = reduced
        ? targetRef.current
        : displayRef.current + (targetRef.current - displayRef.current) * SMOOTHING;
      displayRef.current = next;
      paint(next);

      if (Math.abs(targetRef.current - displayRef.current) > 0.00035) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      displayRef.current = targetRef.current;
      paint(displayRef.current);
      rafRef.current = 0;
    }

    function syncFromScroll() {
      targetRef.current = progressFromScroll();
      preloadAround(Math.round(targetRef.current * (LANDING_FRAME_COUNT - 1)));
      if (!rafRef.current) {
        rafRef.current = window.requestAnimationFrame(tick);
      }
    }

    for (let index = 0; index < 20; index += 1) {
      loadFrame(index);
    }

    resize();
    syncFromScroll();
    window.addEventListener("scroll", syncFromScroll, { passive: true });
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("scroll", syncFromScroll);
      window.removeEventListener("resize", resize);
      if (rafRef.current) {
        window.cancelAnimationFrame(rafRef.current);
      }
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
