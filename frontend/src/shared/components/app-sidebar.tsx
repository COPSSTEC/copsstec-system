"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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

function SidebarChevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`app-sidebar-chevron${open ? " is-open" : ""}`}
      fill="none"
      height="14"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="14"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SidebarItem({
  item,
  pathname,
  onClose,
}: {
  item: NavigationItem;
  pathname: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const childActive = children.some((child) => isActivePath(pathname, child.href));
  const groupActive = childActive || isActivePath(pathname, item.href);
  const [open, setOpen] = useState(groupActive);

  useEffect(() => {
    if (groupActive) {
      setOpen(true);
    }
  }, [groupActive]);

  if (!hasChildren) {
    return (
      <Link
        aria-current={isActivePath(pathname, item.href) ? "page" : undefined}
        href={item.href}
        onClick={onClose}
      >
        <SidebarIcon name={navIconForHref(item.href)} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <div className={`app-sidebar-group${open ? " is-open" : ""}${groupActive ? " is-current" : ""}`}>
      <button
        aria-expanded={open}
        className={`app-sidebar-group-toggle${groupActive ? " is-active" : ""}`}
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && !isActivePath(pathname, item.href)) {
            router.push(children[0]?.href || item.href);
          }
        }}
        type="button"
      >
        <SidebarIcon name={navIconForHref(item.href)} />
        <span>{item.label}</span>
        <SidebarChevron open={open} />
      </button>
      {open ? (
        <div className="app-sidebar-subnav">
          {children.map((child) => (
            <Link
              aria-current={isActivePath(pathname, child.href) ? "page" : undefined}
              href={child.href}
              key={child.href}
              onClick={onClose}
            >
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar({ navigation, accessLevel, isOpen, onClose }: AppSidebarProps) {
  const pathname = usePathname();

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
              <SidebarItem item={item} key={item.href} onClose={onClose} pathname={pathname} />
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
