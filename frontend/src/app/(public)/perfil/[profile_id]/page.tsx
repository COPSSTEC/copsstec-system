import type { Metadata } from "next";

import { PublicMemberPage } from "@/modules/profile";

interface PageProps {
  params: Promise<{
    profile_id: string;
  }>;
}

export const metadata: Metadata = {
  title: "Verificación de miembro",
  description: "Consulta pública de la credencial profesional COPSSTEC.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({ params }: PageProps) {
  const { profile_id: profileId } = await params;

  return <PublicMemberPage profileId={Number(profileId)} />;
}
