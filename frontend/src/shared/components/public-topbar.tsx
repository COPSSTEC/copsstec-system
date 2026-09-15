"use client";

import Link from "next/link";

import { AppLogo } from "@/shared/components/app-logo";

export function PublicTopbar() {
  return (
    <header className="landing-topbar">
      <div className="landing-topbar-pill">
        <Link aria-label="Inicio COPSSTEC" className="landing-topbar-brand" href="#inicio">
          <AppLogo compact />
        </Link>
        <nav aria-label="Navegación pública">
          <Link className="landing-topbar-link is-active" href="#inicio">
            Full view
          </Link>
          <Link className="landing-topbar-link" href="#quienes-somos">
            Overview
          </Link>
        </nav>
      </div>
    </header>
  );
}
