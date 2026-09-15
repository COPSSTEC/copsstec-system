import type { Metadata } from "next";

import { PublicBlogsPage } from "@/modules/blogs";

export const metadata: Metadata = {
  title: "Blogs de SST",
  description:
    "Lee artículos y novedades de COPSSTEC sobre seguridad y salud en el trabajo.",
  alternates: {
    canonical: "/blogs",
  },
};

export default function Page() {
  return <PublicBlogsPage />;
}
