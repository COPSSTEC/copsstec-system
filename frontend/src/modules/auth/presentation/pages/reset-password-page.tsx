import { ResetPasswordForm } from "@/modules/auth/presentation/forms/reset-password-form";
import { AppLogo } from "@/shared/components/app-logo";

export function ResetPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AppLogo />
        <h1 className="auth-title">Crear nueva contraseña</h1>
        <p className="auth-description">
          Usa el token de recuperación para registrar una nueva contraseña.
        </p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}
