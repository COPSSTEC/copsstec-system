"use client";

import Link from "next/link";

import { AppLogo } from "@/shared/components/app-logo";

interface PublicSiteHeaderProps {
  current?: "inicio" | "cursos" | "blogs";
}

export function PublicSiteHeader({ current }: PublicSiteHeaderProps) {
  return (
    <header className="public-header">
      <AppLogo />
      <nav className="nav" aria-label="Navegación pública">
        <Link aria-current={current === "inicio" ? "page" : undefined} href="/">
          Inicio
        </Link>
        <Link aria-current={current === "cursos" ? "page" : undefined} href="/cursos">
          Cursos
        </Link>
        <Link aria-current={current === "blogs" ? "page" : undefined} href="/blogs">
          Blogs
        </Link>
        <Link href="/login">Ingresar</Link>
      </nav>
    </header>
  );
}
