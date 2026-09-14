"use client";

import { useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { downloadMembershipInvoice } from "@/modules/membership/infrastructure/membership-api";

export function MembershipInvoiceCard() {
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setIsDownloading(true);
    setError(null);
    try {
      await downloadMembershipInvoice(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Aún no hay una factura disponible.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <section className="card">
      <h2>Factura de afiliación</h2>
      <p className="muted">
        Cuando el administrador aprueba tu pago, la factura queda disponible en este espacio.
      </p>
      {error ? <p className="form-error">{error}</p> : null}
      <button className="primary-button" disabled={isDownloading} onClick={() => void handleDownload()} type="button">
        {isDownloading ? "Descargando..." : "Descargar factura"}
      </button>
    </section>
  );
}
