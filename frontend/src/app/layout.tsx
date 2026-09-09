import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COPSSTEC System",
  description: "Sistema COPSSTEC",
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
