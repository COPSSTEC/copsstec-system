"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { forgotPassword } from "@/modules/auth/infrastructure/auth-api";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setResetToken(null);
    setError(null);
    setIsLoading(true);

    try {
      const response = await forgotPassword(email);
      setMessage(response.message);
      setResetToken(response.reset_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible generar la solicitud.");
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
          placeholder="usuario@copsstec.com"
          type="email"
          value={email}
        />
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && (
        <p className="form-success">
          {message} Si el correo existe, te enviamos un mensaje con el enlace para restablecer la contraseña.
        </p>
      )}
      {resetToken && (
        <p className="muted">
          Token local de prueba: <strong>{resetToken}</strong>
        </p>
      )}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading ? "Generando..." : "Solicitar recuperación"}
      </button>

      <div className="auth-links">
        <Link href="/login">Volver al login</Link>
        <Link href="/reset-password">Ya tengo un token</Link>
      </div>
    </form>
  );
}
