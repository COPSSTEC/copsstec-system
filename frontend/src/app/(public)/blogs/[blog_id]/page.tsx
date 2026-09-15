import { PublicBlogDetailPage } from "@/modules/blogs";

interface PageProps {
  params: Promise<{
    blog_id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { blog_id: blogId } = await params;

  return <PublicBlogDetailPage blogId={Number(blogId)} />;
}
