"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { LANDING_FRAME_COUNT, landingFrameSrc } from "@/config/landing-media";

interface ScrollSequenceProps {
  children: ReactNode;
}

const PIXELS_PER_FRAME = 12;
const SMOOTHING = 0.18;
const PRELOAD_RADIUS = 6;
const KEEP_RADIUS = 10;
const MAX_PIXEL_RATIO = 1.25;
const FRAME_CACHE: Array<HTMLImageElement | null> = Array.from(
  { length: LANDING_FRAME_COUNT },
  () => null,
);

function frameReady(image: HTMLImageElement | null): image is HTMLImageElement {
  return Boolean(image && image.complete && image.naturalWidth > 0);
}

export function ScrollSequence({ children }: ScrollSequenceProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastDrawnRef = useRef<HTMLImageElement | null>(null);
  const targetRef = useRef(0);
  const displayRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const track = trackRef.current;
    if (!canvas || !track) {
      return;
    }

    let alive = true;
    let inView = false;
    let loadedIndex = -1;
    let context: CanvasRenderingContext2D | null = null;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function ensureContext() {
      const nextCanvas = canvasRef.current;
      if (!nextCanvas) {
        return null;
      }
      context ??= nextCanvas.getContext("2d", { alpha: false });
      return context;
    }

    function resize() {
      const next = canvasRef.current;
      const parent = next?.parentElement;
      if (!next || !parent) {
        return;
      }

      const width = parent.clientWidth;
      const height = parent.clientHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      next.width = Math.max(1, Math.floor(width * ratio));
      next.height = Math.max(1, Math.floor(height * ratio));
    }

    function drawFrame(
      drawing: CanvasRenderingContext2D,
      frame: HTMLImageElement,
      canvasWidth: number,
      canvasHeight: number,
    ) {
      const scale = Math.max(canvasWidth / frame.width, canvasHeight / frame.height);
      const drawWidth = frame.width * scale;
      const drawHeight = frame.height * scale;
      drawing.drawImage(
        frame,
        (canvasWidth - drawWidth) / 2,
        (canvasHeight - drawHeight) / 2,
        drawWidth,
        drawHeight,
      );
    }

    function paint(progress: number) {
      const nextCanvas = canvasRef.current;
      const drawing = ensureContext();
      trackRef.current?.style.setProperty("--sequence-progress", progress.toFixed(4));
      if (!nextCanvas || !drawing) {
        return;
      }

      const exact = progress * (LANDING_FRAME_COUNT - 1);
      const index = Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, Math.round(exact)));
      const nearest = FRAME_CACHE[index];
      const frame = frameReady(nearest) ? nearest : lastDrawnRef.current;
      if (!frameReady(frame)) {
        return;
      }

      lastDrawnRef.current = frame;
      drawing.globalAlpha = 1;
      drawing.fillStyle = "#0f172a";
      drawing.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
      drawFrame(drawing, frame, nextCanvas.width, nextCanvas.height);
    }

    function releaseFrame(index: number) {
      const image = FRAME_CACHE[index];
      if (!image) {
        return;
      }

      image.onload = null;
      image.onerror = null;
      image.src = "";
      if (lastDrawnRef.current === image) {
        lastDrawnRef.current = null;
      }
      FRAME_CACHE[index] = null;
    }

    function loadFrame(index: number) {
      if (index < 0 || index >= LANDING_FRAME_COUNT || FRAME_CACHE[index]) {
        return;
      }

      const image = new Image();
      image.decoding = "async";
      FRAME_CACHE[index] = image;
      image.onerror = () => {
        if (FRAME_CACHE[index] === image) {
          FRAME_CACHE[index] = null;
        }
      };
      image.src = landingFrameSrc(index + 1);
    }

    function syncWindow(index: number) {
      if (index === loadedIndex) {
        return;
      }

      loadedIndex = index;
      for (let frameIndex = 0; frameIndex < LANDING_FRAME_COUNT; frameIndex += 1) {
        if (Math.abs(frameIndex - index) > KEEP_RADIUS) {
          releaseFrame(frameIndex);
        }
      }

      loadFrame(index);
      for (let offset = 1; offset <= PRELOAD_RADIUS; offset += 1) {
        loadFrame(index + offset);
        loadFrame(index - offset);
      }
    }

    function progressFromScroll() {
      const current = trackRef.current;
      if (!current) {
        return 0;
      }

      const maxScroll = Math.max(1, current.offsetHeight - window.innerHeight);
      return Math.min(1, Math.max(0, -current.getBoundingClientRect().top / maxScroll));
    }

    function loop() {
      if (!alive || !inView) {
        rafRef.current = 0;
        return;
      }

      targetRef.current = progressFromScroll();
      displayRef.current = reducedMotion.matches
        ? targetRef.current
        : displayRef.current + (targetRef.current - displayRef.current) * SMOOTHING;
      const index = Math.max(
        0,
        Math.min(LANDING_FRAME_COUNT - 1, Math.round(displayRef.current * (LANDING_FRAME_COUNT - 1))),
      );
      syncWindow(index);
      paint(displayRef.current);
      rafRef.current = window.requestAnimationFrame(loop);
    }

    function stopLoop() {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }

    function startLoop() {
      if (!alive || !inView || document.visibilityState === "hidden" || rafRef.current) {
        return;
      }
      rafRef.current = window.requestAnimationFrame(loop);
    }

    function restart() {
      resize();
      startLoop();
      paint(displayRef.current);
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        stopLoop();
        return;
      }
      restart();
    }

    const observer = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) {
        restart();
        return;
      }
      stopLoop();
    });

    displayRef.current = progressFromScroll();
    targetRef.current = displayRef.current;
    syncWindow(
      Math.max(0, Math.min(LANDING_FRAME_COUNT - 1, Math.round(displayRef.current * (LANDING_FRAME_COUNT - 1)))),
    );
    observer.observe(track);
    window.addEventListener("resize", restart);
    window.addEventListener("pageshow", restart);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      observer.disconnect();
      window.removeEventListener("resize", restart);
      window.removeEventListener("pageshow", restart);
      document.removeEventListener("visibilitychange", onVisibility);
      stopLoop();
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
