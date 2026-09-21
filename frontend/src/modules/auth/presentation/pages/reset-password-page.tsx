import { Suspense } from "react";

import { ResetPasswordForm } from "@/modules/auth/presentation/forms/reset-password-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function ResetPasswordPage() {
  return (
    <AuthScene>
      <section className="login-glass-card login-glass-card-narrow">
        <h1>Crear nueva contraseña</h1>
        <p className="login-subtitle">
          Usa el enlace o el token que recibiste por correo y elige una contraseña nueva.
        </p>
        <Suspense fallback={<p className="muted">Cargando formulario…</p>}>
          <ResetPasswordForm />
        </Suspense>
      </section>
    </AuthScene>
  );
}
