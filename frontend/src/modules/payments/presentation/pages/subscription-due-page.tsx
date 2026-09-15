"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { clearStoredToken, getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";
import { formatIsoDate, formatUsd } from "@/modules/payments/domain/types";
import { RenewalVoucherForm } from "@/modules/payments/presentation/components/renewal-voucher-form";
import { useMyPayments } from "@/modules/payments/presentation/hooks/use-my-payments";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

export function SubscriptionDuePage() {
  const router = useRouter();
  const token = getStoredToken();
  const [ready, setReady] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const payments = useMyPayments(ready);

  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    const sessionToken = token;

    async function load() {
      try {
        const status = await getMembershipStatus(sessionToken);
        if (status.gate !== "subscription_due") {
          router.replace(membershipRedirect(status.gate));
          return;
        }
        setReady(true);
      } catch (err) {
        setGateError(err instanceof Error ? err.message : "No se pudo verificar la suscripción.");
      }
    }

    void load();
  }, [router, token]);

  const inReview = payments.openPayment?.status === "pending_review";

  if (!ready && !gateError) {
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
        <p className="eyebrow">Suscripción pendiente</p>
        <h1>Tu suscripción está pendiente de cancelación. Debes cancelar tu cuota para acceder al contenido.</h1>
        {inReview ? (
          <p>
            Recibimos tu comprobante. Cuando el administrador lo apruebe se renovará tu membresía.
          </p>
        ) : (
          <p className="muted">
            Escanea el QR o transfiere a la cuenta. Elige cuota mensual o anual y sube el comprobante.
          </p>
        )}

        {payments.subscription ? (
          <dl className="payment-details">
            <div>
              <dt>Cobertura hasta</dt>
              <dd>{formatIsoDate(payments.subscription.coverage_until)}</dd>
            </div>
            <div>
              <dt>Saldo a favor</dt>
              <dd>{formatUsd(payments.subscription.credit_balance)}</dd>
            </div>
            {payments.subscription.days_overdue > 0 ? (
              <div>
                <dt>Días de mora</dt>
                <dd>{payments.subscription.days_overdue}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        {gateError || payments.error ? (
          <p className="form-error">{gateError ?? payments.error}</p>
        ) : null}

        <RenewalVoucherForm
          error={payments.error}
          isSubmitting={payments.isSubmitting}
          onUpload={payments.uploadVoucher}
          openPayment={payments.openPayment}
          paymentInfo={payments.paymentInfo}
        />
      </section>
      <PublicFooter />
    </main>
  );
}
