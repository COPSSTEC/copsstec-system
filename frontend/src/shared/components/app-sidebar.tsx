"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AccessLevel, NavigationItem } from "@/modules/auth/domain/types";
import { AppLogo } from "@/shared/components/app-logo";

const PORTAL_TITLES: Record<AccessLevel, string> = {
  admin: "Portal de administración",
  member: "Portal de miembros",
  operations: "Portal operativo",
  restricted: "Portal COPSSTEC",
};

interface AppSidebarProps {
  navigation: NavigationItem[];
  accessLevel: AccessLevel;
  isOpen: boolean;
  onClose: () => void;
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ navigation, accessLevel, isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();
  const activeHref = navigation
    .filter((item) => isActivePath(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href;

  return (
    <>
      <button
        aria-label="Cerrar menú"
        className={`app-sidebar-backdrop ${isOpen ? "is-visible" : ""}`}
        onClick={onClose}
        type="button"
      />
      <aside className={`app-sidebar ${isOpen ? "is-open" : ""}`}>
        <div className="app-sidebar-brand">
          <AppLogo compact />
          <div>
            <strong>COPSSTEC</strong>
            <span>{PORTAL_TITLES[accessLevel]}</span>
          </div>
        </div>

        <nav aria-label="Navegación principal" className="app-sidebar-nav">
          {navigation.map((item) => (
            <Link
              aria-current={item.href === activeHref ? "page" : undefined}
              href={item.href}
              key={item.href}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
