import type { Metadata } from "next";

import { ForgotPasswordPage } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Recuperar contraseña",
  description: "Restablece el acceso a tu cuenta COPSSTEC.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ForgotPasswordPage />;
}
