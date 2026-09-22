"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { User } from "@/modules/auth";
import { getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { ProfileSummary } from "@/modules/dashboard/presentation/components/profile-summary";
import { StatCard } from "@/modules/dashboard/presentation/components/stat-card";
import { AdminDashboardPage } from "@/modules/dashboard/presentation/pages/admin-dashboard-page";
import { MemberNewspaperPage } from "@/modules/dashboard/presentation/pages/member-newspaper-page";

export function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getStoredToken();

    if (token === null) {
      router.replace("/login");
      return;
    }

    const sessionToken = token;

    async function loadUser() {
      try {
        setUser(await getCurrentUser(sessionToken));
      } catch {
        router.replace("/login");
      }
    }

    void loadUser();
  }, [router]);

  if (user === null) {
    return <p className="muted">Cargando dashboard...</p>;
  }

  if (user.access_level === "admin") {
    return <AdminDashboardPage />;
  }

  if (user.access_level === "member") {
    return (
      <Suspense fallback={<p className="muted">Cargando el boletín...</p>}>
        <MemberNewspaperPage user={user} />
      </Suspense>
    );
  }

  return (
    <>
      <section className="page-heading">
        <h1>Dashboard</h1>
        <p>
          Bienvenido, {user.name}. Tu nivel de acceso actual es{" "}
          <strong>{user.access_level}</strong>.
        </p>
      </section>

      <div className="grid">
        <StatCard
          description="Roles asociados desde la tabla roles."
          title="Roles"
          value={user.roles.length.toString()}
        />
        <StatCard
          description="Perfil vinculado por profiles.user_id."
          title="Perfil"
          value={user.profile ? "Activo" : "Pendiente"}
        />
        <StatCard
          description="Rutas visibles según política RBAC."
          title="Accesos"
          value={user.allowed_routes.length.toString()}
        />
      </div>

      <ProfileSummary user={user} />
    </>
  );
}
