"use client";

import { useLayoutEffect, useRef, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppLogo } from "@/shared/components/app-logo";

interface PublicTopbarProps {
  onNavigate?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}

interface LiquidBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function measure(nav: HTMLElement, target: HTMLElement): LiquidBox {
  const navBox = nav.getBoundingClientRect();
  const box = target.getBoundingClientRect();
  return {
    x: box.left - navBox.left,
    y: box.top - navBox.top,
    width: box.width,
    height: box.height,
  };
}

function visualBox(nav: HTMLElement, el: HTMLSpanElement): LiquidBox | null {
  const box = el.getBoundingClientRect();
  if (box.width < 2) {
    return null;
  }
  const navBox = nav.getBoundingClientRect();
  return {
    x: box.left - navBox.left,
    y: box.top - navBox.top,
    width: box.width,
    height: box.height,
  };
}

function paint(el: HTMLSpanElement, box: LiquidBox) {
  el.style.left = `${box.x}px`;
  el.style.top = `${box.y}px`;
  el.style.width = `${box.width}px`;
  el.style.height = `${box.height}px`;
  el.style.borderRadius = `${box.height / 2}px`;
}

function frames(from: LiquidBox, to: LiquidBox, linger = 0, extraWidth = 0): Keyframe[] {
  const expandX = Math.min(from.x, to.x);
  const expandWidth = Math.max(from.x + from.width, to.x + to.width) - expandX + extraWidth;
  const radius = to.height / 2;
  const stretchRadius = Math.max(16, radius * 0.62);
  const start: Keyframe = {
    left: `${from.x}px`,
    top: `${from.y}px`,
    width: `${from.width}px`,
    height: `${from.height}px`,
    borderRadius: `${radius}px`,
  };
  const stretch: Keyframe = {
    left: `${expandX}px`,
    top: `${to.y}px`,
    width: `${expandWidth}px`,
    height: `${to.height}px`,
    borderRadius: `${stretchRadius}px`,
    offset: linger > 0 ? 0.5 : 0.4,
  };
  const end: Keyframe = {
    left: `${to.x}px`,
    top: `${to.y}px`,
    width: `${to.width}px`,
    height: `${to.height}px`,
    borderRadius: `${radius}px`,
  };

  if (linger > 0) {
    return [start, { ...start, offset: linger }, stretch, end];
  }

  return [start, stretch, end];
}

function stopAnimations(el: HTMLSpanElement) {
  el.getAnimations().forEach((animation) => {
    try {
      animation.commitStyles();
    } catch {
      // La animación ya terminó o el motor no expone commitStyles.
    }
    animation.cancel();
  });
}

export function PublicTopbar({ onNavigate }: PublicTopbarProps) {
  const pathname = usePathname();
  const isOverview = pathname === "/overview";
  const navRef = useRef<HTMLElement>(null);
  const blobsRef = useRef<HTMLSpanElement>(null);
  const fullRef = useRef<HTMLAnchorElement>(null);
  const overviewRef = useRef<HTMLAnchorElement>(null);
  const liquidRef = useRef<HTMLSpanElement>(null);
  const trailRef = useRef<HTMLSpanElement>(null);
  const pouredHref = useRef<string | null>(null);

  function pourTo(target: HTMLAnchorElement | null, instant = false) {
    const nav = navRef.current;
    const liquid = liquidRef.current;
    const trail = trailRef.current;
    const blobs = blobsRef.current;

    if (!nav || !liquid || !trail || !blobs || !target) {
      return;
    }

    const next = measure(nav, target);
    const visual = visualBox(nav, liquid);
    const trailVisual = visualBox(nav, trail);
    stopAnimations(liquid);
    stopAnimations(trail);

    if (!visual || instant || prefersReducedMotion()) {
      paint(liquid, next);
      paint(trail, next);
      blobs.classList.add("is-ready");
      return;
    }

    if (Math.abs(next.x - visual.x) < 1 && Math.abs(next.width - visual.width) < 1) {
      paint(liquid, next);
      paint(trail, next);
      return;
    }

    blobs.classList.add("is-ready");
    const liquidMotion = liquid.animate(frames(visual, next), {
      duration: 820,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "forwards",
    });
    const trailMotion = trail.animate(frames(trailVisual ?? visual, next, 0.18, 14), {
      duration: 1040,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      fill: "forwards",
    });
    const settle = () => {
      paint(liquid, next);
      paint(trail, next);
    };
    liquidMotion.finished.then(settle).catch(() => undefined);
    trailMotion.finished.then(settle).catch(() => undefined);
  }

  useLayoutEffect(() => {
    const href = isOverview ? "/overview" : "/";
    const active = isOverview ? overviewRef.current : fullRef.current;

    if (pouredHref.current === href) {
      pouredHref.current = null;
    } else {
      pourTo(active, false);
    }

    function onResize() {
      pourTo(isOverview ? overviewRef.current : fullRef.current, true);
    }

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOverview]);

  function handleClick(event: MouseEvent<HTMLAnchorElement>, href: string) {
    const nextHref = href === "/overview" ? "/overview" : "/";
    const target = nextHref === "/overview" ? overviewRef.current : fullRef.current;
    pouredHref.current = nextHref;
    pourTo(target);
    onNavigate?.(event, href);
  }

  return (
    <header className="landing-topbar">
      <svg aria-hidden="true" className="landing-topbar-filter" height="0" width="0">
        <filter id="landing-liquid-filter" x="-50%" y="-80%" width="200%" height="260%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="8" />
          <feColorMatrix
            in="blur"
            mode="matrix"
            result="goo"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
          />
          <feComposite in="SourceGraphic" in2="goo" operator="atop" />
        </filter>
      </svg>
      <div className="landing-topbar-pill">
        <Link aria-label="Inicio COPSSTEC" className="landing-topbar-brand" href="/" onClick={(event) => handleClick(event, "/")}>
          <AppLogo compact />
        </Link>
        <nav aria-label="Navegación pública" className="landing-topbar-nav" ref={navRef}>
          <span className="landing-topbar-blobs" aria-hidden="true" ref={blobsRef}>
            <span className="landing-topbar-liquid-trail" ref={trailRef} />
            <span className="landing-topbar-liquid" ref={liquidRef} />
          </span>
          <Link
            className={`landing-topbar-link ${isOverview ? "" : "is-active"}`.trim()}
            href="/"
            onClick={(event) => handleClick(event, "/")}
            ref={fullRef}
          >
            Full view
          </Link>
          <Link
            className={`landing-topbar-link ${isOverview ? "is-active" : ""}`.trim()}
            href="/overview"
            onClick={(event) => handleClick(event, "/overview")}
            ref={overviewRef}
          >
            Overview
          </Link>
        </nav>
      </div>
    </header>
  );
}
