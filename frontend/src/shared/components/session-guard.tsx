"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

const SESSION_EXPIRED_EVENT = "copsstec:session-expired";

const PUBLIC_SESSION_PATHS = new Set([
  "/login",
  "/continuar-afiliacion",
  "/forgot-password",
  "/reset-password",
  "/afiliacion",
]);

interface SessionGuardProps {
  children: ReactNode;
}

export function SessionGuard({ children }: SessionGuardProps) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function handleExpired() {
      if (PUBLIC_SESSION_PATHS.has(pathname)) {
        return;
      }
      router.replace("/login");
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [pathname, router]);

  return children;
}
