"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { endClientSession } from "@/modules/auth/infrastructure/auth-api";
import type { User } from "@/modules/auth/domain/types";
import { UserAvatar } from "@/shared/components/user-avatar";

interface AppHeaderProps {
  user: User | null;
  onMenuToggle: () => void;
  onNavigate?: (href: string) => void;
  variant?: "default" | "bulletin";
}

const ACCESS_LABELS: Record<string, string> = {
  admin: "Administrador",
  member: "Miembro",
  operations: "Operaciones",
  restricted: "Restringido",
};

const SEARCH_PLACEHOLDERS: Record<string, string> = {
  admin: "Buscar miembros, pagos, cursos, documentos...",
  member: "Buscar noticias, cursos, documentos...",
  operations: "Buscar en el portal...",
  restricted: "Buscar en el portal...",
};

function formatHeaderDate(value: Date) {
  const formatted = value.toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function AppHeader({ user, onMenuToggle, onNavigate, variant = "default" }: AppHeaderProps) {
  const router = useRouter();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [today] = useState(() => formatHeaderDate(new Date()));
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.profile
    ? `${user.profile.names} ${user.profile.lastname}`.trim()
    : user?.name ?? "Usuario";

  const chipName = useMemo(() => {
    const parts = displayName.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[parts.length - 1]}`;
    }
    if (parts[0]) {
      return `${parts[0]} ${ACCESS_LABELS[user?.access_level ?? "restricted"]}`;
    }
    return ACCESS_LABELS[user?.access_level ?? "restricted"];
  }, [displayName, user?.access_level]);

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

  async function handleLogout() {
    await endClientSession();
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

      <form
        className="app-topbar-search"
        onSubmit={(event) => {
          event.preventDefault();
          const query = search.trim();
          const target = user?.access_level === "admin" ? "/admin/miembros" : "/dashboard";
          const href = query ? `${target}?q=${encodeURIComponent(query)}` : target;
          onNavigate?.(href);
          router.push(href);
        }}
      >
        <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
          <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        </svg>
        <input
          onChange={(event) => setSearch(event.target.value)}
          placeholder={SEARCH_PLACEHOLDERS[user?.access_level ?? "restricted"]}
          value={search}
        />
      </form>

      <div className="app-topbar-actions" ref={menuRef}>
        <time className="app-topbar-date">{today}</time>

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
            <span className="app-icon-button-dot" />
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
            {variant === "bulletin" ? (
              <span className="app-user-chip-copy">
                <strong>{displayName}</strong>
                <small>Miembro COPSSTEC</small>
              </span>
            ) : (
              <span>{chipName}</span>
            )}
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
