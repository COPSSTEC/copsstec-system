"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { endClientSession } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus } from "@/modules/membership/domain/types";
import {
  downloadAffiliationCommitmentPdf,
  getMembershipStatus,
} from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

const AUTO_DOWNLOAD_KEY = "copsstec-compromiso-auto-download";

export function MembershipPendingApprovalPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  useEffect(() => {
    if (!ready || !token) {
      return;
    }
    if (sessionStorage.getItem(AUTO_DOWNLOAD_KEY) === token) {
      return;
    }

    sessionStorage.setItem(AUTO_DOWNLOAD_KEY, token);
    void downloadAffiliationCommitmentPdf(token).catch((err) => {
      sessionStorage.removeItem(AUTO_DOWNLOAD_KEY);
      setError(err instanceof Error ? err.message : "No se pudo descargar el compromiso de afiliación.");
    });
  }, [ready, token]);

  async function handleDownload() {
    if (!token) {
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      await downloadAffiliationCommitmentPdf(token);
      sessionStorage.setItem(AUTO_DOWNLOAD_KEY, token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el compromiso de afiliación.");
    } finally {
      setIsDownloading(false);
    }
  }

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
          Descarga tu compromiso de afiliación. El archivo se genera con tus datos y debe quedar en
          tu correo o carpeta de descargas.
        </p>
        <div className="pending-download">
          <button className="create-button" disabled={isDownloading} onClick={() => void handleDownload()} type="button">
            {isDownloading ? "Descargando..." : "Descargar compromiso de afiliación"}
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
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
