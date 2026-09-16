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
import { ListMemberPreview } from "@/modules/votaciones/presentation/components/list-member-preview";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";

const CONFIG_PANELS: Array<{ id: ConfigPanel; label: string }> = [
  { id: "general", label: "Información general" },
  { id: "cargos", label: "Cargos y requisitos" },
  { id: "diseno", label: "Diseño y visibilidad" },
  { id: "opciones", label: "Opciones de votación" },
  { id: "mensajes", label: "Mensajes y notificaciones" },
];

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
  const panel = (params.get("panel") as ConfigPanel) || "cargos";
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("votaciones-guide") !== "hidden";
  });
  const [newListName, setNewListName] = useState("");
  const [newPosition, setNewPosition] = useState("");
  const [testEmail, setTestEmail] = useState("");

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
            {section === "calendario" ? null : (
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
              <SettingsPanel
                key={election.id}
                admin={admin}
                election={election}
                newPosition={newPosition}
                onNewPosition={setNewPosition}
                panel={panel}
                setPanel={setPanel}
                testEmail={testEmail}
                setTestEmail={setTestEmail}
              />
            ) : null}
            {section === "votantes" ? <VotersPanel admin={admin} /> : null}
            {section === "reportes" ? <ReportsPanel admin={admin} /> : null}
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

