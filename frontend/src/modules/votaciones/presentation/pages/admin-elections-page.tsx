"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { RoleGate } from "@/shared/components/role-gate";
import {
  ELECTION_STATUS_LABELS,
  calendarEventDate,
  formatCronogramaDate,
  formatDate,
  formatLongSpanishDate,
  formatMonthYear,
  type AdminTab,
  type ConfigPanel,
  type Election,
} from "@/modules/votaciones/domain/types";
import { AdminCalendarPanel } from "@/modules/votaciones/presentation/components/admin-calendar-panel";
import { AdminReportsPanel } from "@/modules/votaciones/presentation/components/admin-reports-panel";
import { AdminSettingsPanel } from "@/modules/votaciones/presentation/components/admin-settings-panel";
import { AdminVotersPanel } from "@/modules/votaciones/presentation/components/admin-voters-panel";
import { ListMemberPreview } from "@/modules/votaciones/presentation/components/list-member-preview";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";

const SECTION_META: Record<AdminTab, { title: string; description: string }> = {
  listas: {
    title: "Listas de candidatos",
    description: "Carga listas, candidatos, logo, color y el plan de trabajo PDF con vista previa.",
  },
  calendario: {
    title: "Calendario electoral",
    description: "Consulta y administra las fechas del proceso electoral.",
  },
  configuracion: {
    title: "Configuración",
    description: "General, cargos, diseño, opciones de voto (siempre virtual) y mensajería.",
  },
  votantes: {
    title: "Votantes habilitados",
    description: "Padrón de miembros, estado de pago y activación o retiro del derecho a voto.",
  },
  reportes: {
    title: "Reportes de votación",
    description: "KPIs, gráficos, tabla, trazabilidad y exportaciones del periodo seleccionado.",
  },
};

export function AdminElectionsPage({ section }: { section: AdminTab }) {
  const params = useSearchParams();
  const router = useRouter();
  const admin = useAdminElection();
  const requestedPanel = params.get("panel");
  const panel: ConfigPanel =
    requestedPanel === "diseno" || requestedPanel === "opciones" || requestedPanel === "mensajes" || requestedPanel === "cargos"
      ? requestedPanel
      : "cargos";
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("votaciones-guide") !== "hidden";
  });
  const [newListName, setNewListName] = useState("");

  const election = admin.election;
  const meta = SECTION_META[section];
  const guideDone = election?.guide.filter((step) => step.done).length ?? 0;
  const guideTotal = election?.guide.length ?? 0;

  function closeGuide() {
    setShowGuide(false);
    window.localStorage.setItem("votaciones-guide", "hidden");
  }

  function setPanel(next: ConfigPanel) {
    const nextParams = new URLSearchParams(params.toString());
    nextParams.set("panel", next);
    router.replace(`/admin/votaciones/configuracion?${nextParams.toString()}`);
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="votaciones-admin">
        {section === "votantes" || section === "reportes" || section === "configuracion" ? null : (
          <header className="page-heading page-heading-actions">
            <div>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
            <div className="votaciones-heading-tools">
              {election ? (
                <button className="votaciones-guide-trigger" onClick={() => setShowGuide(true)} type="button">
                  Guía de inicio
                  <em>
                    {guideDone}/{guideTotal}
                  </em>
                </button>
              ) : null}
              <span className="muted">Rol: Administrador</span>
            </div>
          </header>
        )}

        {admin.error ? (
          <div className="action-alert action-alert-error">
            <strong>Error</strong>
            <span>{admin.error}</span>
          </div>
        ) : null}
        {admin.notice ? (
          <div className="action-alert action-alert-success">
            <strong>Listo</strong>
            <span>{admin.notice}</span>
          </div>
        ) : null}

        {election ? (
          <>
            {section === "calendario" || section === "votantes" || section === "reportes" || section === "configuracion" ? null : (
              <PeriodBar admin={admin} election={election} showPeriodActions={section === "configuracion"} />
            )}
            {showGuide ? <GuideModal election={election} onClose={closeGuide} /> : null}

            {admin.isLoading ? <p className="muted">Cargando módulo...</p> : null}

            {section === "listas" ? (
              <ListsPanel
                admin={admin}
                election={election}
                name={newListName}
                onName={setNewListName}
              />
            ) : null}
            {section === "calendario" ? <AdminCalendarPanel admin={admin} election={election} key={election.id} /> : null}
            {section === "configuracion" ? (
              <AdminSettingsPanel
                key={election.id}
                admin={admin}
                election={election}
                panel={panel}
                setPanel={setPanel}
              />
            ) : null}
            {section === "votantes" ? <AdminVotersPanel admin={admin} election={election} /> : null}
            {section === "reportes" ? <AdminReportsPanel admin={admin} election={election} /> : null}
          </>
        ) : admin.isLoading ? null : (
          <p className="muted">No se pudo cargar el periodo.</p>
        )}
      </section>
    </RoleGate>
  );
}

