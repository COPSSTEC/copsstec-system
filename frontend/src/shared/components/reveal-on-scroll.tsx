"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface RevealOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "up" | "left" | "right";
}

export function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  from = "up",
}: RevealOnScrollProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        node.classList.toggle("is-inview", entry.isIntersecting);
      },
      { threshold: 0.16, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`reveal-on-scroll reveal-from-${from} ${className}`.trim()}
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
