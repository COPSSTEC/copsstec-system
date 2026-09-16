import type { Metadata } from "next";

import { PublicLandingPage } from "@/modules/courses";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Hazte miembro del COPSSTEC y accede a cursos, consultoría y servicios de seguridad y salud en el trabajo en Ecuador.",
  alternates: {
    canonical: "/",
  },
};

export default function HomePage() {
  return <PublicLandingPage />;
}
