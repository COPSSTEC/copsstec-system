"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { clearStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { User } from "@/modules/auth/domain/types";
import { UserAvatar } from "@/shared/components/user-avatar";

interface AppHeaderProps {
  user: User | null;
  onMenuToggle: () => void;
}

const ACCESS_LABELS: Record<string, string> = {
  admin: "Admin",
  member: "Miembro",
  operations: "Operaciones",
  restricted: "Restringido",
};

export function AppHeader({ user, onMenuToggle }: AppHeaderProps) {
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.profile
    ? `${user.profile.names} ${user.profile.lastname}`.trim()
    : user?.name ?? "Usuario";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearStoredToken();
    router.replace("/login");
  }

  return (
    <header className="app-topbar">
      <button
        aria-label="Abrir menú"
        className="app-topbar-menu"
        onClick={onMenuToggle}
        type="button"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="app-topbar-actions" ref={menuRef}>
        <div className="app-topbar-menu-wrap">
          <button
            aria-expanded={isNotificationsOpen}
            aria-label="Notificaciones"
            className="app-icon-button"
            onClick={() => {
              setIsNotificationsOpen((open) => !open);
              setIsUserMenuOpen(false);
            }}
            type="button"
          >
            <svg fill="none" height="20" viewBox="0 0 24 24" width="20">
              <path
                d="M18 16v-5a6 6 0 10-12 0v5l-1.5 2h15L18 16z"
                stroke="currentColor"
                strokeLinejoin="round"
                strokeWidth="1.8"
              />
              <path
                d="M10 19a2 2 0 004 0"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="1.8"
              />
            </svg>
          </button>
          {isNotificationsOpen ? (
            <div className="app-dropdown app-dropdown-notifications">
              <strong>Notificaciones</strong>
              <p className="muted">No hay notificaciones nuevas.</p>
            </div>
          ) : null}
        </div>

        <div className="app-topbar-menu-wrap">
          <button
            aria-expanded={isUserMenuOpen}
            className="app-user-chip"
            onClick={() => {
              setIsUserMenuOpen((open) => !open);
              setIsNotificationsOpen(false);
            }}
            type="button"
          >
            <UserAvatar fotoId={user?.profile?.foto_id} name={displayName} size="sm" />
            <span>{displayName.split(" ")[0]}</span>
          </button>
          {isUserMenuOpen ? (
            <div className="app-dropdown app-dropdown-user">
              <div className="app-dropdown-user-head">
                <UserAvatar fotoId={user?.profile?.foto_id} name={displayName} size="md" />
                <div>
                  <strong>{displayName}</strong>
                  <span className="app-role-badge">
                    {ACCESS_LABELS[user?.access_level ?? "restricted"]}
                  </span>
                  <p className="muted">{user?.email ?? ""}</p>
                </div>
              </div>
              <Link href="/profile" onClick={() => setIsUserMenuOpen(false)}>
                Ver mi perfil
              </Link>
              <button onClick={handleLogout} type="button">
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
