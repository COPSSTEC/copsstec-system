import { AppLogo } from "@/shared/components/app-logo";
import { ChangePasswordForm } from "@/modules/auth/presentation/forms/change-password-form";

export function ChangePasswordPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AppLogo />
        <h1 className="auth-title">Cambia tu contraseña</h1>
        <p className="auth-description">
          Ingresaste con una contraseña temporal. Elige una nueva para continuar. Solo se pedirá esta
          vez.
        </p>
        <ChangePasswordForm />
      </section>
    </main>
  );
}
