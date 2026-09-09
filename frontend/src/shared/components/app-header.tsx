"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { NavigationItem, User } from "@/modules/auth/domain/types";
import { AppLogo } from "@/shared/components/app-logo";

interface AppHeaderProps {
  navigation: NavigationItem[];
  user: User | null;
}

export function AppHeader({ navigation, user }: AppHeaderProps) {
  const router = useRouter();

  function handleLogout() {
    clearStoredToken();
    router.replace("/login");
  }

  return (
    <header className="header">
      <AppLogo compact />

      <nav className="nav" aria-label="Navegación principal">
        {navigation.map((item) => (
          <Link href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="nav">
        <span className="muted">{user?.name ?? "Usuario"}</span>
        <button className="secondary-button" onClick={handleLogout} type="button">
          Salir
        </button>
      </div>
    </header>
  );
}
