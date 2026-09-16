"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import {
  ELECTION_STATUS_LABELS,
  calendarEventDate,
  formatCronogramaDate,
  formatDate,
  formatLongSpanishDate,
  mediaUrl,
  type ConfigPanel,
  type Election,
  type ElectionList,
  type MessageTemplate,
} from "@/modules/votaciones/domain/types";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";
import { TextEditor } from "@/shared/components/text-editor";

const CONFIG_PANELS: Array<{ id: ConfigPanel; label: string }> = [
  { id: "cargos", label: "Cargos y requisitos" },
  { id: "diseno", label: "Diseño y visibilidad" },
  { id: "opciones", label: "Opciones de votación" },
  { id: "mensajes", label: "Mensajes y notificaciones" },
];

const HERO_COPY: Record<ConfigPanel, string> = {
  cargos: "Define la información y parámetros de la elección de la directiva del Colegio.",
  diseno: "Define la información visual y de visibilidad de la elección de la directiva del Colegio.",
  opciones: "Define la información y parámetros de la elección de la directiva del Colegio.",
  mensajes: "Define los mensajes y notificaciones que se enviarán durante el proceso electoral.",
};

const FILE_SIZES = [1, 2, 3, 5, 8, 10, 15, 20];
const SUBJECT_MAX = 180;
const TITLE_MAX = 100;
const SUBTITLE_MAX = 300;
const TAGLINE_MAX = 200;

