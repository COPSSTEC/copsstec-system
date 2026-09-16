import { Suspense } from "react";

import { AdminElectionsPage } from "@/modules/votaciones";

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Cargando listas de candidatos...</p>}>
      <AdminElectionsPage section="listas" />
    </Suspense>
  );
}
