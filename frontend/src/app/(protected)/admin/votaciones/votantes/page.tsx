import { Suspense } from "react";

import { AdminElectionsPage } from "@/modules/votaciones";

export default function Page() {
  return (
    <Suspense fallback={<p className="muted">Cargando votantes habilitados...</p>}>
      <AdminElectionsPage section="votantes" />
    </Suspense>
  );
}
