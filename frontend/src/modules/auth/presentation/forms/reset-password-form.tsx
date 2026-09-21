"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { resetPassword } from "@/modules/auth/infrastructure/auth-api";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [token, setToken] = useState(searchParams.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);

    try {
      const response = await resetPassword({
        email,
        token,
        password,
        password_confirmation: confirmation,
      });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          value={email}
        />
      </div>

      <div className="field">
        <label htmlFor="token">Token de recuperación</label>
        <input
          id="token"
          onChange={(event) => setToken(event.target.value)}
          type="text"
          value={token}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Nueva contraseña</label>
        <input
          id="password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </div>

      <div className="field">
        <label htmlFor="confirmation">Confirmar contraseña</label>
        <input
          id="confirmation"
          minLength={8}
          onChange={(event) => setConfirmation(event.target.value)}
          type="password"
          value={confirmation}
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-success">{message}</p>}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading ? "Actualizando..." : "Actualizar contraseña"}
      </button>

      <div className="auth-links">
        <Link href="/login">Volver al login</Link>
      </div>
    </form>
  );
}
