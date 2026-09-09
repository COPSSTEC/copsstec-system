"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { AccessPolicy, User } from "@/modules/auth/domain/types";
import { getAccessPolicy, getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { AppHeader } from "@/shared/components/app-header";

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessPolicy, setAccessPolicy] = useState<AccessPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="shell">
      <AppHeader navigation={accessPolicy?.navigation ?? []} user={user} />
      <main className="main">{children}</main>
    </div>
  );
}
