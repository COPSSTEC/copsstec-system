"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { User } from "@/modules/auth";
import { getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";

function ProfileItem({ label, value }: { label: string; value: string | number | boolean | null }) {
  return (
    <div className="profile-item">
      <span>{label}</span>
      <strong>{value === null || value === "" ? "No registrado" : String(value)}</strong>
    </div>
  );
}

export function ProfilePage() {
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
    return <p className="muted">Cargando perfil...</p>;
  }

  if (user.profile === null) {
    return (
      <section className="card">
        <h1>Perfil pendiente</h1>
        <p className="muted">
          Tu usuario existe, pero todavía no tiene un perfil asociado.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="page-heading">
        <h1>Mi perfil</h1>
        <p>Información cargada desde la tabla profiles.</p>
      </section>

      <section className="card">
        <div className="profile-list">
          <ProfileItem label="Nombres" value={user.profile.names} />
          <ProfileItem label="Apellidos" value={user.profile.lastname} />
          <ProfileItem label="Identificación" value={user.profile.identifier} />
          <ProfileItem label="Correo" value={user.profile.email} />
          <ProfileItem label="Fecha de nacimiento" value={user.profile.birtday} />
          <ProfileItem label="Tipo de sangre" value={user.profile.blood_type} />
          <ProfileItem label="Celular" value={user.profile.mobile_phone} />
          <ProfileItem label="Teléfono fijo" value={user.profile.fixed_phone} />
          <ProfileItem label="Título académico" value={user.profile.title_academic} />
          <ProfileItem label="Nivel académico" value={user.profile.level_academic} />
          <ProfileItem label="Código Senescyt" value={user.profile.cod_senescyt} />
          <ProfileItem label="Género" value={user.profile.gender} />
          <ProfileItem label="Provincia" value={user.profile.province} />
          <ProfileItem label="Ciudad" value={user.profile.city} />
          <ProfileItem label="Notificaciones" value={user.profile.want_notifications} />
          <ProfileItem label="Trabaja" value={user.profile.is_work} />
        </div>
      </section>
    </>
  );
}