export function AdminSettingsPanel({
  admin,
  election,
  panel,
  setPanel,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
  panel: ConfigPanel;
  setPanel: (value: ConfigPanel) => void;
}) {
  const [draft, setDraft] = useState(election);
  const [templates, setTemplates] = useState(election.templates);
  const [newPosition, setNewPosition] = useState("");
  const [addingPosition, setAddingPosition] = useState(false);
  const [editingPositionId, setEditingPositionId] = useState<number | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTemplate, setPreviewTemplate] = useState("convocatoria");
  const [previewChannel, setPreviewChannel] = useState<"email" | "portal" | "internal">("email");
  const readonly = election.is_readonly;

  useEffect(() => {
    setDraft(election);
    setTemplates(election.templates);
  }, [election]);

  useEffect(() => {
    if (!templates.some((item) => item.template_key === previewTemplate)) {
      setPreviewTemplate(templates[0]?.template_key || "convocatoria");
    }
  }, [templates, previewTemplate]);

  useEffect(() => {
    if (panel !== "mensajes") {
      return;
    }
    void admin.refreshMessageStatus();
  }, [panel, election.id]);

  function patch<K extends keyof Election>(key: K, value: Election[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save() {
    if (panel === "mensajes") {
      void admin.saveTemplates(templates);
      return;
    }
    void admin.saveElection(draft);
  }

  const saveLabel =
    panel === "diseno" ? "Guardar diseño" : panel === "opciones" || panel === "mensajes" ? "Guardar configuración" : "Guardar cambios";

  return (
    <section className="votaciones-cfg">
      <Link className="votaciones-voters-back" href="/admin/votaciones">
        {chevronLeft()} Volver
      </Link>

      <header className="votaciones-cfg-hero">
        <div className="votaciones-voters-hero">
          <span className="votaciones-voters-hero-icon" aria-hidden="true">
            {gearIcon()}
          </span>
          <div>
            <h1>Configuración de elecciones</h1>
            <p>{HERO_COPY[panel]}</p>
          </div>
        </div>
        <div className="votaciones-cfg-actions">
          {panel === "cargos" ? (
            <button className="votaciones-cfg-ghost" disabled={readonly} onClick={() => setDraft(election)} type="button">
              {refreshIcon()} Restaurar valores
            </button>
          ) : (
            <em className={`votaciones-cfg-status is-${election.status}`}>
              {election.status === "en_preparacion" ? "Borrador" : ELECTION_STATUS_LABELS[election.status]}
            </em>
          )}
          <button className="primary-button" disabled={readonly || admin.isMutating} onClick={save} type="button">
            {saveIcon()} {saveLabel}
          </button>
        </div>
      </header>

      <nav className="votaciones-cfg-tabs">
        {CONFIG_PANELS.map((item) => (
          <button className={panel === item.id ? "is-active" : ""} key={item.id} onClick={() => setPanel(item.id)} type="button">
            {tabIcon(item.id)} {item.label}
          </button>
        ))}
      </nav>

      {panel === "cargos" ? (
        <CargosTab
          adding={addingPosition}
          admin={admin}
          draft={draft}
          editingId={editingPositionId}
          election={election}
          newPosition={newPosition}
          onCancelAdd={() => {
            setNewPosition("");
            setAddingPosition(false);
          }}
          onAdd={(event) => {
            event.preventDefault();
            if (!newPosition.trim()) {
              return;
            }
            void admin.addPosition(newPosition).then(() => {
              setNewPosition("");
              setAddingPosition(false);
            });
          }}
          onEditName={(id, name) => {
            void admin.patchPosition(id, { name });
            setEditingPositionId(null);
          }}
          onNewPosition={setNewPosition}
          onPatch={patch}
          onReorder={(ids) => void admin.reorderPositions(ids)}
          onStartAdd={() => setAddingPosition(true)}
          onToggleEdit={setEditingPositionId}
          readonly={readonly}
        />
      ) : null}

      {panel === "diseno" ? (
        <DesignTab
          admin={admin}
          device={previewDevice}
          draft={draft}
          lists={admin.lists}
          onDevice={setPreviewDevice}
          onPatch={patch}
          onSave={save}
          readonly={readonly}
        />
      ) : null}

      {panel === "opciones" ? (
        <OptionsTab draft={draft} lists={admin.lists} onPatch={patch} readonly={readonly} />
      ) : null}

      {panel === "mensajes" ? (
        <MessagesTab
          admin={admin}
          channel={previewChannel}
          draft={draft}
          onChannel={setPreviewChannel}
          onSave={() => void admin.saveTemplates(templates)}
          onSelect={setPreviewTemplate}
          onTemplates={setTemplates}
          previewKey={previewTemplate}
          readonly={readonly}
          templates={templates}
          testEmail={testEmail}
          onTestEmail={setTestEmail}
        />
      ) : null}
    </section>
  );
}

function CargosTab({
  admin,
  draft,
  election,
  readonly,
  adding,
  newPosition,
  editingId,
  onPatch,
  onAdd,
  onCancelAdd,
  onStartAdd,
  onNewPosition,
  onToggleEdit,
  onEditName,
  onReorder,
}: {
  admin: ReturnType<typeof useAdminElection>;
  draft: Election;
  election: Election;
  readonly: boolean;
  adding: boolean;
  newPosition: string;
  editingId: number | null;
  onPatch: <K extends keyof Election>(key: K, value: Election[K]) => void;
  onAdd: (event: FormEvent) => void;
  onCancelAdd: () => void;
  onStartAdd: () => void;
  onNewPosition: (value: string) => void;
  onToggleEdit: (id: number | null) => void;
  onEditName: (id: number, name: string) => void;
  onReorder: (ids: number[]) => void;
}) {
  const positions = [...election.positions].sort((a, b) => a.sort_order - b.sort_order);
  const requiredPhoto = draft.photo_required || positions.some((item) => item.photo_required);
  const requiredName = positions.some((item) => item.full_name_required);
  const requiredProfession = positions.some((item) => item.profession_required);
  const requiredProfile = positions.some((item) => item.short_profile_required);
  const preview = firstCandidate(admin.lists);

  function move(id: number, order: number) {
    const next = positions.filter((item) => item.id !== id);
    const current = positions.find((item) => item.id === id);
    if (!current) {
      return;
    }
    next.splice(order - 1, 0, current);
    onReorder(next.map((item) => item.id));
  }

  return (
    <div className="votaciones-cfg-layout">
      <div className="votaciones-cfg-main">
        <section className="votaciones-cfg-card">
          <header>
            <div>
              <span aria-hidden="true">{badgeIcon()}</span>
              <div>
                <h2>Cargos de la lista</h2>
                <p>Define los cargos que conforman la directiva y los requisitos de información para cada candidato.</p>
              </div>
            </div>
            {adding ? (
              <form className="votaciones-cfg-add" onSubmit={onAdd}>
                <input autoFocus onChange={(event) => onNewPosition(event.target.value)} placeholder="Nombre del cargo" value={newPosition} />
                <button className="primary-button" disabled={readonly} type="submit">
                  Agregar
                </button>
                <button className="votaciones-cfg-ghost" onClick={onCancelAdd} type="button">
                  Cancelar
                </button>
              </form>
            ) : (
              <button className="votaciones-cfg-link" disabled={readonly} onClick={onStartAdd} type="button">
                {plusIcon()} Agregar cargo
              </button>
            )}
          </header>
          <div className="votaciones-table-wrap">
            <table className="votaciones-table votaciones-cfg-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Cargo</th>
                  <th>Activo</th>
                  <th>Orden</th>
                  <th>Foto obligatoria</th>
                  <th>Nombre completo</th>
                  <th>Perfil breve</th>
                  <th>Profesión</th>
                  <th>Visible a miembros</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr key={position.id}>
                    <td>{index + 1}</td>
                    <td>
                      {editingId === position.id ? (
                        <input
                          autoFocus
                          defaultValue={position.name}
                          disabled={readonly}
                          onBlur={(event) => {
                            const name = event.target.value.trim();
                            if (name && name !== position.name) {
                              onEditName(position.id, name);
                            } else {
                              onToggleEdit(null);
                            }
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.currentTarget.blur();
                            }
                            if (event.key === "Escape") {
                              onToggleEdit(null);
                            }
                          }}
                        />
                      ) : (
                        position.name
                      )}
                    </td>
                    <td>
                      <Switch
                        checked={position.is_active}
                        disabled={readonly}
                        onChange={(checked) => void admin.patchPosition(position.id, { is_active: checked })}
                      />
                    </td>
                    <td>
                      <select disabled={readonly} onChange={(event) => move(position.id, Number(event.target.value))} value={index + 1}>
                        {positions.map((_, order) => (
                          <option key={order + 1} value={order + 1}>
                            {order + 1}
                          </option>
                        ))}
                      </select>
                    </td>
                    {(
                      [
                        "photo_required",
                        "full_name_required",
                        "short_profile_required",
                        "profession_required",
                        "visible_to_members",
                      ] as const
                    ).map((flag) => (
                      <td key={flag}>
                        <Switch
                          checked={position[flag]}
                          disabled={readonly}
                          onChange={(checked) => void admin.patchPosition(position.id, { [flag]: checked })}
                        />
                      </td>
                    ))}
                    <td>
                      <div className="votaciones-cfg-row-actions">
                        <span aria-hidden="true">{gripIcon()}</span>
                        <button aria-label="Editar cargo" disabled={readonly} onClick={() => onToggleEdit(position.id)} type="button">
                          {editIcon()}
                        </button>
                        <button aria-label="Eliminar cargo" disabled={readonly} onClick={() => void admin.removePosition(position.id)} type="button">
                          {trashIcon()}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{shieldIcon()}</span>
            <div>
              <h2>Requisitos para inscripción de listas</h2>
              <p>Configura los documentos y condiciones que deben cumplir las listas al momento de su inscripción.</p>
            </div>
          </header>
          <div className="votaciones-cfg-reqs">
            <ReqSwitch
              checked={draft.work_plan_required}
              disabled={readonly}
              hint="Cada lista debe adjuntar su plan de trabajo."
              label="Plan de trabajo obligatorio"
              onChange={(checked) => onPatch("work_plan_required", checked)}
            />
            <ReqSwitch
              checked={draft.list_color_required}
              disabled={readonly}
              hint="Permite que las listas seleccionen un color identificativo."
              label="Color distintivo de la lista"
              onChange={(checked) => onPatch("list_color_required", checked)}
            />
            <ReqSwitch
              checked={draft.photo_required}
              disabled={readonly}
              hint="Todos los candidatos deben contar con una fotografía."
              label="Foto de cada integrante obligatoria"
              onChange={(checked) => onPatch("photo_required", checked)}
            />
            <ReqSwitch
              checked={draft.backing_document_required}
              disabled={readonly}
              hint="Carta de respaldo o aval (formato PDF)."
              label="Documento de respaldo"
              onChange={(checked) => onPatch("backing_document_required", checked)}
            />
            <ReqSwitch
              checked={draft.accept_position_required}
              disabled={readonly}
              hint="Cada candidato debe aceptar formalmente el cargo."
              label="Aceptación del cargo"
              onChange={(checked) => onPatch("accept_position_required", checked)}
            />
            <label className="votaciones-cfg-field">
              <span>
                Fecha límite de inscripción <em>*</em>
              </span>
              <input
                disabled={readonly}
                onChange={(event) => onPatch("registration_deadline", event.target.value || null)}
                type="date"
                value={draft.registration_deadline ?? ""}
              />
            </label>
            <ReqSwitch
              checked={draft.list_logo_enabled}
              disabled={readonly}
              hint="Permite que las listas carguen un logo o imagen representativa."
              label="Logo de la lista (opcional)"
              onChange={(checked) => onPatch("list_logo_enabled", checked)}
            />
            <label className="votaciones-cfg-field">
              <span>Tamaño máximo de archivos</span>
              <select disabled={readonly} onChange={(event) => onPatch("max_file_mb", Number(event.target.value))} value={draft.max_file_mb}>
                {FILE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} MB
                  </option>
                ))}
              </select>
              <small>Aplica para fotos, planes de trabajo y documentos.</small>
            </label>
          </div>
        </section>
      </div>

      <aside className="votaciones-cfg-side">
        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{barsIcon()}</span>
            <div>
              <h2>Resumen de configuración</h2>
            </div>
          </header>
          <div className="votaciones-cfg-summary">
            <strong>{positions.length}</strong>
            <div>
              <p>Cargos configurados</p>
              <em className={positions.some((item) => item.is_active) ? "is-on" : ""}>
                {positions.some((item) => item.is_active) ? "Activo" : "Inactivo"}
              </em>
            </div>
          </div>
          <h3>Campos obligatorios para candidatos</h3>
          <ul className="votaciones-cfg-checks">
            <li className={requiredPhoto ? "is-on" : ""}>Foto del candidato</li>
            <li className={requiredName ? "is-on" : ""}>Nombre completo</li>
            <li className={requiredProfession ? "is-on" : ""}>Profesión</li>
            <li className={requiredProfile ? "is-on" : "is-optional"}>Perfil breve {requiredProfile ? "" : "(opcional)"}</li>
            <li className="is-optional">Otros (según configuración)</li>
          </ul>
          <p className="votaciones-cfg-note">{infoIcon()} Esta configuración se aplicará a todas las listas inscritas en el proceso electoral.</p>
        </section>

        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{eyeIcon()}</span>
            <div>
              <h2>Vista previa de tarjeta de candidato</h2>
              <p>Así se mostrará la información a los miembros del portal.</p>
            </div>
          </header>
          <article className="votaciones-cfg-candidate">
            {preview.photo_url ? <img alt="" src={mediaUrl(preview.photo_url)} /> : <span aria-hidden="true">{userIcon()}</span>}
            <div>
              <strong>{preview.full_name}</strong>
              <em>{preview.position_name}</em>
              <small>{preview.profession}</small>
              <p>{preview.short_profile}</p>
              <button className="votaciones-cfg-plan" type="button">
                {fileIcon()} Plan de Trabajo
              </button>
            </div>
          </article>
        </section>
      </aside>
    </div>
  );
}

