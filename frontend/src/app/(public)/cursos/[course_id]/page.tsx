import { PublicCourseDetailPage } from "@/modules/courses";

interface PageProps {
  params: Promise<{
    course_id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { course_id: courseId } = await params;

  return <PublicCourseDetailPage courseId={Number(courseId)} />;
}
