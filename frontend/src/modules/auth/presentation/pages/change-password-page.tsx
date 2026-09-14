import { ChangePasswordForm } from "@/modules/auth/presentation/forms/change-password-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function ChangePasswordPage() {
  return (
    <AuthScene>
      <section className="login-glass-card login-glass-card-narrow">
        <h1>Cambia tu contraseña</h1>
        <p className="login-subtitle">
          Ingresaste con una contraseña temporal. Elige una nueva para continuar. Solo se pedirá
          esta vez.
        </p>
        <ChangePasswordForm />
      </section>
    </AuthScene>
  );
}
