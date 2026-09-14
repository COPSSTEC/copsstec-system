"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearStoredToken, getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";

export function MembershipPendingApprovalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const token = getStoredToken();

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    const sessionToken = token;

    async function load() {
      try {
        const status = await getMembershipStatus(sessionToken);
        if (status.gate !== "pending_approval") {
          router.replace(membershipRedirect(status.gate));
          return;
        }
        setReady(true);
      } catch {
        router.replace("/login");
      }
    }

    void load();
  }, [router, token]);

  if (!ready) {
    return <main className="affiliation-page">Cargando...</main>;
  }

  return (
    <main className="affiliation-page">
      <div className="affiliation-top">
        <AppLogo />
        <button
          className="secondary-button"
          onClick={() => {
            clearStoredToken();
            router.replace("/login");
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>
      <section className="affiliation-card pending-card">
        <p className="eyebrow">Pago en revisión</p>
        <h1>Tu pago todavía no ha sido aprobado</h1>
        <p>
          Recibimos tu comprobante, pero el administrador aún no confirma el pago. No puedes ingresar
          al dashboard ni al resto del sistema hasta que se apruebe tu afiliación.
        </p>
        <p className="muted">
          Te avisaremos por correo cuando tu cuenta corporativa esté lista. Mientras tanto, cada vez
          que inicies sesión volverás a esta pantalla.
        </p>
      </section>
    </main>
  );
}
