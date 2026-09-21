import { ForgotPasswordForm } from "@/modules/auth/presentation/forms/forgot-password-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function ForgotPasswordPage() {
  return (
    <AuthScene>
      <section className="login-glass-card login-glass-card-narrow">
        <h1>Recuperar contraseña</h1>
        <p className="login-subtitle">
          Escribe el correo de tu cuenta. Si existe, te enviaremos un mensaje con el enlace para restablecer el acceso.
        </p>
        <ForgotPasswordForm />
      </section>
    </AuthScene>
  );
}
