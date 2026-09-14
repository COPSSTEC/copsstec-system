"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { changePassword } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { membershipRedirect } from "@/modules/membership/domain/types";
import { getMembershipStatus } from "@/modules/membership/infrastructure/membership-api";

export function ChangePasswordForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const user = await changePassword(token, {
        current_password: currentPassword,
        password,
        password_confirmation: confirmation,
      });
      if (user.access_level === "member") {
        const status = await getMembershipStatus(token);
        router.replace(membershipRedirect(status.gate));
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible actualizar la contraseña.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="form-stack" onSubmit={handleSubmit}>
      <div className="field">
        <label htmlFor="current-password">Contraseña temporal</label>
        <input
          autoComplete="current-password"
          id="current-password"
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </div>

      <div className="field">
        <label htmlFor="password">Nueva contraseña</label>
        <input
          autoComplete="new-password"
          id="password"
          minLength={8}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </div>

      <div className="field">
        <label htmlFor="confirmation">Confirmar nueva contraseña</label>
        <input
          autoComplete="new-password"
          id="confirmation"
          minLength={8}
          onChange={(event) => setConfirmation(event.target.value)}
          required
          type="password"
          value={confirmation}
        />
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" disabled={isLoading} type="submit">
        {isLoading ? "Guardando..." : "Guardar contraseña"}
      </button>
    </form>
  );
}
