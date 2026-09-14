import { MembershipInvoiceCard } from "@/modules/membership";
import { RoleGate } from "@/shared/components/role-gate";

export function MemberAccessPage() {
  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading">
        <h1>Mi espacio</h1>
        <p>Vista privada para usuarios con rol miembro.</p>
      </section>
      <section className="card">
        <h2>Información personal</h2>
        <p className="muted">
          Este apartado queda preparado para mostrar trámites, datos o servicios propios.
        </p>
      </section>
      <MembershipInvoiceCard />
    </RoleGate>
  );
}
