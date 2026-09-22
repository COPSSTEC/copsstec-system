"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AccessPolicy, User } from "@/modules/auth/domain/types";
import { passwordChangeRedirect } from "@/modules/auth/domain/types";
import { getAccessPolicy, getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";
import { AppHeader } from "@/shared/components/app-header";
import { AppSidebar } from "@/shared/components/app-sidebar";

interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  if (isLoading) {
    return <main className="main">Cargando sesión...</main>;
  }

  const isBulletin = user?.access_level === "member" && pathname === "/dashboard";

  return (
    <div
      className={`app-shell ${isBulletin ? "app-shell-bulletin" : ""} ${isSidebarOpen ? "is-sidebar-open" : ""}`}
    >
      <AppSidebar
        accessLevel={user?.access_level ?? "restricted"}
        isOpen={isSidebarOpen}
        navigation={accessPolicy?.navigation ?? []}
        onClose={() => setIsSidebarOpen(false)}
      />
      <div className="app-shell-main">
        <AppHeader
          onMenuToggle={() => setIsSidebarOpen((open) => !open)}
          user={user}
          variant={isBulletin ? "bulletin" : "default"}
        />
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
