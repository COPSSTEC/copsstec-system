import Link from "next/link";

import { AppLogo } from "@/shared/components/app-logo";

export function PublicLandingPage() {
  return (
    <main className="public-page">
      <header className="public-header">
        <AppLogo />
        <nav className="nav" aria-label="Navegación pública">
          <Link href="/cursos">Cursos</Link>
          <Link href="/mi-espacio/cursos">Mis cursos</Link>
          <Link href="/login">Ingresar</Link>
        </nav>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Capacitación COPSSTEC</p>
          <h1>Cursos para fortalecer la seguridad, salud y gestión técnica.</h1>
          <p>
            Consulta la oferta disponible, inscríbete como invitado o accede con tu
            usuario miembro para participar sin costo.
          </p>
          <div className="hero-actions">
            <Link className="primary-button button-link" href="/cursos">
              Ver cursos
            </Link>
            <Link className="secondary-button button-link" href="/afiliacion">
              Quiero ser miembro
            </Link>
            <Link className="secondary-button button-link" href="/login">
              Soy miembro
            </Link>
          </div>
        </div>
        <aside className="hero-card">
          <strong>Oferta pública</strong>
          <span>Inscripciones abiertas para miembros e invitados externos.</span>
        </aside>
      </section>
    </main>
  );
}
