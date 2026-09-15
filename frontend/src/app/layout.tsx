import type { Metadata } from "next";

import { BRAND_MEDIA } from "@/config/brand-media";
import "./globals.css";

export const metadata: Metadata = {
  title: "COPSSTEC System",
  description: "Sistema COPSSTEC",
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
      <body>{children}</body>
    </html>
  );
}
