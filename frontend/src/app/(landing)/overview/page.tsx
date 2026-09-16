import type { Metadata } from "next";

import { LandingOverviewPage } from "@/modules/courses";

export const metadata: Metadata = {
  title: "Overview",
  description:
    "Explora la estructura, cursos, blogs, servicios y alianzas de COPSSTEC en una vista general.",
  alternates: {
    canonical: "/overview",
  },
};

export default function Page() {
  return <LandingOverviewPage />;
}
