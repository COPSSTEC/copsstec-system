"use client";

import { useEffect, useRef } from "react";

interface ScrollFillTitleProps {
  lines: readonly string[];
}

export function ScrollFillTitle({ lines }: ScrollFillTitleProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const letters = lines.join("\n").split("");

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) {
      return;
    }

    const spans = Array.from(node.querySelectorAll<HTMLSpanElement>("[data-letter]"));

    function update() {
      const section = node?.closest(".landing-cta");
      if (!section || !node) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const max = Math.max(1, section.clientHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, -rect.top / max));
      const total = Math.max(1, spans.length - 1);

      spans.forEach((span, index) => {
        const start = index / (total + 10);
        const end = (index + 8) / (total + 10);
        const local = Math.min(1, Math.max(0, (progress - start) / Math.max(0.04, end - start)));
        span.style.opacity = String(local);
        span.style.transform = `translate3d(${(1 - local) * -42}px, 0, 0)`;
      });
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="landing-cta-title-wrap" ref={sectionRef}>
      <h2 className="landing-cta-title">
        {letters.map((character, index) =>
          character === "\n" ? (
            <br key={`br-${index}`} />
          ) : (
            <span data-letter key={`${character}-${index}`}>
              {character === " " ? "\u00a0" : character}
            </span>
          ),
        )}
      </h2>
    </div>
  );
}
