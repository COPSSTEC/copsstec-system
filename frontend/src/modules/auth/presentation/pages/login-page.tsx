import { AppLogo } from "@/shared/components/app-logo";
import { LoginForm } from "@/modules/auth/presentation/forms/login-form";

export function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <AppLogo />
        <h1 className="auth-title">Bienvenido al sistema</h1>
        <p className="auth-description">
          Ingresa con las credenciales registradas en la base de datos COPSSTEC.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
