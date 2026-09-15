import Link from "next/link";

import { RoleGate } from "@/shared/components/role-gate";

export function AdminAccessPage() {
  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading">
        <h1>Administración</h1>
        <p>Vista base para usuarios con rol admin y acceso total.</p>
      </section>
      <section className="card">
        <h2>Acceso total</h2>
        <p className="muted">
          Desde aquí puedes entrar a los módulos administrativos del sistema.
        </p>
        <div className="table-actions" style={{ marginTop: "1rem" }}>
          <Link className="primary-button button-link" href="/admin/miembros">
            Ir a Miembros
          </Link>
          <Link className="secondary-button button-link" href="/admin/cursos">
            Ir a Cursos
          </Link>
          <Link className="secondary-button button-link" href="/admin/pagos">
            Ir a Pagos
          </Link>
        </div>
      </section>
    </RoleGate>
  );
}
