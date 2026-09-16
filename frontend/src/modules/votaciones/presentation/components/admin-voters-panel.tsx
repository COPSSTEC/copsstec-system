"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

import { UserAvatar } from "@/shared/components/user-avatar";
import { formatDateTime, type Election, type ElectionVoter } from "@/modules/votaciones/domain/types";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";

const MEMBER_TYPES = [
  { value: "miembro", label: "Miembro" },
  { value: "fundador", label: "Fundador" },
  { value: "directivo", label: "Directivo" },
];

const PAGE_SIZES = [8, 16, 24, 48];

export function AdminVotersPanel({
  admin,
  election,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
}) {
  const voters = admin.voters;
  const total = voters?.total ?? 0;
  const padro = voters?.padro_total ?? 0;
  const enabled = voters?.enabled_count ?? 0;
  const disabled = voters?.disabled_count ?? 0;
  const pending = voters?.pending_payment_count ?? 0;
  const pageSize = admin.voterPageSize;
  const page = admin.voterPage;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const [menuUserId, setMenuUserId] = useState<number | null>(null);
  const [pendingVoter, setPendingVoter] = useState<ElectionVoter | null>(null);
  const skipSearch = useRef(true);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void admin.loadVoters({ q: admin.voterQuery, page: 1 });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [admin.voterQuery]);

  function applyFilters(overrides: Parameters<typeof admin.loadVoters>[0]) {
    void admin.loadVoters({ page: 1, ...overrides });
  }

  return (
    <section className="votaciones-voters">
      <Link className="votaciones-voters-back" href="/admin/votaciones">
        {chevronLeft()} Volver
      </Link>

      <header className="votaciones-voters-hero">
        <span className="votaciones-voters-hero-icon" aria-hidden="true">
          {usersIcon()}
        </span>
        <div>
          <h1>Votantes habilitados</h1>
          <p>Permite al administrador revisar qué miembros pueden votar según su estado de pago.</p>
        </div>
      </header>

      <div className="votaciones-voters-kpis">
        <KpiCard
          tone="success"
          icon={userCheckIcon()}
          label="Socios al día habilitados"
          value={enabled}
          trend={share(enabled, padro)}
          hint="Pueden emitir su voto"
        />
        <KpiCard
          tone="danger"
          icon={userOffIcon()}
          label="Socios no habilitados"
          value={disabled}
          trend={share(disabled, padro)}
          hint="Con pagos vencidos"
        />
        <KpiCard
          tone="warning"
          icon={clockIcon()}
          label="Pendientes de pago"
          value={pending}
          trend={share(pending, padro)}
          hint="En proceso de regularización"
        />
        <KpiCard
          tone="info"
          icon={usersIcon()}
          label="Total padrón electoral"
          value={padro}
          hint="Total de miembros activos"
        />
      </div>

      <section className="votaciones-voters-card">
        <header>
          <span aria-hidden="true">{searchIcon()}</span>
          <div>
            <h2>Filtros y búsqueda</h2>
          </div>
        </header>
        <form
          className="votaciones-voters-filters"
          onSubmit={(event) => {
            event.preventDefault();
            applyFilters({ q: admin.voterQuery });
          }}
        >
          <label className="votaciones-voters-search">
            <span>Buscar socio</span>
            <div>
              <input
                onChange={(event) => admin.setVoterQuery(event.target.value)}
                placeholder="Nombre, apellido, N° de socio o correo..."
                value={admin.voterQuery}
              />
              <button aria-label="Buscar" type="submit">
                {searchIcon()}
              </button>
            </div>
          </label>
          <label>
            <span>Estado de pago</span>
            <select
              onChange={(event) => applyFilters({ q: admin.voterQuery, payment_status: event.target.value })}
              value={admin.voterPayment}
            >
              <option value="">Todos los estados</option>
              <option value="al_dia">Al día</option>
              <option value="pendiente">Pendiente</option>
            </select>
          </label>
          <label>
            <span>Tipo de miembro</span>
            <select
              onChange={(event) => applyFilters({ q: admin.voterQuery, type_profile: event.target.value })}
              value={admin.voterType}
            >
              <option value="">Todos los tipos</option>
              {MEMBER_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Provincia / Ciudad</span>
            <select
              onChange={(event) => applyFilters({ q: admin.voterQuery, location: event.target.value })}
              value={admin.voterLocation}
            >
              <option value="">Todas las provincias</option>
              {(voters?.provinces ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button votaciones-voters-export" onClick={() => void admin.exportPadron()} type="button">
            {downloadIcon()} Exportar a Excel
          </button>
        </form>
      </section>

      <section className="votaciones-voters-card votaciones-voters-table-card">
        <header>
          <h2>Listado de votantes ({total} resultados)</h2>
        </header>
        <div className="votaciones-table-wrap">
          <table className="votaciones-table votaciones-voters-table">
            <thead>
              <tr>
                <th>N°</th>
                <th>Foto</th>
                <th>Nombre completo</th>
                <th>N° de socio</th>
                <th>Profesión</th>
                <th>Estado de pago</th>
                <th>Habilitado para votar</th>
                <th>Correo</th>
                <th>Último acceso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {voters?.items.length ? (
                voters.items.map((item, index) => (
                  <tr key={item.user_id}>
                    <td>{from + index}</td>
                    <td>
                      <UserAvatar className="member-avatar" fotoId={item.photo_url} name={`${item.names} ${item.lastname}`} size="sm" />
                    </td>
                    <td>
                      <strong>
                        {item.names} {item.lastname}
                      </strong>
                    </td>
                    <td>{item.member_code || "—"}</td>
                    <td>{item.profession || "—"}</td>
                    <td>
                      <PaymentBadge status={item.payment_status} />
                    </td>
                    <td>
                      <EnabledBadge enabled={item.voting_enabled} />
                    </td>
                    <td>{item.email || "—"}</td>
                    <td>{formatDateTime(item.last_access)}</td>
                    <td>
                      <VoterActionsMenu
                        item={item}
                        onToggle={() => {
                          setMenuUserId(null);
                          setPendingVoter(item);
                        }}
                        open={menuUserId === item.user_id}
                        setOpen={(next) => setMenuUserId(next ? item.user_id : null)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="muted" colSpan={10}>
                    {admin.isLoading ? "Cargando padrón..." : "No hay votantes para los filtros seleccionados."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="votaciones-voters-pagination">
          <p>
            Mostrando {from} a {to} de {total} resultados
          </p>
          <nav>
            <button disabled={page <= 1} onClick={() => void admin.loadVoters({ page: page - 1 })} type="button">
              ‹
            </button>
            {pageItems(page, totalPages).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`}>…</span>
              ) : (
                <button
                  className={item === page ? "is-active" : ""}
                  key={item}
                  onClick={() => void admin.loadVoters({ page: item })}
                  type="button"
                >
                  {item}
                </button>
              ),
            )}
            <button disabled={page >= totalPages} onClick={() => void admin.loadVoters({ page: page + 1 })} type="button">
              ›
            </button>
          </nav>
          <label>
            Mostrar
            <select
              onChange={(event) => void admin.loadVoters({ page: 1, page_size: Number(event.target.value) })}
              value={pageSize}
            >
              {PAGE_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            por página
          </label>
        </footer>
      </section>

      <div className="votaciones-voters-bottom">
        <section className="votaciones-voters-card">
          <header>
            <span className="votaciones-voters-info-icon" aria-hidden="true">
              i
            </span>
            <div>
              <h2>Reglas de habilitación</h2>
              <p>Solo los socios al día en sus pagos pueden votar. El estado de pago se actualiza automáticamente desde el sistema.</p>
            </div>
          </header>
          <ol className="votaciones-voters-rules">
            <li>
              <em>1</em>
              <span>Pueden votar todos los miembros activos que se encuentren al día en sus pagos.</span>
            </li>
            <li>
              <em>2</em>
              <span>Los socios con pagos pendientes o vencidos no estarán habilitados para votar.</span>
            </li>
            <li>
              <em>3</em>
              <span>El padrón se sincroniza automáticamente con el sistema de pagos del Colegio.</span>
            </li>
            <li>
              <em>4</em>
              <span>En caso de inconsistencias, comuníquese con la administración para su revisión.</span>
            </li>
          </ol>
        </section>
        <section className="votaciones-voters-card">
          <header>
            <span className="votaciones-voters-hero-icon is-small" aria-hidden="true">
              {settingsIcon()}
            </span>
            <div>
              <h2>Acciones del padrón</h2>
              <p>Gestiona la información de votantes habilitados desde estas opciones.</p>
            </div>
          </header>
          <div className="votaciones-voters-actions">
            <button disabled={election.is_readonly || admin.isMutating} onClick={() => void admin.syncPadron()} type="button">
              <i>{refreshIcon()}</i>
              <span>
                <strong>Sincronizar padrón</strong>
                <small>Actualiza el estado de pago de todos los miembros</small>
              </span>
              {chevronRight()}
            </button>
            <button onClick={() => void admin.exportPadron()} type="button">
              <i>{downloadIcon()}</i>
              <span>
                <strong>Exportar padrón</strong>
                <small>Descarga el listado completo en Excel</small>
              </span>
              {chevronRight()}
            </button>
            <button disabled={election.is_readonly || admin.isMutating} onClick={() => void admin.dispatchMessage("recordatorio")} type="button">
              <i>{mailIcon()}</i>
              <span>
                <strong>Enviar notificación</strong>
                <small>Notifica a socios sobre su estado de habilitación</small>
              </span>
              {chevronRight()}
            </button>
          </div>
        </section>
      </div>
      {pendingVoter
        ? createPortal(
            <div className="modal-backdrop votaciones-voters-confirm" role="presentation">
              <div className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="voter-confirm-title">
                <h2 id="voter-confirm-title">
                  {pendingVoter.voting_enabled ? "Quitar derecho a voto" : "Habilitar voto"}
                </h2>
                <p className="muted">
                  {pendingVoter.voting_enabled
                    ? `¿Confirmas quitar el derecho a voto a ${pendingVoter.names} ${pendingVoter.lastname}? Esta persona ya no podrá votar.`
                    : `¿Confirmas habilitar el voto de ${pendingVoter.names} ${pendingVoter.lastname}? Podrá votar cuando la elección esté abierta.`}
                </p>
                {election.is_readonly ? (
                  <p className="muted">Este periodo está cerrado y el padrón no se puede modificar.</p>
                ) : null}
                <div className="table-actions">
                  <button className="secondary-button" onClick={() => setPendingVoter(null)} type="button">
                    Cancelar
                  </button>
                  <button
                    className={pendingVoter.voting_enabled ? "danger-button" : "primary-button"}
                    disabled={election.is_readonly || admin.isMutating}
                    onClick={() => {
                      const voter = pendingVoter;
                      const fullName = `${voter.names} ${voter.lastname}`.trim();
                      void admin.toggleVote(voter.user_id, !voter.voting_enabled, fullName).then((result) => {
                        if (result) {
                          setPendingVoter(null);
                        }
                      });
                    }}
                    type="button"
                  >
                    {admin.isMutating
                      ? "Guardando..."
                      : pendingVoter.voting_enabled
                        ? "Quitar voto"
                        : "Habilitar voto"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  trend,
  hint,
}: {
  tone: "success" | "danger" | "warning" | "info";
  icon: ReactNode;
  label: string;
  value: number;
  trend?: number;
  hint: string;
}) {
  return (
    <article className={`votaciones-voters-kpi is-${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <div className="votaciones-voters-kpi-value">
          <strong>{value}</strong>
          {trend !== undefined ? <em>↑ {trend}%</em> : null}
        </div>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const ok = status === "al_dia" || status === "gracia";
  return (
    <span className={`votaciones-voters-pill ${ok ? "is-success" : "is-danger"}`}>
      {ok ? checkIcon() : alertIcon()} {ok ? "Al día" : "Pendiente"}
    </span>
  );
}

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`votaciones-voters-pill ${enabled ? "is-success" : "is-danger"}`}>
      {enabled ? checkIcon() : closeIcon()} {enabled ? "Habilitado" : "No habilitado"}
    </span>
  );
}

function placeVoterMenu(trigger: HTMLElement, dropdown: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const menu = dropdown.getBoundingClientRect();
  const gap = 6;
  const padding = 8;
  let top = rect.bottom + gap;
  if (top + menu.height > window.innerHeight - padding) {
    top = Math.max(padding, rect.top - menu.height - gap);
  }
  let left = rect.right - menu.width;
  left = Math.min(left, window.innerWidth - menu.width - padding);
  left = Math.max(padding, left);
  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
}

function VoterActionsMenu({
  item,
  open,
  setOpen,
  onToggle,
}: {
  item: ElectionVoter;
  open: boolean;
  setOpen: (open: boolean) => void;
  onToggle: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, setOpen]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    function update() {
      if (triggerRef.current && dropdownRef.current) {
        placeVoterMenu(triggerRef.current, dropdownRef.current);
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const dropdown =
    open && mounted
      ? createPortal(
          <div className="votaciones-voters-menu-list" ref={dropdownRef}>
            <button
              onClick={() => {
                setOpen(false);
                onToggle();
              }}
              type="button"
            >
              {item.voting_enabled ? "Quitar voto" : "Habilitar voto"}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="votaciones-voters-menu" ref={menuRef}>
      <button
        aria-label={`Acciones de ${item.names} ${item.lastname}`}
        onClick={() => setOpen(!open)}
        ref={triggerRef}
        type="button"
      >
        ···
      </button>
      {dropdown}
    </div>
  );
}

function share(part: number, total: number) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}

function pageItems(current: number, total: number): Array<number | "gap"> {
  if (total <= 6) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  if (current <= 4) {
    return [1, 2, 3, 4, 5, "gap", total];
  }
  if (current >= total - 3) {
    return [1, "gap", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "gap", current - 1, current, current + 1, "gap", total];
}

function usersIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16.5 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4 19a4 4 0 018 0M14 19a3.5 3.5 0 016 0" />
    </svg>
  );
}

function userCheckIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM4 19a4 4 0 018 0M15 11l2 2 4-4" />
    </svg>
  );
}

function userOffIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM4 19a4 4 0 018 0M16 9l5 5M21 9l-5 5" />
    </svg>
  );
}

function clockIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function searchIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function downloadIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M12 4v12M7 12l5 5 5-5M5 20h14" />
    </svg>
  );
}

function settingsIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001.1 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  );
}

function refreshIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M20 12a8 8 0 10-2.3 5.5M20 12V6m0 6h-6" />
    </svg>
  );
}

function mailIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M3 7l9 7 9-7" />
    </svg>
  );
}

function checkIcon() {
  return (
    <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="12">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function alertIcon() {
  return (
    <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="12">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  );
}

function closeIcon() {
  return (
    <svg fill="none" height="12" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24" width="12">
      <path d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

function chevronLeft() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function chevronRight() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}
