import { ResetPasswordForm } from "@/modules/auth/presentation/forms/reset-password-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function ResetPasswordPage() {
  return (
    <AuthScene>
      <section className="login-glass-card login-glass-card-narrow">
        <h1>Crear nueva contraseña</h1>
        <p className="login-subtitle">
          Usa el token que recibiste y elige una contraseña nueva para volver a entrar.
        </p>
        <ResetPasswordForm />
      </section>
    </AuthScene>
  );
}
