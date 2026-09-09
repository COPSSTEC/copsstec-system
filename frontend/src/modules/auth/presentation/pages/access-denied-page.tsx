import Link from "next/link";

export function AccessDeniedPage() {
  return (
    <section className="card">
      <h1>Acceso restringido</h1>
      <p className="muted">Tu rol actual no tiene permisos para esta vista.</p>
      <Link className="primary-button" href="/dashboard">
        Volver al dashboard
      </Link>
    </section>
  );
}
