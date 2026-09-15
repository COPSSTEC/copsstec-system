import type { Metadata } from "next";

import { LoginPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Ingresar",
  description: "Accede al sistema COPSSTEC con tu cuenta de miembro, administrador u operaciones.",
  alternates: {
    canonical: "/login",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function Page() {
  return <LoginPage />;
}
