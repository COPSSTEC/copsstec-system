import Link from "next/link";

import { LoginForm } from "@/modules/auth/presentation/forms/login-form";
import { AuthScene } from "@/shared/components/auth-scene";

export function LoginPage() {
  return (
    <AuthScene>
      <div className="login-layout">
        <section className="login-glass-card">
          <h1>Iniciar sesión</h1>
          <p className="login-subtitle">Ingresa a tu cuenta COPSSTEC</p>
          <Link className="login-affiliate-link" href="/afiliacion">
            ¡Deseo afiliarme!
          </Link>
          <LoginForm />
        </section>

        <aside className="login-side">
          <article className="login-info-card">
            <div className="login-info-icon" aria-hidden="true">
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path
                  d="M4 19V5a2 2 0 012-2h5l2 2h7a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
            </div>
            <div>
              <h2>Excelencia académica</h2>
              <p>
                “La seguridad y la salud en el trabajo son pilares para el desarrollo de nuestras
                sociedades.”
              </p>
              <span>Comunidad COPSSTEC</span>
            </div>
          </article>

          <Link className="login-recover-card" href="/forgot-password">
            <div>
              <h2>¿Olvidaste tu contraseña?</h2>
              <p>Si no puedes entrar a tu cuenta, recupera el acceso en unos minutos.</p>
              <strong>Recuperar acceso →</strong>
            </div>
            <span className="login-info-icon login-info-icon-light" aria-hidden="true">
              <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
                <path
                  d="M15 8a4 4 0 11-4 4H7l-2 2v3h4v-2h2V12"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                />
              </svg>
            </span>
          </Link>
        </aside>
      </div>
    </AuthScene>
  );
}
