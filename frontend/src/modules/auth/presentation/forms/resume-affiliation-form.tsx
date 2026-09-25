"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import {
  requestAffiliationResume,
  verifyAffiliationResume,
} from "@/modules/auth/infrastructure/auth-api";
import { storeSession } from "@/modules/auth/infrastructure/auth-storage";
import { membershipPathForStatus } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";

const RESEND_COOLDOWN_SECONDS = 60;

export function ResumeAffiliationForm() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode(targetEmail: string) {
    const response = await requestAffiliationResume(targetEmail);
    setMessage(response.message);
    setDebugCode(response.debug_code ?? null);
    setStep(2);
    setCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setDebugCode(null);
    setIsLoading(true);

    try {
      await sendCode(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible enviar el código.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const session = await verifyAffiliationResume(email.trim(), code.trim());
      storeSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
      });
      const status = await getMembershipStatus(session.access_token);
      router.replace(membershipPathForStatus(status));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No pudimos validar el código. Revisa el correo o solicita uno nuevo.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || isLoading) {
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      await sendCode(email.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible reenviar el código.");
    } finally {
      setIsLoading(false);
    }
  }

  if (step === 1) {
    return (
      <form className="login-form" onSubmit={handleEmailSubmit}>
        <div className="login-field">
          <label htmlFor="resume-email">Correo electrónico</label>
          <input
            autoComplete="email"
            id="resume-email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="correo@ejemplo.com"
            required
            type="email"
            value={email}
          />
        </div>

        {error ? <p className="login-error">{error}</p> : null}

        <button className="login-submit" disabled={isLoading} type="submit">
          {isLoading ? "Enviando..." : "Enviar código"}
        </button>

        <p className="login-register">
          <Link href="/login">Volver al inicio de sesión</Link>
        </p>
      </form>
    );
  }

  return (
    <form className="login-form" onSubmit={handleVerifySubmit}>
      <p className="login-step-copy">
        Enviamos un código de 6 dígitos a <strong>{email}</strong>.
      </p>

      <div className="login-field login-code-field">
        <label htmlFor="resume-code">Código</label>
        <input
          autoComplete="one-time-code"
          className="login-code-input"
          id="resume-code"
          inputMode="numeric"
          maxLength={6}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          pattern="\d{6}"
          placeholder="000000"
          required
          type="text"
          value={code}
        />
      </div>

      {message ? <p className="form-success">{message}</p> : null}
      {debugCode ? (
        <p className="muted">
          Código local de prueba: <strong>{debugCode}</strong>
        </p>
      ) : null}
      {error ? <p className="login-error">{error}</p> : null}

      <div className="login-step-actions">
        <button className="login-submit" disabled={isLoading || code.length !== 6} type="submit">
          {isLoading ? "Validando..." : "Continuar"}
        </button>
        <button
          className="login-secondary"
          disabled={isLoading || cooldown > 0}
          onClick={() => void handleResend()}
          type="button"
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : "Reenviar código"}
        </button>
      </div>

      <p className="login-register">
        <button
          className="login-text-button"
          onClick={() => {
            setStep(1);
            setCode("");
            setError(null);
            setMessage(null);
            setDebugCode(null);
          }}
          type="button"
        >
          Usar otro correo
        </button>
        {" · "}
        <Link href="/login">Volver al inicio de sesión</Link>
      </p>
    </form>
  );
}
