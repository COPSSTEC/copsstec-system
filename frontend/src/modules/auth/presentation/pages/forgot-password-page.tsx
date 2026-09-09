import { ForgotPasswordForm } from "@/modules/auth/presentation/forms/forgot-password-form";
import { AppLogo } from "@/shared/components/app-logo";

export function ForgotPasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AppLogo />
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-description">
          Ingresa tu correo para generar una solicitud de recuperación.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
