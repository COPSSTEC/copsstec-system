"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearStoredToken, getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import {
  getMembershipStatus,
  getPaymentInfo,
  uploadPaymentVoucher,
} from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import type { PaymentInfo } from "@/modules/membership/domain/types";

export function MembershipPaymentPage() {
  const router = useRouter();
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        if (status.gate !== "payment") {
          router.replace(membershipRedirect(status.gate));
          return;
        }
        setInfo(await getPaymentInfo(sessionToken));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el pago.");
      }
    }

    void load();
  }, [router, token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }
    const file = new FormData(event.currentTarget).get("voucher");
    if (!(file instanceof File) || file.size === 0) {
      setError("Debes adjuntar el comprobante de pago.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await uploadPaymentVoucher(token, file);
      router.replace("/afiliacion/en-revision");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el comprobante.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const qrSrc = info
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(info.qr_payload)}`
    : null;

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

      <section className="affiliation-card">
        <h1>Pago de afiliación</h1>
        <p className="muted">
          Escanea el QR o transfiere a la cuenta. Luego sube el comprobante. El administrador aprobará
          tu solicitud cuando confirme el pago.
        </p>
        {info ? (
          <div className="payment-grid">
            <div className="payment-qr">
              {qrSrc ? <img alt="QR de transferencia COPSSTEC" src={qrSrc} /> : null}
              <small>Al escanear verás los datos de la transferencia.</small>
            </div>
            <dl className="payment-details">
              <div>
                <dt>Banco</dt>
                <dd>{info.bank_name}</dd>
              </div>
              <div>
                <dt>Tipo de cuenta</dt>
                <dd>{info.account_type}</dd>
              </div>
              <div>
                <dt>Número</dt>
                <dd>{info.account_number}</dd>
              </div>
              <div>
                <dt>Titular</dt>
                <dd>{info.account_holder}</dd>
              </div>
              {info.account_ruc ? (
                <div>
                  <dt>RUC</dt>
                  <dd>{info.account_ruc}</dd>
                </div>
              ) : null}
              <div>
                <dt>Valor</dt>
                <dd>
                  {info.currency} {info.amount}
                </dd>
              </div>
              <div>
                <dt>Referencia</dt>
                <dd>{info.reference}</dd>
              </div>
            </dl>
          </div>
        ) : (
          <p className="muted">Cargando datos de pago...</p>
        )}

        <form className="form-stack" onSubmit={handleSubmit}>
          <label className="field">
            Comprobante de pago
            <input accept="image/png,image/jpeg,image/webp" name="voucher" required type="file" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="create-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Subiendo..." : "Subir comprobante"}
          </button>
        </form>
        <p className="muted">
          Si sales ahora, al iniciar sesión volverás a esta página hasta que completes el pago.{" "}
          <Link href="/">Volver al inicio</Link>
        </p>
      </section>
    </main>
  );
}
