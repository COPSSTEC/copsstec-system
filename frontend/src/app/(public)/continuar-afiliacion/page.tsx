import type { Metadata } from "next";

import { ResumeAffiliationPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Continuar afiliación",
  description: "Retoma tu afiliación a COPSSTEC con el correo de inscripción y un código de verificación.",
  alternates: {
    canonical: "/continuar-afiliacion",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return <ResumeAffiliationPage />;
}
