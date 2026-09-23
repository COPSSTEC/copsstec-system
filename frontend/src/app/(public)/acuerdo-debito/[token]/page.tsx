import { DebitAgreementPage } from "@/modules/payments";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;

  return <DebitAgreementPage token={token} />;
}