function SettingsPanel({
  admin,
  election,
  panel,
  setPanel,
  newPosition,
  onNewPosition,
  testEmail,
  setTestEmail,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
  panel: ConfigPanel;
  setPanel: (value: ConfigPanel) => void;
  newPosition: string;
  onNewPosition: (value: string) => void;
  testEmail: string;
  setTestEmail: (value: string) => void;
}) {
  const [draft, setDraft] = useState(election);
  const [templates, setTemplates] = useState(election.templates);
  const readonly = election.is_readonly;

  function patch<K extends keyof Election>(key: K, value: Election[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <section className="votaciones-settings">
      <div className="page-heading page-heading-actions">
        <button className="primary-button" disabled={readonly} onClick={() => void admin.saveElection(draft)} type="button">
          Guardar cambios
        </button>
      </div>
      <nav className="votaciones-subtabs">
        {CONFIG_PANELS.map((item) => (
          <button className={panel === item.id ? "is-active" : ""} key={item.id} onClick={() => setPanel(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </nav>

      {panel === "general" ? (
        <div className="votaciones-form-grid">
          <label>Título<input disabled={readonly} onChange={(e) => patch("title", e.target.value)} value={draft.title} /></label>
          <label>Mensaje principal<input disabled={readonly} onChange={(e) => patch("subtitle", e.target.value)} value={draft.subtitle} /></label>
          <label>Frase institucional<input disabled={readonly} onChange={(e) => patch("tagline", e.target.value)} value={draft.tagline} /></label>
          <label>Estado
            <select disabled={readonly} onChange={(e) => patch("status", e.target.value as Election["status"])} value={draft.status}>
              {Object.entries(ELECTION_STATUS_LABELS).filter(([key]) => key !== "cerrada" && key !== "finalizada").map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {panel === "cargos" ? (
        <div className="votaciones-settings-grid">
          <section className="card">
            <div className="page-heading page-heading-actions">
              <h3>Cargos de la lista</h3>
              <form
                className="votaciones-inline-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!newPosition.trim()) return;
                  void admin.addPosition(newPosition).then(() => onNewPosition(""));
                }}
              >
                <input onChange={(e) => onNewPosition(e.target.value)} placeholder="Nuevo cargo" value={newPosition} />
                <button className="primary-button" disabled={readonly} type="submit">Agregar cargo</button>
              </form>
            </div>
            <table className="votaciones-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cargo</th>
                  <th>Activo</th>
                  <th>Foto</th>
                  <th>Nombre</th>
                  <th>Perfil</th>
                  <th>Profesión</th>
                  <th>Visible</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {election.positions.map((position) => (
                  <tr key={position.id}>
                    <td>{position.sort_order}</td>
                    <td>{position.name}</td>
                    {(["is_active", "photo_required", "full_name_required", "short_profile_required", "profession_required", "visible_to_members"] as const).map((flag) => (
                      <td key={flag}>
                        <input
                          checked={position[flag]}
                          disabled={readonly}
                          onChange={(event) => void admin.patchPosition(position.id, { [flag]: event.target.checked })}
                          type="checkbox"
                        />
                      </td>
                    ))}
                    <td>
                      <button className="secondary-button" disabled={readonly} onClick={() => void admin.removePosition(position.id)} type="button">
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <aside className="card">
            <h3>Requisitos para inscripción</h3>
            {([
              ["work_plan_required", "Plan de trabajo obligatorio"],
              ["photo_required", "Foto de cada integrante"],
              ["accept_position_required", "Aceptación de cargo"],
              ["list_logo_enabled", "Logo de la lista"],
              ["list_color_required", "Color distintivo"],
              ["backing_document_required", "Documento de respaldo"],
            ] as const).map(([key, label]) => (
              <label className="votaciones-switch" key={key}>
                <input checked={Boolean(draft[key])} disabled={readonly} onChange={(e) => patch(key, e.target.checked)} type="checkbox" />
                {label}
              </label>
            ))}
            <label>Fecha límite
              <input disabled={readonly} onChange={(e) => patch("registration_deadline", e.target.value)} type="date" value={draft.registration_deadline ?? ""} />
            </label>
            <label>Tamaño máximo (MB)
              <input disabled={readonly} max={20} min={1} onChange={(e) => patch("max_file_mb", Number(e.target.value))} type="number" value={draft.max_file_mb} />
            </label>
          </aside>
        </div>
      ) : null}

      {panel === "diseno" ? (
        <div className="votaciones-settings-grid">
          <section className="card">
            <label>Logo del proceso
              <input disabled={readonly} onChange={(e) => e.target.files?.[0] && void admin.uploadMedia("logo", e.target.files[0])} type="file" />
            </label>
            <label>Banner
              <input disabled={readonly} onChange={(e) => e.target.files?.[0] && void admin.uploadMedia("banner", e.target.files[0])} type="file" />
            </label>
            <label>Color principal<input disabled={readonly} onChange={(e) => patch("primary_color", e.target.value)} type="color" value={draft.primary_color} /></label>
            <label>Color secundario<input disabled={readonly} onChange={(e) => patch("secondary_color", e.target.value)} type="color" value={draft.secondary_color} /></label>
            {([
              ["show_work_plan", "Mostrar plan de trabajo"],
              ["show_all_photos", "Mostrar fotos de integrantes"],
              ["show_process_status", "Mostrar estado del proceso"],
              ["auto_publish_on_vote_start", "Publicar automáticamente al iniciar votación"],
            ] as const).map(([key, label]) => (
              <label className="votaciones-switch" key={key}>
                <input checked={Boolean(draft[key])} disabled={readonly} onChange={(e) => patch(key, e.target.checked)} type="checkbox" />
                {label}
              </label>
            ))}
          </section>
          <aside className="votaciones-design-preview" style={{ background: draft.primary_color }}>
            <p>Vista previa para miembros</p>
            <h3>{draft.title}</h3>
            <span>{draft.subtitle}</span>
          </aside>
        </div>
      ) : null}

      {panel === "opciones" ? (
        <div className="votaciones-settings-grid">
          <section className="card">
            <h3>Tipo de elección</h3>
            <label className="votaciones-choice">
              <input checked={draft.election_type === "lista_completa"} disabled={readonly} onChange={() => patch("election_type", "lista_completa")} type="radio" />
              Lista completa
            </label>
            <label className="votaciones-choice">
              <input checked={draft.election_type === "voto_por_cargos"} disabled={readonly} onChange={() => patch("election_type", "voto_por_cargos")} type="radio" />
              Voto por cargos
            </label>
            <h3>Reglas</h3>
            {([
              ["secret_vote", "Voto secreto"],
              ["confirm_vote", "Confirmación de voto"],
              ["allow_blank_vote", "Permitir voto en blanco"],
              ["show_work_plan", "Mostrar plan de trabajo de las listas"],
            ] as const).map(([key, label]) => (
              <label className="votaciones-switch" key={key}>
                <input checked={Boolean(draft[key])} disabled={readonly} onChange={(e) => patch(key, e.target.checked)} type="checkbox" />
                {label}
              </label>
            ))}
            <p className="muted">La votación es siempre virtual. La autenticación usa el usuario y contraseña del portal.</p>
          </section>
          <aside className="card">
            <h3>Vista previa de la boleta</h3>
            {admin.lists.filter((item) => item.status === "activa").map((lista) => (
              <p key={lista.id}>{lista.name}</p>
            ))}
            {draft.allow_blank_vote ? <p>Voto en blanco</p> : null}
          </aside>
        </div>
      ) : null}

      {panel === "mensajes" ? (
        <div className="votaciones-settings-grid">
          <section className="card">
            {templates.map((template, index) => (
              <article className="votaciones-message" key={template.template_key}>
                <strong>{template.title}</strong>
                <label>Asunto
                  <input
                    disabled={readonly}
                    onChange={(e) => {
                      const next = templates.map((item, itemIndex) => itemIndex === index ? { ...item, subject: e.target.value } : item);
                      setTemplates(next);
                    }}
                    value={template.subject}
                  />
                </label>
                <textarea
                  disabled={readonly}
                  onChange={(e) => {
                    const next = templates.map((item, itemIndex) => itemIndex === index ? { ...item, body: e.target.value } : item);
                    setTemplates(next);
                  }}
                  value={template.body}
                />
                <div className="votaciones-channels">
                  <label><input checked={template.channel_email} disabled={readonly} onChange={(e) => {
                    const next = templates.map((item, itemIndex) => itemIndex === index ? { ...item, channel_email: e.target.checked } : item);
                    setTemplates(next);
                  }} type="checkbox" /> Correo</label>
                  <label><input checked={template.channel_portal} disabled={readonly} onChange={(e) => {
                    const next = templates.map((item, itemIndex) => itemIndex === index ? { ...item, channel_portal: e.target.checked } : item);
                    setTemplates(next);
                  }} type="checkbox" /> Notificación en portal</label>
                </div>
                <button className="secondary-button" disabled={readonly} onClick={() => void admin.dispatchMessage(template.template_key)} type="button">
                  Enviar ahora
                </button>
              </article>
            ))}
            <button className="primary-button" disabled={readonly} onClick={() => void admin.saveTemplates(templates)} type="button">
              Guardar plantillas
            </button>
          </section>
          <aside className="card">
            <h3>Enviar prueba</h3>
            <input onChange={(e) => setTestEmail(e.target.value)} placeholder="correo@copsstec.com" value={testEmail} />
            <button className="secondary-button" disabled={!testEmail} onClick={() => void admin.sendTest(templates[0]?.template_key || "convocatoria", testEmail)} type="button">
              Enviar prueba
            </button>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

function VotersPanel({ admin }: { admin: ReturnType<typeof useAdminElection> }) {
  const voters = admin.voters;
  return (
    <section className="votaciones-panel">
      <div className="votaciones-kpis">
        <article><strong>{voters?.enabled_count ?? 0}</strong><span>Habilitados</span></article>
        <article><strong>{voters?.disabled_count ?? 0}</strong><span>No habilitados</span></article>
        <article><strong>{voters?.pending_payment_count ?? 0}</strong><span>Pendientes de pago</span></article>
        <article><strong>{voters?.padro_total ?? 0}</strong><span>Total padrón</span></article>
      </div>
      <div className="page-heading page-heading-actions">
        <input
          onChange={(event) => {
            admin.setVoterQuery(event.target.value);
            void admin.loadVoters(event.target.value);
          }}
          placeholder="Buscar socio"
          value={admin.voterQuery}
        />
        <div className="votaciones-inline-form">
          <button className="secondary-button" onClick={() => void admin.syncPadron()} type="button">Sincronizar padrón</button>
          <button className="secondary-button" onClick={() => void admin.exportPadron()} type="button">Exportar a Excel</button>
        </div>
      </div>
      <table className="votaciones-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>N° socio</th>
            <th>Profesión</th>
            <th>Estado de pago</th>
            <th>Habilitado</th>
            <th>Correo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {voters?.items.map((item) => (
            <tr key={item.user_id}>
              <td>{item.names} {item.lastname}</td>
              <td>{item.member_code}</td>
              <td>{item.profession || "—"}</td>
              <td>{item.payment_status === "al_dia" || item.payment_status === "gracia" ? "Al día" : "Pendiente"}</td>
              <td>{item.voting_enabled ? "Habilitado" : "No habilitado"}</td>
              <td>{item.email}</td>
              <td>
                <button
                  className="secondary-button"
                  onClick={() => void admin.toggleVote(item.user_id, !item.voting_enabled)}
                  type="button"
                >
                  {item.voting_enabled ? "Quitar voto" : "Habilitar voto"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function ReportsPanel({ admin }: { admin: ReturnType<typeof useAdminElection> }) {
  const report = admin.report;
  if (!report) {
    return <p className="muted">Cargando reportes...</p>;
  }
  const maxVotes = Math.max(...report.rows.map((row) => row.votes), 1);
  const votedPct = report.participation;
  return (
    <section className="votaciones-reports">
      <div className="page-heading page-heading-actions">
        <div className="votaciones-inline-form">
          <button className="secondary-button" onClick={() => void admin.exportPdf()} type="button">Exportar PDF</button>
          <button className="secondary-button" onClick={() => void admin.exportExcel()} type="button">Exportar Excel</button>
          <button className="primary-button" onClick={() => void admin.generateActa()} type="button">Generar acta</button>
        </div>
      </div>
      <div className="votaciones-kpis">
        <article><strong>{report.eligible}</strong><span>Votantes habilitados</span></article>
        <article><strong>{report.votes_cast}</strong><span>Votos emitidos</span></article>
        <article><strong>{report.participation.toFixed(1)}%</strong><span>Participación</span></article>
        <article><strong>{report.blank_votes}</strong><span>Votos en blanco</span></article>
        <article><strong>{report.lists_count}</strong><span>Listas participantes</span></article>
      </div>
      <div className="votaciones-report-grid">
        <section className="card">
          <h3>Votos por lista</h3>
          <div className="votaciones-bars">
            {report.rows.map((row) => (
              <div key={row.name}>
                <span>{row.name}</span>
                <i style={{ width: `${(row.votes / maxVotes) * 100}%`, background: row.color || "var(--primary)" }} />
                <em>{row.votes}</em>
              </div>
            ))}
          </div>
        </section>
        <section className="card votaciones-donut-card">
          <h3>Participación electoral</h3>
          <div
            className="votaciones-donut"
            style={{ background: `conic-gradient(var(--primary) ${votedPct * 3.6}deg, #e2e8f0 0)` }}
          >
            <strong>{votedPct.toFixed(1)}%</strong>
          </div>
        </section>
        <section className="card">
          <h3>Resultados por lista</h3>
          <table className="votaciones-table">
            <thead>
              <tr>
                <th>Lista</th>
                <th>Candidato principal</th>
                <th>Votos</th>
                <th>%</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.principal_name}</td>
                  <td>{row.votes}</td>
                  <td>{row.percentage.toFixed(1)}%</td>
                  <td>{row.result_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <ol className="votaciones-trace">
        {report.timeline.map((item) => (
          <li className={`is-${item.tone}`} key={item.key}>
            <strong>{item.title}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
