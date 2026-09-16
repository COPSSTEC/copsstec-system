"use client";

import { useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { PublicTopbar } from "@/shared/components/public-topbar";

interface LandingShellProps {
  children: ReactNode;
}

const LEAVE_MS = 300;
const ENTER_MS = 580;

export function LandingShell({ children }: LandingShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [stageClass, setStageClass] = useState("");
  const leaveTimer = useRef(0);
  const enterTimer = useRef(0);
  const firstPath = useRef(true);
  const leavingTo = useRef<string | null>(null);

  useLayoutEffect(() => {
    if (firstPath.current) {
      firstPath.current = false;
      return;
    }

    window.clearTimeout(enterTimer.current);
    setStageClass("is-entering");
    enterTimer.current = window.setTimeout(() => setStageClass(""), ENTER_MS);
  }, [pathname]);

  function handleTopbarNavigate(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }

    if (href === pathname || href === leavingTo.current) {
      event.preventDefault();
      return;
    }

    event.preventDefault();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      router.push(href);
      return;
    }

    leavingTo.current = href;
    window.clearTimeout(leaveTimer.current);
    setStageClass("is-leaving");
    leaveTimer.current = window.setTimeout(() => {
      setStageClass("is-hold");
      router.push(href);
      leavingTo.current = null;
    }, LEAVE_MS);
  }

  return (
    <div className="landing-shell">
      <PublicTopbar onNavigate={handleTopbarNavigate} />
      <div className={`landing-stage ${stageClass}`.trim()}>{children}</div>
    </div>
  );
}
