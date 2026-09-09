import { FeedbackFormPage } from "@/modules/courses";

interface PageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { token } = await params;

  return <FeedbackFormPage token={token} />;
}