function DesignTab({
  admin,
  draft,
  lists,
  readonly,
  device,
  onPatch,
  onDevice,
  onSave,
}: {
  admin: ReturnType<typeof useAdminElection>;
  draft: Election;
  lists: ElectionList[];
  readonly: boolean;
  device: "desktop" | "mobile";
  onPatch: <K extends keyof Election>(key: K, value: Election[K]) => void;
  onDevice: (value: "desktop" | "mobile") => void;
  onSave: () => void;
}) {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const voting = draft.calendar.find((item) => item.event_key === "votacion");
  const votingStart = voting ? calendarEventDate(voting).start : draft.voting_starts_on;
  const votingEnd = voting?.ends_on || draft.voting_ends_on;
  const visibleLists = lists.filter((item) => item.status === "activa").slice(0, 3);

  return (
    <div className="votaciones-cfg-layout is-design">
      <div className="votaciones-cfg-main">
        <section className="votaciones-cfg-card">
          <header>
            <div>
              <span aria-hidden="true">{brushIcon()}</span>
              <div>
                <h2>Identidad visual del proceso</h2>
                <p>Configura los elementos visuales que verán los miembros en el portal.</p>
              </div>
            </div>
          </header>
          <div className="votaciones-cfg-media">
            <article>
              <p>Logo del proceso</p>
              <div>
                <div className="votaciones-cfg-thumb">
                  {draft.logo_url ? <img alt="Logo del proceso" src={mediaUrl(draft.logo_url)} /> : <span>Logo</span>}
                </div>
                <button className="votaciones-cfg-ghost" disabled={readonly} onClick={() => logoRef.current?.click()} type="button">
                  {uploadIcon()} Cambiar logo
                </button>
                <input
                  accept="image/png,image/jpeg,image/svg+xml"
                  hidden
                  onChange={(event) => event.target.files?.[0] && void admin.uploadMedia("logo", event.target.files[0])}
                  ref={logoRef}
                  type="file"
                />
              </div>
              <small>PNG, JPG o SVG. Máx. {draft.max_file_mb} MB.</small>
            </article>
            <article>
              <p>Banner principal</p>
              <div>
                <div className="votaciones-cfg-thumb is-wide">
                  {draft.banner_url ? <img alt="Banner principal" src={mediaUrl(draft.banner_url)} /> : <span>Banner</span>}
                </div>
                <button className="votaciones-cfg-ghost" disabled={readonly} onClick={() => bannerRef.current?.click()} type="button">
                  {uploadIcon()} Cambiar banner
                </button>
                <input
                  accept="image/png,image/jpeg"
                  hidden
                  onChange={(event) => event.target.files?.[0] && void admin.uploadMedia("banner", event.target.files[0])}
                  ref={bannerRef}
                  type="file"
                />
              </div>
              <small>PNG o JPG. Tamaño recomendado: 1200 x 300 px.</small>
            </article>
          </div>
          <div className="votaciones-cfg-colors">
            <label>
              Color principal
              <span className="votaciones-color-field">
                <input disabled={readonly} onChange={(event) => onPatch("primary_color", event.target.value)} type="color" value={draft.primary_color} />
                <em>{draft.primary_color.toUpperCase()}</em>
              </span>
            </label>
            <label>
              Color secundario
              <span className="votaciones-color-field">
                <input disabled={readonly} onChange={(event) => onPatch("secondary_color", event.target.value)} type="color" value={draft.secondary_color} />
                <em>{draft.secondary_color.toUpperCase()}</em>
              </span>
            </label>
          </div>
          <label className="votaciones-cfg-field">
            <span>Título visible</span>
            <input disabled={readonly} maxLength={TITLE_MAX} onChange={(event) => onPatch("title", event.target.value)} value={draft.title} />
            <small>{draft.title.length}/{TITLE_MAX}</small>
          </label>
          <label className="votaciones-cfg-field">
            <span>Mensaje principal</span>
            <textarea disabled={readonly} maxLength={SUBTITLE_MAX} onChange={(event) => onPatch("subtitle", event.target.value)} rows={3} value={draft.subtitle} />
            <small>{draft.subtitle.length}/{SUBTITLE_MAX}</small>
          </label>
          <label className="votaciones-cfg-field">
            <span>Frase institucional</span>
            <textarea disabled={readonly} maxLength={TAGLINE_MAX} onChange={(event) => onPatch("tagline", event.target.value)} rows={2} value={draft.tagline} />
            <small>{draft.tagline.length}/{TAGLINE_MAX}</small>
          </label>
          <div className="votaciones-cfg-split">
            <section>
              <header>
                <span aria-hidden="true">{eyeIcon()}</span>
                <div>
                  <h3>Opciones de visibilidad y contenido</h3>
                  <p>Define qué información verán los miembros en el portal.</p>
                </div>
              </header>
              <ReqSwitch
                checked={draft.show_work_plan}
                disabled={readonly}
                label="Mostrar plan de trabajo sin descarga"
                onChange={(checked) => onPatch("show_work_plan", checked)}
              />
              <ReqSwitch
                checked={draft.show_all_photos}
                disabled={readonly}
                label="Mostrar fotos de todos los integrantes"
                onChange={(checked) => onPatch("show_all_photos", checked)}
              />
              <ReqSwitch
                checked={draft.show_process_status}
                disabled={readonly}
                label="Mostrar estado del proceso"
                onChange={(checked) => onPatch("show_process_status", checked)}
              />
              <ReqSwitch
                checked={draft.members_only}
                disabled={readonly}
                label="Visible solo para socios al día"
                onChange={(checked) => onPatch("members_only", checked)}
              />
            </section>
            <section>
              <header>
                <span aria-hidden="true">{calendarIcon()}</span>
                <div>
                  <h3>Periodo de publicación</h3>
                  <p>Define cuándo se mostrará la información en el portal.</p>
                </div>
              </header>
              <div className="votaciones-cfg-dates">
                <label>
                  Publicar desde
                  <input disabled={readonly} onChange={(event) => onPatch("publish_from", event.target.value || null)} type="date" value={draft.publish_from ?? ""} />
                </label>
                <label>
                  Publicar hasta
                  <input disabled={readonly} onChange={(event) => onPatch("publish_until", event.target.value || null)} type="date" value={draft.publish_until ?? ""} />
                </label>
              </div>
              <ReqSwitch
                checked={draft.auto_publish_on_vote_start}
                disabled={readonly}
                label="Publicar automáticamente al iniciar la votación"
                onChange={(checked) => onPatch("auto_publish_on_vote_start", checked)}
              />
              <small>
                La información se hará pública en el portal el {formatDate(draft.publish_from || votingStart)}.
              </small>
            </section>
          </div>
        </section>
      </div>

      <aside className="votaciones-cfg-side">
        <section
          className="votaciones-cfg-card votaciones-cfg-preview-card"
          style={{
            ["--election-primary" as string]: draft.primary_color || "#0D47A1",
            ["--election-secondary" as string]: draft.secondary_color || "#1976D2",
          }}
        >
          <header>
            <div>
              <span aria-hidden="true">{eyeIcon()}</span>
              <div>
                <h2>Vista previa para miembros</h2>
                <p>Así se mostrará la elección en el portal de miembros.</p>
              </div>
            </div>
            <div className="votaciones-cfg-devices">
              <button className={device === "desktop" ? "is-active" : ""} onClick={() => onDevice("desktop")} type="button">
                {desktopIcon()} Escritorio
              </button>
              <button className={device === "mobile" ? "is-active" : ""} onClick={() => onDevice("mobile")} type="button">
                {mobileIcon()} Móvil
              </button>
            </div>
          </header>
          <div className={`votaciones-cfg-portal is-${device}`}>
            <div className="votaciones-cfg-portal-nav">
              <div className="votaciones-cfg-portal-brand">
                {draft.logo_url ? <img alt="" src={mediaUrl(draft.logo_url)} /> : <strong>C</strong>}
                <div>
                  <strong>COPSSTEC</strong>
                  <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo</small>
                </div>
              </div>
              <nav>
                <span>Portal de miembros</span>
                <span>Elecciones</span>
                <span>Noticias</span>
                <span>
                  Mi cuenta <b>▾</b>
                </span>
              </nav>
            </div>
            <div
              className="votaciones-cfg-portal-hero"
              style={{
                backgroundColor: draft.primary_color || "#0D47A1",
                backgroundImage: draft.banner_url ? `url(${mediaUrl(draft.banner_url)})` : undefined,
              }}
            >
              <div className="votaciones-cfg-portal-hero-copy">
                <div className="votaciones-cfg-portal-hero-brand">
                  {draft.logo_url ? <img alt="" src={mediaUrl(draft.logo_url)} /> : null}
                  <div>
                    <strong>COPSSTEC</strong>
                    <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo</small>
                  </div>
                </div>
                <h3>{draft.title || "Título de la elección"}</h3>
                {draft.subtitle ? <p>{draft.subtitle}</p> : null}
                {draft.tagline ? <blockquote>“{draft.tagline}”</blockquote> : null}
              </div>
              <aside className="votaciones-cfg-portal-hero-words" aria-hidden="true">
                <span>PROFESIONALES</span>
                <span>SEGURIDAD</span>
                <span>SALUD</span>
                <span>BIENESTAR</span>
              </aside>
            </div>
            <div className="votaciones-cfg-portal-kpis">
              <article>
                <i>{calendarIcon()}</i>
                <div>
                  <strong>Votación</strong>
                  <span>{formatCronogramaDate(votingStart, votingEnd)}</span>
                </div>
              </article>
              <article>
                <i>{usersIcon()}</i>
                <div>
                  <strong>Candidatos</strong>
                  <span>
                    {lists.length} {lists.length === 1 ? "lista inscrita" : "listas inscritas"}
                  </span>
                </div>
              </article>
              <article>
                <i>{fileIcon()}</i>
                <div>
                  <strong>Tu voto cuenta</strong>
                  <span>Por un mejor futuro profesional</span>
                </div>
              </article>
            </div>
            <div className="votaciones-cfg-portal-lists">
              <header>
                <h4>Listas participantes</h4>
                {draft.show_work_plan ? (
                  <span>
                    {checkIcon()} Ver plan de trabajo
                  </span>
                ) : null}
              </header>
              <div>
                {(visibleLists.length > 0 ? visibleLists : lists.slice(0, 3)).map((lista, index) => (
                  <article key={lista.id}>
                    <div className="votaciones-cfg-portal-list-head">
                      <i style={{ background: lista.color || draft.primary_color }} />
                      <div>
                        <small>LISTA {lista.sort_order || index + 1}</small>
                        <strong>{lista.name}</strong>
                      </div>
                    </div>
                    {draft.show_all_photos ? (
                      <div className="votaciones-cfg-faces">
                        {previewFaces(lista).map((candidate, faceIndex) =>
                          candidate?.photo_url ? (
                            <img alt="" key={candidate.id} src={mediaUrl(candidate.photo_url)} />
                          ) : (
                            <span key={candidate?.id || `face-${lista.id}-${faceIndex}`}>
                              {candidate?.full_name.slice(0, 1) || ""}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
                    <p>{lista.slogan || "Participa por un mejor colegio."}</p>
                    <em>
                      Ver detalles <b>›</b>
                    </em>
                  </article>
                ))}
                {lists.length === 0 ? <p className="muted">Aún no hay listas para previsualizar.</p> : null}
              </div>
            </div>
          </div>
          <footer>
            <button className="votaciones-cfg-ghost" type="button">
              {eyeIcon()} Vista previa
            </button>
            <button className="primary-button" disabled={readonly} onClick={onSave} type="button">
              {saveIcon()} Guardar diseño
            </button>
          </footer>
        </section>
      </aside>
    </div>
  );
}

function OptionsTab({
  draft,
  lists,
  readonly,
  onPatch,
}: {
  draft: Election;
  lists: ElectionList[];
  readonly: boolean;
  onPatch: <K extends keyof Election>(key: K, value: Election[K]) => void;
}) {
  const ballotLists = lists.filter((item) => item.status === "activa");
  const shown = ballotLists.length > 0 ? ballotLists : lists;

  return (
    <div className="votaciones-cfg-layout">
      <div className="votaciones-cfg-main">
        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{gearIcon()}</span>
            <div>
              <h2>Opciones de votación</h2>
              <p>Define cómo se realizará la votación, las reglas y restricciones que aplicarán.</p>
            </div>
          </header>
          <h3>Modalidad de votación</h3>
          <p className="muted">Selecciona la forma en que los miembros podrán emitir su voto.</p>
          <div className="votaciones-cfg-choices">
            <button className="is-active" type="button">
              {laptopIcon()}
              <strong>Votación en línea</strong>
              <span>Los miembros votan desde el portal con su usuario y contraseña.</span>
            </button>
            <button disabled type="button">
              {buildingIcon()}
              <strong>Votación presencial</strong>
              <span>En centros de votación habilitados (registro manual en el sistema).</span>
            </button>
            <button disabled type="button">
              {mixIcon()}
              <strong>Mixta</strong>
              <span>Combinación de votación en línea y presencial.</span>
            </button>
          </div>
          <h3>Tipo de elección</h3>
          <p className="muted">Define si los miembros votarán por listas completas o por cargos individuales.</p>
          <div className="votaciones-cfg-choices is-two">
            <button
              className={draft.election_type === "lista_completa" ? "is-active" : ""}
              disabled={readonly}
              onClick={() => onPatch("election_type", "lista_completa")}
              type="button"
            >
              {listIcon()}
              <strong>Lista completa</strong>
              <span>El votante selecciona una sola lista (con todos los cargos).</span>
            </button>
            <button
              className={draft.election_type === "voto_por_cargos" ? "is-active" : ""}
              disabled={readonly}
              onClick={() => onPatch("election_type", "voto_por_cargos")}
              type="button"
            >
              {userIcon()}
              <strong>Voto por cargos</strong>
              <span>El votante puede elegir candidatos por cada cargo.</span>
            </button>
          </div>
          <h3>Reglas de votación</h3>
          <p className="muted">Configura las restricciones y validaciones durante el proceso.</p>
          <ReqSwitch
            checked={draft.one_vote_per_member}
            disabled={readonly}
            hint="Cada miembro podrá votar una única vez."
            label="Permitir un solo voto por miembro"
            onChange={(checked) => onPatch("one_vote_per_member", checked)}
            tone="green"
          />
          <ReqSwitch
            checked={draft.show_work_plan}
            disabled={readonly}
            hint="Los votantes podrán revisar el plan de trabajo antes de votar."
            label="Mostrar plan de trabajo de las listas"
            onChange={(checked) => onPatch("show_work_plan", checked)}
            tone="green"
          />
          <ReqSwitch
            checked={draft.secret_vote}
            disabled={readonly}
            hint="El voto será anónimo y no se mostrará a otros miembros."
            label="Voto secreto"
            onChange={(checked) => onPatch("secret_vote", checked)}
            tone="green"
          />
          <ReqSwitch
            checked={draft.confirm_vote}
            disabled={readonly}
            hint="Solicitar confirmación antes de registrar el voto."
            label="Confirmación de voto"
            onChange={(checked) => onPatch("confirm_vote", checked)}
            tone="green"
          />
          <ReqSwitch
            checked={draft.allow_blank_vote}
            disabled={readonly}
            hint="El votante podrá elegir la opción de voto en blanco."
            label="Permitir voto en blanco"
            onChange={(checked) => onPatch("allow_blank_vote", checked)}
            tone="green"
          />
          <h3>Autenticación y seguridad</h3>
          <p className="muted">Define el método de verificación para acceder al sistema de votación.</p>
          <div className="votaciones-cfg-choices is-three">
            <button className="is-active" type="button">
              {lockIcon()}
              <strong>Usuario y contraseña</strong>
              <span>Credenciales del portal de miembros</span>
            </button>
            <button disabled type="button">
              {phoneIcon()}
              <strong>Código OTP</strong>
              <span>Código enviado al correo o celular</span>
            </button>
            <button disabled type="button">
              {shieldIcon()}
              <strong>Doble autenticación</strong>
              <span>Usuario y código OTP</span>
            </button>
          </div>
        </section>
      </div>
      <aside className="votaciones-cfg-side">
        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{eyeIcon()}</span>
            <div>
              <h2>Vista previa de la boleta</h2>
              <p>Así verán los miembros la pantalla de votación según las opciones seleccionadas.</p>
            </div>
          </header>
          <div className="votaciones-cfg-ballot">
            <h3>{draft.title}</h3>
            <p>Selecciona la lista de tu preferencia</p>
            {shown.map((lista) => (
              <label key={lista.id}>
                <input disabled type="radio" />
                {lista.logo_url ? <img alt="" src={mediaUrl(lista.logo_url)} /> : <span style={{ background: lista.color || draft.primary_color }} />}
                <div>
                  <strong>{lista.name}</strong>
                  {lista.slogan ? <small>“{lista.slogan}”</small> : null}
                </div>
                {draft.show_work_plan ? <em>Ver plan</em> : null}
              </label>
            ))}
            {draft.allow_blank_vote ? (
              <label>
                <input disabled type="radio" />
                <span className="is-blank">{fileIcon()}</span>
                <div>
                  <strong>Voto en blanco</strong>
                </div>
              </label>
            ) : null}
            <button className="primary-button" disabled type="button">
              {checkIcon()} Emitir mi voto
            </button>
          </div>
          <p className="votaciones-cfg-note">
            {infoIcon()} ¿Qué son las opciones de votación?
            <span>
              En esta sección defines cómo los miembros podrán votar, si será por lista completa o por cargos individuales, qué validaciones se aplicarán y qué métodos de seguridad se utilizarán. Estas opciones configuran un proceso transparente, seguro y alineado a la normativa del Colegio.
            </span>
          </p>
          <p className="votaciones-cfg-ok">{checkIcon()} Las opciones de votación se pueden modificar mientras la elección se encuentre en estado Borrador.</p>
        </section>
      </aside>
    </div>
  );
}

function MessagesTab({
  admin,
  templates,
  draft,
  readonly,
  previewKey,
  channel,
  testEmail,
  onTemplates,
  onSelect,
  onChannel,
  onTestEmail,
  onSave,
}: {
  admin: ReturnType<typeof useAdminElection>;
  templates: MessageTemplate[];
  draft: Election;
  readonly: boolean;
  previewKey: string;
  channel: "email" | "portal" | "internal";
  testEmail: string;
  onTemplates: (value: MessageTemplate[]) => void;
  onSelect: (key: string) => void;
  onChannel: (value: "email" | "portal" | "internal") => void;
  onTestEmail: (value: string) => void;
  onSave: () => void;
}) {
  const ordered = [...templates].sort((a, b) => templateOrder(a.template_key) - templateOrder(b.template_key));
  const selected = ordered.find((item) => item.template_key === previewKey) || ordered[0];
  const previewBody = selected ? interpolate(selected.body, draft) : "";
  const previewSubject = selected ? interpolate(selected.subject, draft) : "";
  const scheduleRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, string>>({});

  function update(index: number, patch: Partial<MessageTemplate>) {
    onTemplates(templates.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function openSchedulePicker(templateKey: string) {
    onSelect(templateKey);
    requestAnimationFrame(() => {
      const input = scheduleRefs.current[templateKey];
      input?.focus();
      input?.showPicker?.();
    });
  }

  async function confirmSchedule(templateKey: string, value: string) {
    setScheduleDrafts((current) => ({ ...current, [templateKey]: value }));
    await admin.saveTemplates(templates);
    await admin.scheduleDispatch(templateKey, fromDatetimeLocal(value));
  }

  const voting = draft.calendar.find((item) => item.event_key === "votacion");
  const votingStart = voting ? calendarEventDate(voting).start : draft.voting_starts_on;
  const votingEnd = voting?.ends_on || draft.voting_ends_on;

  return (
    <div className="votaciones-cfg-layout is-messages">
      <div className="votaciones-cfg-main">
        <section className="votaciones-cfg-card">
          <header>
            <span aria-hidden="true">{bellIcon()}</span>
            <div>
              <h2>Plantillas de mensajes</h2>
              <p>Configura los mensajes que se enviarán automáticamente en cada etapa del proceso electoral.</p>
            </div>
          </header>
          <div className="votaciones-cfg-messages">
            {ordered.map((template) => {
              const index = templates.findIndex((item) => item.template_key === template.template_key);
              const expanded = template.template_key === previewKey;
              const delivery = admin.messageStatus.find((item) => item.template_key === template.template_key);
              const scheduleValue = scheduleDrafts[template.template_key] ?? toDatetimeLocal(template.scheduled_at || delivery?.scheduled_at);
              return (
                <article className={expanded ? "is-active" : ""} key={template.template_key}>
                  <button className="votaciones-cfg-msg-hit" onClick={() => onSelect(template.template_key)} type="button">
                    <span className={`is-${template.template_key}`} aria-hidden="true">
                      {messageIcon(template.template_key)}
                    </span>
                    <div>
                      <strong>{template.title}</strong>
                      <small>{messageHint(template.template_key)}</small>
                      <div className="votaciones-cfg-msg-chips">
                        <em className="is-sent">Enviados {delivery?.sent ?? 0}</em>
                        <em className="is-pending">Pendientes {delivery?.pending ?? 0}</em>
                        {(delivery?.failed ?? 0) > 0 ? <em className="is-failed">Fallidos {delivery?.failed}</em> : null}
                        {scheduleValue ? <em className="is-scheduled">Programado {formatScheduleLabel(scheduleValue)}</em> : null}
                      </div>
                    </div>
                    <i className={expanded ? "is-open" : ""} aria-hidden="true">
                      {chevronDown()}
                    </i>
                  </button>
                  {expanded ? (
                    <div className="votaciones-cfg-msg-body">
                      <div className="votaciones-cfg-msg-channels">
                        <p>Canales de envío</p>
                        <label>
                          <input
                            checked={template.channel_email}
                            disabled={readonly}
                            onChange={(event) => update(index, { channel_email: event.target.checked })}
                            type="checkbox"
                          />{" "}
                          Correo
                        </label>
                        <label>
                          <input
                            checked={template.channel_portal}
                            disabled={readonly}
                            onChange={(event) => update(index, { channel_portal: event.target.checked })}
                            type="checkbox"
                          />{" "}
                          Notificación en portal
                        </label>
                        <label>
                          <input
                            checked={template.channel_internal}
                            disabled={readonly}
                            onChange={(event) => update(index, { channel_internal: event.target.checked })}
                            type="checkbox"
                          />{" "}
                          Mensaje interno
                        </label>
                      </div>
                      <label>
                        Asunto del mensaje
                        <input
                          disabled={readonly}
                          maxLength={SUBJECT_MAX}
                          onChange={(event) => update(index, { subject: event.target.value })}
                          value={template.subject}
                        />
                        <small>
                          Variables disponibles: {"{nombre}"} {"{titulo}"} {"{fecha_inicio}"} {"{fecha_fin}"} {"{lista}"}
                        </small>
                      </label>
                      <div className="votaciones-cfg-msg-editor">
                        <span>Mensaje</span>
                        <TextEditor
                          disabled={readonly}
                          height={280}
                          id={`election-message-${template.template_key}`}
                          onChange={(value) => update(index, { body: value })}
                          value={template.body}
                        />
                        <small>El editor permite enriquecer el texto que verán los miembros en el correo y en el portal.</small>
                      </div>
                      <div className="votaciones-cfg-msg-schedule">
                        <label>
                          Programar envío de este mensaje
                          <input
                            disabled={readonly}
                            onChange={(event) => {
                              const value = event.target.value;
                              setScheduleDrafts((current) => ({ ...current, [template.template_key]: value }));
                            }}
                            ref={(node) => {
                              scheduleRefs.current[template.template_key] = node;
                            }}
                            type="datetime-local"
                            value={scheduleValue}
                          />
                        </label>
                        <div>
                          <button
                            className="votaciones-cfg-ghost"
                            disabled={readonly || !scheduleValue}
                            onClick={() => void confirmSchedule(template.template_key, scheduleValue)}
                            type="button"
                          >
                            {clockIcon()} Confirmar programación
                          </button>
                          <button
                            className="votaciones-cfg-ghost"
                            disabled={readonly || (delivery?.pending ?? 0) === 0}
                            onClick={() => {
                              void admin.saveTemplates(templates).then(() => admin.resendUnsent(template.template_key));
                            }}
                            type="button"
                          >
                            {refreshIcon()} Reenviar no enviados
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      </div>
      <aside className="votaciones-cfg-side">
        <section className="votaciones-cfg-card votaciones-cfg-preview-card">
          <header>
            <div>
              <span aria-hidden="true">{eyeIcon()}</span>
              <div>
                <h2>Vista previa del mensaje</h2>
                <p>Previsualiza cómo se verá el mensaje en los diferentes canales.</p>
              </div>
            </div>
          </header>
          <div className="votaciones-cfg-devices">
            <button className={channel === "email" ? "is-active" : ""} onClick={() => onChannel("email")} type="button">
              Correo electrónico
            </button>
            <button className={channel === "portal" ? "is-active" : ""} onClick={() => onChannel("portal")} type="button">
              Notificación en portal
            </button>
            <button className={channel === "internal" ? "is-active" : ""} onClick={() => onChannel("internal")} type="button">
              Mensaje interno
            </button>
          </div>
          {channel === "email" ? (
            <article className="votaciones-cfg-mail">
              <div className="votaciones-cfg-mail-brand">
                {draft.logo_url ? <img alt="" src={mediaUrl(draft.logo_url)} /> : <strong>C</strong>}
                <div>
                  <strong>COPSSTEC</strong>
                  <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo</small>
                </div>
              </div>
              <h3>{previewSubject || selected?.title}</h3>
              <div className="votaciones-cfg-mail-copy">{renderMailBody(previewBody)}</div>
              <div className="votaciones-cfg-mail-meta">
                <article>
                  <i>{calendarIcon()}</i>
                  <div>
                    <strong>Periodo de votación</strong>
                    <span>
                      {formatMailDate(votingStart)} – {formatMailDate(votingEnd)}
                    </span>
                  </div>
                </article>
                <article>
                  <i>{usersIcon()}</i>
                  <div>
                    <strong>Podrán participar</strong>
                    <span>Todos los miembros habilitados del Colegio</span>
                  </div>
                </article>
              </div>
              <button className="primary-button" type="button">
                Ir al portal de votación
              </button>
              <footer>
                {draft.tagline ? <em>{draft.tagline}</em> : null}
                <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo · COPSSTEC</small>
              </footer>
            </article>
          ) : (
            <article className={`votaciones-cfg-notice is-${channel}`}>
              <header>
                <i>{channel === "portal" ? bellIcon() : messageBubbleIcon()}</i>
                <strong>{channel === "portal" ? "Notificación en portal" : "Mensaje interno"}</strong>
              </header>
              <h3>{previewSubject || selected?.title}</h3>
              <div className="votaciones-cfg-mail-copy">{renderMailBody(previewBody)}</div>
            </article>
          )}
          <div className="votaciones-cfg-test-box">
            <header>
              <span aria-hidden="true">{sendIcon()}</span>
              <div>
                <strong>Enviar mensaje de prueba</strong>
                <p>Envía una prueba del mensaje seleccionado a tu correo electrónico.</p>
              </div>
            </header>
            <div className="votaciones-cfg-test">
              <input onChange={(event) => onTestEmail(event.target.value)} placeholder="ejemplo@copsstec.org" value={testEmail} />
              <button
                className="primary-button"
                disabled={!testEmail || !selected}
                onClick={() => selected && void admin.sendTest(selected.template_key, testEmail)}
                type="button"
              >
                {sendIcon()} Enviar prueba
              </button>
            </div>
          </div>
          <footer>
            <button
              className="votaciones-cfg-ghost"
              disabled={readonly || !selected}
              onClick={() => selected && openSchedulePicker(selected.template_key)}
              type="button"
            >
              {clockIcon()} Programar envíos
            </button>
            <button className="primary-button" disabled={readonly} onClick={onSave} type="button">
              {saveIcon()} Guardar plantillas
            </button>
          </footer>
        </section>
      </aside>
    </div>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  tone = "blue",
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
  tone?: "blue" | "green";
}) {
  return (
    <label className={`votaciones-cfg-switch is-${tone}`}>
      <input checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <i />
    </label>
  );
}

function ReqSwitch({
  checked,
  disabled,
  label,
  hint,
  onChange,
  tone = "blue",
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onChange: (value: boolean) => void;
  tone?: "blue" | "green";
}) {
  return (
    <label className="votaciones-cfg-req">
      <div>
        <strong>{label}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onChange={onChange} tone={tone} />
    </label>
  );
}

function firstCandidate(lists: ElectionList[]) {
  const candidate = lists.flatMap((lista) => lista.candidates)[0];
  return {
    full_name: candidate?.full_name || "Juan Pérez Salazar",
    position_name: candidate?.position_name || "Presidente",
    profession: candidate?.profession || "Ingeniero en Seguridad y Salud en el Trabajo",
    short_profile:
      candidate?.short_profile ||
      "Profesional comprometido con la seguridad y salud en el trabajo, con más de 10 años de experiencia en el sector.",
    photo_url: candidate?.photo_url || null,
  };
}

function templateOrder(key: string) {
  const order = ["convocatoria", "inicio_votacion", "recordatorio", "confirmacion_voto", "cierre", "publicacion_resultados"];
  const index = order.indexOf(key);
  return index < 0 ? 99 : index;
}

function interpolate(value: string, election: Election) {
  return value
    .replaceAll("{nombre}", "María López")
    .replaceAll("{titulo}", election.title)
    .replaceAll("{fecha_inicio}", formatDate(election.voting_starts_on))
    .replaceAll("{fecha_fin}", formatDate(election.voting_ends_on))
    .replaceAll("{lista}", "lista");
}

function toDatetimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const match = value.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})/);
  if (match) {
    return match[1];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (item: number) => String(item).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string) {
  if (!value) {
    return null;
  }
  return value.length === 16 ? `${value}:00` : value;
}

function formatScheduleLabel(value: string) {
  const [day, time] = value.split("T");
  if (!day || !time) {
    return value;
  }
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year} ${time}`;
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

function formatMailDate(value: string | null | undefined): string {
  const label = formatLongSpanishDate(value);
  const parts = label.split(" ");
  if (parts.length === 3) {
    return `${parts[0]} de ${parts[1]} de ${parts[2]}`;
  }
  return label;
}

function renderMailBody(value: string) {
  const content = value.trim();
  if (!content) {
    return <p>El mensaje aparecerá aquí.</p>;
  }
  if (looksLikeHtml(content)) {
    return (
      <div
        className="votaciones-cfg-mail-html"
        dangerouslySetInnerHTML={{ __html: content.replaceAll("María López", "<strong>María López</strong>") }}
      />
    );
  }
  const blocks = content.split(/\n{2,}/);
  return blocks.map((block, index) => (
    <p key={index}>
      {block.split("\n").map((line, lineIndex) => (
        <span key={`${index}-${lineIndex}`}>
          {lineIndex > 0 ? <br /> : null}
          {emphasizePreviewName(line)}
        </span>
      ))}
    </p>
  ));
}

function emphasizePreviewName(line: string) {
  const name = "María López";
  const chunks = line.split(name);
  if (chunks.length === 1) {
    return line;
  }
  return chunks.flatMap((chunk, index) =>
    index === 0
      ? [chunk]
      : [
          <strong key={`name-${index}`}>{name}</strong>,
          chunk,
        ],
  );
}

function messageHint(key: string) {
  if (key === "convocatoria") return "Se envía al publicarse la convocatoria de elecciones.";
  if (key === "inicio_votacion") return "Se envía al iniciar el periodo de votación.";
  if (key === "recordatorio") return "Se envía a miembros que aún no han emitido su voto.";
  if (key === "confirmacion_voto") return "Se envía después de que el miembro emite su voto.";
  if (key === "cierre") return "Se envía al finalizar el periodo de votación.";
  return "Se envía cuando se publican los resultados oficiales.";
}

function chevronLeft() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function chevronDown() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function gearIcon() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 00-.2-1.5l2-1.2-2-3.4-2.3.6A7 7 0 0015 5.2L14.5 3h-5L9 5.2A7 7 0 007.5 6.5L5.2 5.9l-2 3.4 2 1.2A7 7 0 005 12a7 7 0 00.2 1.5l-2 1.2 2 3.4 2.3-.6A7 7 0 009 18.8L9.5 21h5L15 18.8a7 7 0 001.5-1.3l2.3.6 2-3.4-2-1.2A7 7 0 0019 12z" />
    </svg>
  );
}

function refreshIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M20 12a8 8 0 10-2.3 5.5M20 12v-5m0 5h-5" />
    </svg>
  );
}

function saveIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M5 5h11l3 3v11H5V5z" />
      <path d="M8 5v5h8V5M8 19v-6h8v6" />
    </svg>
  );
}

function usersIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0112 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.2 19a4.8 4.8 0 015.8-4.4" />
    </svg>
  );
}

function previewFaces(lista: ElectionList) {
  const faces: Array<ElectionList["candidates"][number] | null> = lista.candidates
    .filter((candidate) => candidate.photo_url)
    .slice(0, 4);
  while (faces.length < 4) {
    faces.push(null);
  }
  return faces;
}

function tabIcon(id: ConfigPanel) {
  if (id === "cargos") return badgeIcon();
  if (id === "diseno") return paletteIcon();
  if (id === "opciones") return eyeIcon();
  if (id === "mensajes") return bellIcon();
  return fileIcon();
}

function badgeIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M8 5h8l1 4H7L8 5zM7 9l5 11 5-11" />
    </svg>
  );
}

function paletteIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <rect height="12" rx="2" width="16" x="4" y="6" />
      <path d="M8 10h8M8 14h5" />
    </svg>
  );
}

function plusIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function gripIcon() {
  return (
    <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
      <circle cx="9" cy="7" r="1.3" />
      <circle cx="15" cy="7" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="17" r="1.3" />
      <circle cx="15" cy="17" r="1.3" />
    </svg>
  );
}

function editIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
    </svg>
  );
}

function trashIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" />
    </svg>
  );
}

function shieldIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
    </svg>
  );
}

function barsIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M4 19h16M7 16V10M12 16V6M17 16v-4" />
    </svg>
  );
}

function eyeIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function userIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19a7 7 0 0114 0" />
    </svg>
  );
}

function fileIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function infoIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function brushIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M4 20l6-2 10-10-4-4L6 14l-2 6z" />
    </svg>
  );
}

function uploadIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M12 16V5M8 9l4-4 4 4M5 19h14" />
    </svg>
  );
}

function calendarIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <rect height="16" rx="2" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function desktopIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <rect height="12" rx="2" width="16" x="4" y="4" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

function mobileIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <rect height="16" rx="2" width="10" x="7" y="4" />
      <path d="M11 17h2" />
    </svg>
  );
}

function laptopIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="10" rx="1.5" width="14" x="5" y="5" />
      <path d="M3 19h18" />
    </svg>
  );
}

function buildingIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M5 20V6l7-3 7 3v14M9 20v-6h6v6" />
    </svg>
  );
}

function mixIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 8h8v8H8zM4 12h4M16 12h4" />
    </svg>
  );
}

function listIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 6h11M8 12h11M8 18h11M5 6h.01M5 12h.01M5 18h.01" />
    </svg>
  );
}

function lockIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="10" rx="2" width="14" x="5" y="11" />
      <path d="M8 11V8a4 4 0 018 0v3" />
    </svg>
  );
}

function phoneIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <rect height="16" rx="2" width="10" x="7" y="4" />
    </svg>
  );
}

function checkIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function bellIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M6 16V10a6 6 0 1112 0v6l2 2H4l2-2zM10 20h4" />
    </svg>
  );
}

function clockIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function messageIcon(key: string) {
  if (key === "convocatoria") return megaphoneIcon();
  if (key === "inicio_votacion") return calendarIcon();
  if (key === "recordatorio") return bellIcon();
  if (key === "confirmacion_voto") return checkIcon();
  if (key === "cierre") return stopIcon();
  if (key === "publicacion_resultados") return barsIcon();
  return bellIcon();
}

function megaphoneIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M4 10v4l3 1v-6L4 10zM7 9l11-4v14L7 15M19 8v8M9.5 16.5l.8 3.5h2.4" />
    </svg>
  );
}

function stopIcon() {
  return (
    <svg fill="currentColor" height="14" viewBox="0 0 24 24" width="14">
      <rect height="12" rx="2" width="12" x="6" y="6" />
    </svg>
  );
}

function sendIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M4 12l16-7-7 16-2-6-7-3z" />
    </svg>
  );
}

function messageBubbleIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M5 6h14v10H9l-4 3V6z" />
    </svg>
  );
}
