"use client";

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AccessPolicy, User } from "@/modules/auth/domain/types";
import { passwordChangeRedirect } from "@/modules/auth/domain/types";
import { getAccessPolicy, getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";
import { AppHeader } from "@/shared/components/app-header";
import { AppSidebar } from "@/shared/components/app-sidebar";
import { RouteLoader } from "@/shared/components/route-loader";

interface DashboardShellProps {
  children: ReactNode;
}

function isInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function sameLocation(href: string, pathname: string) {
  const [path] = href.split("?");
  return path === pathname;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const hideTimer = useRef(0);

  useEffect(() => {
    const token = getStoredToken();

    if (token === null) {
      router.replace("/login");
      return;
    }

    const sessionToken = token;

    async function loadSession() {
      try {
        const [currentUser, policy] = await Promise.all([
          getCurrentUser(sessionToken),
          getAccessPolicy(sessionToken),
        ]);

        if (currentUser.must_change_password) {
          router.replace(passwordChangeRedirect());
          return;
        }

        if (currentUser.access_level === "member" || currentUser.state_id === 2) {
          const status = await getMembershipStatus(sessionToken);
          const nextPath = membershipPathForStatus(status);
          if (nextPath !== "/dashboard") {
            router.replace(nextPath);
            return;
          }
        }

        setUser(currentUser);
        setAccessPolicy(policy);
      } catch {
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    }

    void loadSession();
  }, [router]);

  function startRouting(href?: string) {
    if (href && sameLocation(href, pathname)) {
      return;
    }

    window.clearTimeout(hideTimer.current);
    setIsRouting(true);
  }

  useEffect(() => {
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setIsRouting(false), 320);
    return () => window.clearTimeout(hideTimer.current);
  }, [pathname]);

  useEffect(() => {
    if (!isRouting) {
      return;
    }

    const timeout = window.setTimeout(() => setIsRouting(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [isRouting]);

  function handleShellClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    if (link.target === "_blank" || link.hasAttribute("download") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const href = link.getAttribute("href");
    if (!href || !isInternalHref(href) || href.startsWith("#")) {
      return;
    }

    startRouting(href);
  }

  if (isLoading) {
    return (
      <main className="main app-session-loading">
        <RouteLoader label="Cargando sesión" />
      </main>
    );
  }

  return (
    <div
      className={`app-shell ${isSidebarOpen ? "is-sidebar-open" : ""} ${isRouting ? "is-routing" : ""}`}
      onClickCapture={handleShellClick}
    >
      <div className={`app-route-bar ${isRouting ? "is-active" : ""}`} />
      <AppSidebar
        accessLevel={user?.access_level ?? "restricted"}
        isOpen={isSidebarOpen}
        navigation={accessPolicy?.navigation ?? []}
        onClose={() => setIsSidebarOpen(false)}
        onNavigate={startRouting}
      />
      <div className="app-shell-main">
        <AppHeader
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
          onNavigate={startRouting}
          user={user}
          variant={user?.access_level === "member" ? "bulletin" : "default"}
        />
        <main className="main">
          <div className="app-module" key={pathname}>
            {children}
          </div>
          {isRouting ? <RouteLoader /> : null}
        </main>
      </div>
    </div>
  );
}
