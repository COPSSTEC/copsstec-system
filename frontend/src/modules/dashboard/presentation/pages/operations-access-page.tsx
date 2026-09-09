import { RoleGate } from "@/shared/components/role-gate";

export function OperationsAccessPage() {
  return (
    <RoleGate requiredAccess="operations">
      <section className="page-heading">
        <h1>Operaciones</h1>
        <p>Vista compartida para bibliotecario, congreso-consejo y congreso-admin.</p>
      </section>
      <section className="card">
        <h2>Acceso operativo</h2>
        <p className="muted">
          Este espacio queda listo para vistas de biblioteca y congresos con una sola política.
        </p>
      </section>
    </RoleGate>
  );
}
