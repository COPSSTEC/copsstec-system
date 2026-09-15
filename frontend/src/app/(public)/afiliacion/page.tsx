import type { Metadata } from "next";

import { AffiliationWizardPage } from "@/modules/membership";

export const metadata: Metadata = {
  title: "Afíliate",
  description:
    "Regístrate como miembro del COPSSTEC y comienza tu proceso de afiliación profesional en SST.",
  alternates: {
    canonical: "/afiliacion",
  },
};

export default function Page() {
  return <AffiliationWizardPage />;
}
