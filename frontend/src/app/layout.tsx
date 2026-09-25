import type { Metadata } from "next";

import { BRAND_MEDIA } from "@/config/brand-media";
import { SITE } from "@/config/site";
import { AnalyticsNoscript, AnalyticsScripts } from "@/shared/components/analytics";
import { AppProviders } from "@/shared/components/app-providers";
import { JsonLd } from "@/shared/components/json-ld";
import { SessionGuard } from "@/shared/components/session-guard";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "COPSSTEC | Colegio de Profesionales de SST del Ecuador",
    template: "%s | COPSSTEC",
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  keywords: [
    "COPSSTEC",
    "SST Ecuador",
    "seguridad y salud en el trabajo",
    "colegio profesional",
    "cursos SST",
    "membresía COPSSTEC",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: "COPSSTEC | Colegio de Profesionales de SST del Ecuador",
    description: SITE.description,
    images: [{ url: BRAND_MEDIA.logoLong, alt: "Logo COPSSTEC" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "COPSSTEC | Colegio de Profesionales de SST del Ecuador",
    description: SITE.description,
    images: [BRAND_MEDIA.logoLong],
  },
  robots: {
    index: true,
    follow: true,
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GSC_VERIFICATION || undefined,
  },
  icons: {
    icon: [
      { url: BRAND_MEDIA.iconShort, type: "image/png" },
      { url: BRAND_MEDIA.iconShortFallback, type: "image/svg+xml" },
    ],
    shortcut: BRAND_MEDIA.iconShortFallback,
    apple: BRAND_MEDIA.iconShortFallback,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <AnalyticsNoscript />
        <JsonLd />
        <AppProviders>
          <SessionGuard>{children}</SessionGuard>
        </AppProviders>
        <AnalyticsScripts />
      </body>
    </html>
  );
}
