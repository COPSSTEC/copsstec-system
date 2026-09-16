import { LandingShell } from "@/shared/components/landing-shell";

export default function LandingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LandingShell>{children}</LandingShell>;
}
