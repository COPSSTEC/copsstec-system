"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { passwordChangeRedirect } from "@/modules/auth/domain/types";
import { login } from "@/modules/auth/infrastructure/auth-api";
import { storeToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email, password);
      storeToken(response.access_token);
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
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          autoComplete="email"
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@copsstec.com"
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <input
          autoComplete="current-password"
          id="password"
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ingresa tu contraseña"
          type="password"
          value={password}
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading ? "Ingresando..." : "Ingresar"}
      </button>

      <p className="muted">
        Los miembros ingresan con el correo corporativo @copsstec.com y la contraseña que reciben
        en su correo personal cuando el administrador aprueba la afiliación.
      </p>

      <div className="auth-links">
        <Link href="/forgot-password">Olvidé mi contraseña</Link>
      </div>
    </form>
  );
}