function PeriodBar({
  admin,
  election,
  showPeriodActions = false,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
  showPeriodActions?: boolean;
}) {
  const voting = election.calendar.find((item) => item.event_key === "votacion");
  const termStart = election.calendar.find((item) => item.event_key === "inicio_gestion");
  const termEnd = election.calendar.find((item) => item.event_key === "fin_gestion");
  const termStartDate = termStart ? calendarEventDate(termStart).start : election.term_starts_on;
  const termEndDate = termEnd ? calendarEventDate(termEnd).start : election.term_ends_on;
  const votingStart = voting?.starts_on || election.voting_starts_on;
  const votingEnd = voting?.ends_on || election.voting_ends_on;

  return (
    <div className="votaciones-period-head">
      <div className="votaciones-cal-kpis">
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">
            {kpiIcon("calendar")}
          </span>
          <div>
            <p>Elecciones en</p>
            <strong>{formatMonthYear(votingStart)}</strong>
            <small>{election.title}</small>
          </div>
        </article>
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">
            {kpiIcon("clock")}
          </span>
          <div>
            <p>Periodo de votación</p>
            <strong>{formatCronogramaDate(votingStart, votingEnd)}</strong>
            <small>Votación en línea para miembros habilitados</small>
          </div>
        </article>
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">
            {kpiIcon("users")}
          </span>
          <div>
            <p>Periodo de gestión de la Directiva</p>
            <strong>
              {formatLongSpanishDate(termStartDate)} - {formatLongSpanishDate(termEndDate)}
            </strong>
            <small>{election.is_readonly ? "Solo lectura" : "Periodo vigente"}</small>
          </div>
        </article>
        <article className={`votaciones-cal-status ${election.status === "en_preparacion" ? "" : "is-public"}`}>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">
            {kpiIcon("clock")}
          </span>
          <div>
            <strong>{ELECTION_STATUS_LABELS[election.status]}</strong>
            <small>{election.is_readonly ? "Consulta histórica" : "Periodo abierto"}</small>
          </div>
        </article>
      </div>
      {showPeriodActions ? (
        <div className="votaciones-period-toolbar">
          <label>
            Periodo
            <select onChange={(event) => admin.selectPeriod(Number(event.target.value))} value={election.id}>
              {election.periods.map((period) => (
                <option key={period.id} value={period.id}>
                  #{period.id} · {period.title} · {ELECTION_STATUS_LABELS[period.status]}
                </option>
              ))}
            </select>
          </label>
          {election.is_readonly ? (
            <button className="primary-button" disabled={admin.isMutating} onClick={() => void admin.startPeriod()} type="button">
              Iniciar nuevo periodo
            </button>
          ) : (
            <button className="secondary-button" disabled={admin.isMutating} onClick={() => void admin.closePeriod()} type="button">
              Cerrar periodo
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function GuideModal({
  election,
  onClose,
}: {
  election: Election;
  onClose: () => void;
}) {
  const router = useRouter();
  const done = election.guide.filter((step) => step.done).length;
  const total = election.guide.length;
  const percent = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="votaciones-modal" onClick={onClose} role="presentation">
      <article
        aria-labelledby="votaciones-guide-title"
        aria-modal="true"
        className="votaciones-guide-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <p>Módulo de votaciones</p>
            <h2 id="votaciones-guide-title">Por dónde empezar</h2>
            <span>Sigue este orden. Los cargos de Configuración son los que usa el alta de listas.</span>
          </div>
          <button aria-label="Cerrar guía" className="votaciones-guide-close" onClick={onClose} type="button">
            ×
          </button>
        </header>
        <div className="votaciones-guide-progress">
          <b>
            <i style={{ width: `${percent}%` }} />
          </b>
          <strong>
            {done} de {total} pasos listos
          </strong>
        </div>
        <ol>
          {election.guide.map((step, index) => (
            <li className={step.done ? "is-done" : ""} key={step.key}>
              <button
                onClick={() => {
                  onClose();
                  router.push(step.href);
                }}
                type="button"
              >
                <span>{step.done ? "✓" : index + 1}</span>
                <div>
                  <strong>{step.label}</strong>
                  <small>{step.done ? "Completado" : "Pendiente"}</small>
                </div>
                <em>{step.done ? "Listo" : "Ir"}</em>
              </button>
            </li>
          ))}
        </ol>
        <footer>
          <button className="primary-button" onClick={onClose} type="button">
            Entendido
          </button>
        </footer>
      </article>
    </div>
  );
}

function kpiIcon(name: "calendar" | "clock" | "users") {
  if (name === "clock") {
    return (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM4 19a4 4 0 018 0M12 19a4 4 0 018 0" />
      </svg>
    );
  }
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <rect height="16" rx="2" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function ListsPanel({
  admin,
  election,
  name,
  onName,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
  name: string;
  onName: (value: string) => void;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState("");

  return (
    <section className="votaciones-panel">
      <form
        className="votaciones-create-list"
        onSubmit={(event) => {
          event.preventDefault();
          const trimmed = name.trim();
          if (!trimmed) {
            setFormError("Escribe el nombre de la lista para crearla.");
            return;
          }
          setFormError("");
          void admin.addList({ name: trimmed, slogan: "", color: election.primary_color || "#0D47A1" }).then((created) => {
            if (!created) {
              return;
            }
            onName("");
            router.push(`/admin/votaciones/listas/${created.id}`);
          });
        }}
      >
        <div>
          <strong>Nueva lista de candidatos</strong>
          <p>Crea la lista y luego carga logo, color, integrantes y el plan de trabajo PDF.</p>
        </div>
        <div className="votaciones-inline-form">
          <input
            onChange={(event) => {
              onName(event.target.value);
              if (formError) {
                setFormError("");
              }
            }}
            placeholder="Nombre de la lista"
            value={name}
          />
          <button className="primary-button" disabled={election.is_readonly || admin.isMutating} type="submit">
            {admin.isMutating ? "Creando..." : "Nueva lista"}
          </button>
        </div>
        {formError ? <p className="form-error">{formError}</p> : null}
      </form>
      {admin.lists.length === 0 ? (
        <div className="votaciones-empty">
          <strong>Aún no hay listas</strong>
          <p>Escribe un nombre arriba y pulsa Nueva lista. Se abrirá el editor para cargar candidatos, foto, profesión y el plan PDF.</p>
        </div>
      ) : (
        <div className="votaciones-list-grid">
          {admin.lists.map((lista) => (
            <ListMemberPreview
              actions={(
                <>
                  <Link className="primary-button" href={`/admin/votaciones/listas/${lista.id}`}>
                    Editar lista
                  </Link>
                  <button className="secondary-button" disabled={election.is_readonly} onClick={() => void admin.removeList(lista.id)} type="button">
                    Eliminar
                  </button>
                </>
              )}
              election={election}
              key={lista.id}
              listNumber={lista.sort_order || 1}
              lista={lista}
              mode="catalog"
            />
          ))}
        </div>
      )}
    </section>
  );
}

