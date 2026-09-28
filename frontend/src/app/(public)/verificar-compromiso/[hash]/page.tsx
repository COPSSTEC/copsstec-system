import type { Metadata } from "next";

import { CommitmentVerificationPage } from "@/modules/membership";

interface PageProps {
  params: Promise<{
    hash: string;
  }>;
}

export const metadata: Metadata = {
  title: "Verificación de compromiso COPSSTEC",
  description: "Consulta pública de autenticidad del compromiso de afiliación COPSSTEC.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({ params }: PageProps) {
  const { hash } = await params;
  return <CommitmentVerificationPage digest={hash} />;
}
