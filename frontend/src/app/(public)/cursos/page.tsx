import type { Metadata } from "next";

import { PublicCoursesPage } from "@/modules/courses";

export const metadata: Metadata = {
  title: "Cursos de SST",
  description:
    "Consulta la oferta de cursos de seguridad y salud en el trabajo de COPSSTEC e inscríbete como miembro o invitado.",
  alternates: {
    canonical: "/cursos",
  },
};

export default function Page() {
  return <PublicCoursesPage />;
}
