"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { passwordChangeRedirect } from "@/modules/auth/domain/types";
import { login } from "@/modules/auth/infrastructure/auth-api";
import { storeToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";

const REMEMBER_EMAIL_KEY = "copsstec.remember_email";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY);

    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email, password);
      storeToken(response.access_token);

      if (rememberMe) {
        window.localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      if (response.user.must_change_password) {
        router.replace(passwordChangeRedirect());
        return;
      }
      if (response.user.access_level === "member") {
        const status = await getMembershipStatus(response.access_token);
        router.replace(membershipRedirect(status.gate));
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar sesión.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="login-field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nombre@ejemplo.com"
          required
          type="email"
          value={email}
        />
      </div>

      <div className="login-field">
        <label htmlFor="password">Contraseña</label>
        <div className="login-password-wrap">
          <input
            autoComplete="current-password"
            id="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
            type={showPassword ? "text" : "password"}
            value={password}
          />
          <button
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="login-password-toggle"
            onClick={() => setShowPassword((current) => !current)}
            type="button"
          >
            {showPassword ? (
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d="M3 3l18 18M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a12.3 12.3 0 01-3.2 4.4M6.1 6.1A12.2 12.2 0 001 12.5C2.7 16.9 7 20 12 20c1.5 0 2.9-.3 4.2-.8"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth="1.8"
                />
              </svg>
            ) : (
              <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
                <path
                  d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <circle cx="12" cy="12.5" r="2.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {error && <p className="login-error">{error}</p>}

      <label className="login-remember">
        <input
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          type="checkbox"
        />
        Recordarme
      </label>

      <button className="login-submit" disabled={isLoading} type="submit">
        {isLoading ? "Ingresando..." : "Iniciar sesión"}
      </button>

      <p className="login-register">
        ¿Aún no tienes una cuenta? <Link href="/afiliacion">Regístrate</Link>
      </p>
    </form>
  );
}
