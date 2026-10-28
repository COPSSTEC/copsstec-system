import Link from "next/link";
import type { ReactNode } from "react";
import type { SstCalculatorAccessResponse } from "../../domain/types";

export function SstAccessGate({ access, loading, error, children }: { access: SstCalculatorAccessResponse | null; loading: boolean; error: string | null; children: ReactNode }) {
  if (loading) return <section className="sst-state"><div className="sst-spinner" /><h1>Validando beneficio Cotiza SST</h1><p>Comprobamos tu estado de membresía antes de abrir Cotiza SST.</p></section>;
  if (!access?.allowed) return <section className="sst-state sst-state-denied"><div className="sst-state-icon">$</div><h1>Cotiza SST no está disponible</h1><p>{access?.reason ?? error ?? "No pudimos confirmar que tu membresía esté al día."}</p>{access?.pending_balance && Number(access.pending_balance) > 0 ? <strong>Saldo pendiente: USD {Number(access.pending_balance).toFixed(2)}</strong> : null}<Link className="sst-button" href="/mi-espacio/pagos">Revisar mis pagos</Link></section>;
  return <>{children}</>;
}
