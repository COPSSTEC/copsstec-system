"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { endClientSession } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

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
        if (membershipPathForStatus(status) !== "/afiliacion/en-revision") {
          router.replace(membershipPathForStatus(status));
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
            void endClientSession().then(() => router.replace("/login"));
          }}
          type="button"
        >
          Cerrar sesión
        </button>
      </div>
      <section className="affiliation-card pending-card">
        <p className="eyebrow">Solicitud en revisión</p>
        <h1>Tus documentos ya fueron recibidos</h1>
        <p>
          Recibimos tu comprobante de pago, la autorización firmada y la copia de tu cédula. El
          administrador revisará tu solicitud. No puedes ingresar al dashboard hasta que se apruebe
          tu afiliación.
        </p>
        <p className="muted">
          Cuando te aprueben, te llegará por correo electrónico tu usuario corporativo, la
          contraseña y el resto de la información de acceso. Cada vez que inicies sesión volverás a
          esta pantalla hasta que eso ocurra.
        </p>
      </section>
      <PublicFooter />
    </main>
  );
}
