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
          Aquí podrás agregar módulos administrativos sin cambiar la lógica de roles.
        </p>
      </section>
    </RoleGate>
  );
}
