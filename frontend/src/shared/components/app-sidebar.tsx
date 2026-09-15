"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { AccessLevel, NavigationItem } from "@/modules/auth/domain/types";
import { navIconForHref, SOCIAL_LINKS } from "@/config/social-links";
import { AppLogo } from "@/shared/components/app-logo";
import { SidebarIcon } from "@/shared/components/sidebar-icon";

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
        <div className="app-sidebar-scroll">
          <Link className="app-sidebar-brand" href="/dashboard" onClick={onClose}>
            <AppLogo compact />
            <div>
              <strong>COPSSTEC</strong>
              <span>{PORTAL_TITLES[accessLevel]}</span>
            </div>
          </Link>

          <nav aria-label="Navegación principal" className="app-sidebar-nav">
            {navigation.map((item) => (
              <Link
                aria-current={item.href === activeHref ? "page" : undefined}
                href={item.href}
                key={item.href}
                onClick={onClose}
              >
                <SidebarIcon name={navIconForHref(item.href)} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          <p className="app-sidebar-socials-label">Socials</p>
          <nav aria-label="Redes sociales" className="app-sidebar-nav app-sidebar-socials">
            {SOCIAL_LINKS.map((item) => (
              <a href={item.href} key={item.href} rel="noreferrer" target="_blank">
                <SidebarIcon name={item.icon} />
                <span>{item.label}</span>
              </a>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
}
