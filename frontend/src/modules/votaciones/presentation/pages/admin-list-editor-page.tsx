"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";
import {
  ELECTION_STATUS_LABELS,
  LIST_STATUS_LABELS,
  calendarEventDate,
  formatCronogramaDate,
  formatLongSpanishDate,
  formatMonthYear,
  mediaUrl,
  parseWorkPlanItems,
  serializeWorkPlanItems,
  type Election,
  type ElectionCandidate,
  type ElectionList,
  type ListStatus,
  type WorkPlanItem,
} from "@/modules/votaciones/domain/types";
import {
  deleteCandidate,
  deleteList,
  getAdminElection,
  getAdminList,
  saveCandidate,
  updateList,
  uploadCandidatePhoto,
  uploadListFile,
} from "@/modules/votaciones/infrastructure/elections-api";
import { ListMemberPreview } from "@/modules/votaciones/presentation/components/list-member-preview";

const DESCRIPTION_MAX = 500;
const LIST_STATUS_HELP: Record<ListStatus, string> = {
  borrador: "Visible solo para administradores",
  activa: "Visible para miembros durante el periodo de votación",
  suspendida: "No visible temporalmente",
  retirada: "No participa en la elección",
};

interface CandidateDraft {
  position_id: number;
  full_name: string;
  profession: string;
  short_profile: string;
  photo?: File | null;
}

const EMPTY_DRAFT: CandidateDraft = {
  position_id: 0,
  full_name: "",
  profession: "",
  short_profile: "",
  photo: null,
};

export function AdminListEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listId = Number(params.id);
  const previewRef = useRef<HTMLDivElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const planInputRef = useRef<HTMLInputElement>(null);
  const backingInputRef = useRef<HTMLInputElement>(null);
  const [election, setElection] = useState<Election | null>(null);
  const [lista, setLista] = useState<ElectionList | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [planItems, setPlanItems] = useState<WorkPlanItem[]>([]);
  const [editingCandidate, setEditingCandidate] = useState<ElectionCandidate | null>(null);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [draftCandidate, setDraftCandidate] = useState<CandidateDraft>(EMPTY_DRAFT);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void Promise.all([getAdminElection(token), getAdminList(token, listId)])
      .then(([current, item]) => {
        setElection(current);
        setLista(item);
        setPlanItems(parseWorkPlanItems(item.work_plan_summary));
        const first = current.positions.find((position) => position.is_active);
        if (first) {
          setDraftCandidate((value) => ({ ...value, position_id: first.id }));
        }
      })
      .catch((err: Error) => setError(err.message));
  }, [listId]);

  const token = getStoredToken() || "";
  const readonly = Boolean(election?.is_readonly);
  const descriptionCount = lista?.description.length ?? 0;
  const activePositions = useMemo(
    () => (election ? election.positions.filter((position) => position.is_active) : []),
    [election],
  );

  async function run(action: () => Promise<void>, success: string) {
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await action();
      setNotice(success);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function persistList(patch: Partial<ElectionList> = {}) {
    if (!lista || !election) return;
    const updated = await updateList(
      token,
      lista.id,
      {
        name: lista.name,
        slogan: lista.slogan,
        color: lista.color,
        description: lista.description,
        work_plan_summary: serializeWorkPlanItems(planItems),
        status: lista.status,
        ...patch,
      },
      election.id,
    );
    setLista({ ...updated, candidates: updated.candidates.length ? updated.candidates : lista.candidates });
    setPlanItems(parseWorkPlanItems(updated.work_plan_summary));
  }

  async function persistCandidate(draft: CandidateDraft, candidateId?: number) {
    if (!lista || !election) return;
    const updated = await saveCandidate(
      token,
      lista.id,
      {
        position_id: draft.position_id,
        full_name: draft.full_name.trim(),
        profession: draft.profession.trim(),
        short_profile: draft.short_profile.trim(),
      },
      candidateId,
      election.id,
    );
    let next = updated;
    const target = candidateId
      ? updated.candidates.find((item) => item.id === candidateId)
      : updated.candidates.find(
          (item) => item.full_name === draft.full_name.trim() && item.position_id === draft.position_id,
        ) ?? updated.candidates[updated.candidates.length - 1];
    if (draft.photo && target) {
      await uploadCandidatePhoto(token, lista.id, target.id, draft.photo, election.id);
      next = await getAdminList(token, lista.id);
    }
    setLista((current) => (current ? keepLocalDraft(current, next) : next));
  }

  if (!lista || !election) {
    return (
      <RoleGate requiredAccess="admin">
        <p className="muted">Cargando lista...</p>
      </RoleGate>
    );
  }

  const voting = election.calendar.find((item) => item.event_key === "votacion");
  const termStart = election.calendar.find((item) => item.event_key === "inicio_gestion");
  const termEnd = election.calendar.find((item) => item.event_key === "fin_gestion");
  const termStartDate = termStart ? calendarEventDate(termStart).start : election.term_starts_on;
  const termEndDate = termEnd ? calendarEventDate(termEnd).start : election.term_ends_on;
  const votingStart = voting?.starts_on || election.voting_starts_on;
  const votingEnd = voting?.ends_on || election.voting_ends_on;

  return (
    <RoleGate requiredAccess="admin">
      <section className="votaciones-editor">
        {error ? (
          <div className="action-alert action-alert-error">
            <span>{error}</span>
          </div>
        ) : null}
        {notice ? (
          <div className="action-alert action-alert-success">
            <span>{notice}</span>
          </div>
        ) : null}

        <div className="votaciones-editor-kpis">
          <article>
            <span className="votaciones-cal-kpi-icon" aria-hidden="true">
              {kpiIcon("calendar")}
            </span>
            <div>
              <strong>Elecciones en {formatMonthYear(votingStart)}</strong>
              <p>Periodo de votación: {formatCronogramaDate(votingStart, votingEnd)}</p>
            </div>
          </article>
          <article>
            <span className="votaciones-cal-kpi-icon" aria-hidden="true">
              {kpiIcon("users")}
            </span>
            <div>
              <strong>Periodo de gestión de la Directiva</strong>
              <p>
                {formatLongSpanishDate(termStartDate)} - {formatLongSpanishDate(termEndDate)}
              </p>
            </div>
          </article>
          <article className="is-status">
            <span className={`votaciones-status is-${election.status}`}>{ELECTION_STATUS_LABELS[election.status]}</span>
          </article>
        </div>

        <header className="votaciones-editor-toolbar">
          <div>
            <Link className="votaciones-back" href="/admin/votaciones/listas">
              ← Volver
            </Link>
            <h1>Editar Lista de Candidatos</h1>
          </div>
          <label className="votaciones-switch-toggle">
            <span>Activa</span>
            <input
              checked={lista.status === "activa"}
              disabled={readonly || saving}
              onChange={(event) => {
                const status: ListStatus = event.target.checked ? "activa" : "borrador";
                setLista({ ...lista, status });
                void run(async () => {
                  await persistList({ status });
                }, "Estado actualizado.");
              }}
              type="checkbox"
            />
            <i />
          </label>
        </header>

        <div className="votaciones-editor-grid">
          <div className="votaciones-editor-main">

            <section className="votaciones-editor-card">
              <h2>Información general de la lista</h2>
              <div className="votaciones-info-grid">
                <label className="field">
                  Nombre de la lista *
                  <input
                    disabled={readonly}
                    onChange={(event) => setLista({ ...lista, name: event.target.value })}
                    value={lista.name}
                  />
                </label>
                <label className="field">
                  Lema / Slogan
                  <input
                    disabled={readonly}
                    onChange={(event) => setLista({ ...lista, slogan: event.target.value })}
                    value={lista.slogan}
                  />
                </label>
                <label className="field">
                  Color de la lista
                  <span className="votaciones-color-field">
                    <input
                      disabled={readonly}
                      onChange={(event) => setLista({ ...lista, color: event.target.value })}
                      type="color"
                      value={lista.color || "#0D47A1"}
                    />
                    <em>{(lista.color || "#0D47A1").toUpperCase()}</em>
                  </span>
                </label>
                {election.list_logo_enabled ? (
                  <div className="field">
                    <span>Logo de la lista</span>
                    <div className="votaciones-logo-field">
                      <div className="votaciones-logo-preview" style={{ borderColor: lista.color || "#dbeafe" }}>
                        {lista.logo_url ? (
                          <img alt="Logo de la lista" src={mediaUrl(lista.logo_url)} />
                        ) : (
                          <span aria-hidden="true">{logoPlaceholder()}</span>
                        )}
                      </div>
                      <button
                        className="secondary-button"
                        disabled={readonly || saving}
                        onClick={() => logoInputRef.current?.click()}
                        type="button"
                      >
                        Cambiar
                      </button>
                      <input
                        accept="image/png,image/jpeg,image/webp"
                        hidden
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          void run(async () => {
                            const url = await uploadListFile(token, lista.id, "logo", file, election.id);
                            setLista({ ...lista, logo_url: url });
                          }, "Logo cargado.");
                          event.target.value = "";
                        }}
                        ref={logoInputRef}
                        type="file"
                      />
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="field">
                Descripción de la lista
                <textarea
                  disabled={readonly}
                  maxLength={DESCRIPTION_MAX}
                  onChange={(event) => setLista({ ...lista, description: event.target.value })}
                  rows={3}
                  value={lista.description}
                />
                <small className="votaciones-char-count">
                  {descriptionCount}/{DESCRIPTION_MAX}
                </small>
              </label>

              <div className="votaciones-plan-editor">
                <div className="page-heading-actions">
                  <div>
                    <h3>Plan de trabajo</h3>
                    <p className="muted">El PDF se guarda con la lista y los ejes aparecen en la vista previa de los miembros.</p>
                  </div>
                  <button
                    className="secondary-button"
                    disabled={readonly || saving}
                    onClick={() => planInputRef.current?.click()}
                    type="button"
                  >
                    {lista.work_plan_url ? "Reemplazar PDF" : "Subir PDF"}
                  </button>
                  <input
                    accept="application/pdf"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void run(async () => {
                        const url = await uploadListFile(token, lista.id, "work-plan", file, election.id);
                        setLista({ ...lista, work_plan_url: url });
                      }, "Plan de trabajo cargado.");
                      event.target.value = "";
                    }}
                    ref={planInputRef}
                    type="file"
                  />
                </div>
                {lista.work_plan_url ? (
                  <div className="votaciones-plan-preview">
                    <iframe
                      className="votaciones-pdf is-editor"
                      src={mediaUrl(lista.work_plan_url)}
                      title="Vista previa del plan de trabajo"
                    />
                    <a className="votaciones-plan-pdf-link" href={mediaUrl(lista.work_plan_url)} rel="noreferrer" target="_blank">
                      Abrir PDF en una pestaña
                    </a>
                  </div>
                ) : (
                  <p className="muted">Aún no hay un PDF de plan de trabajo.</p>
                )}
                <ol className="votaciones-plan-form">
                  {planItems.map((item, index) => (
                    <li key={`plan-${index}`}>
                      <input
                        disabled={readonly}
                        onChange={(event) => {
                          const next = [...planItems];
                          next[index] = { ...item, title: event.target.value };
                          setPlanItems(next);
                        }}
                        placeholder={`Eje ${index + 1}`}
                        value={item.title}
                      />
                      <textarea
                        disabled={readonly}
                        onChange={(event) => {
                          const next = [...planItems];
                          next[index] = { ...item, body: event.target.value };
                          setPlanItems(next);
                        }}
                        placeholder="Descripción breve"
                        rows={2}
                        value={item.body}
                      />
                      <button
                        className="icon-button-danger"
                        disabled={readonly}
                        onClick={() => setPlanItems(planItems.filter((_, itemIndex) => itemIndex !== index))}
                        type="button"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ol>
                <button
                  className="secondary-button"
                  disabled={readonly}
                  onClick={() => setPlanItems([...planItems, { title: "", body: "" }])}
                  type="button"
                >
                  + Agregar eje del plan
                </button>
              </div>

              {election.backing_document_required ? (
                <div className="field">
                  <span>Documento de respaldo</span>
                  <button
                    className="secondary-button"
                    disabled={readonly || saving}
                    onClick={() => backingInputRef.current?.click()}
                    type="button"
                  >
                    {lista.backing_document_url ? "Reemplazar documento" : "Subir documento"}
                  </button>
                  <input
                    accept="application/pdf"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      void run(async () => {
                        const url = await uploadListFile(token, lista.id, "backing-document", file, election.id);
                        setLista({ ...lista, backing_document_url: url });
                      }, "Documento cargado.");
                      event.target.value = "";
                    }}
                    ref={backingInputRef}
                    type="file"
                  />
                </div>
              ) : null}
            </section>

            <section className="votaciones-editor-card">
              <div className="page-heading-actions">
                <h2>Candidatos de la lista</h2>
                <button
                  className="primary-button"
                  disabled={readonly || saving || activePositions.length === 0}
                  onClick={() => {
                    setEditingCandidate(null);
                    setDraftCandidate({
                      ...EMPTY_DRAFT,
                      position_id: activePositions[0]?.id ?? 0,
                    });
                    setShowCandidateForm(true);
                  }}
                  type="button"
                >
                  + Agregar candidato
                </button>
              </div>
              <div className="votaciones-table-wrap">
                <table className="votaciones-table votaciones-candidates-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Cargo</th>
                      <th>Foto</th>
                      <th>Nombre completo</th>
                      <th>Profesión</th>
                      <th>Breve perfil</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.candidates.map((candidate) => (
                      <tr key={candidate.id}>
                        <td className="votaciones-drag-cell" aria-hidden="true">
                          {dragIcon()}
                        </td>
                        <td>
                          <span className="votaciones-cargo-pill">{candidate.position_name}</span>
                        </td>
                        <td>
                          <label className="votaciones-photo-cell">
                            {candidate.photo_url ? (
                              <img alt={candidate.full_name} src={mediaUrl(candidate.photo_url)} />
                            ) : (
                              <span>{candidate.full_name.slice(0, 1) || "+"}</span>
                            )}
                            <input
                              accept="image/png,image/jpeg,image/webp"
                              disabled={readonly}
                              hidden
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (!file) return;
                                void run(async () => {
                                  await uploadCandidatePhoto(token, lista.id, candidate.id, file, election.id);
                                  const remote = await getAdminList(token, lista.id);
                                  setLista((current) => (current ? keepLocalDraft(current, remote) : remote));
                                }, "Foto actualizada.");
                                event.target.value = "";
                              }}
                              type="file"
                            />
                          </label>
                        </td>
                        <td>{candidate.full_name}</td>
                        <td>{candidate.profession || "—"}</td>
                        <td>{candidate.short_profile || "—"}</td>
                        <td>
                          <div className="votaciones-row-actions">
                            <button
                              className="votaciones-icon-btn"
                              disabled={readonly}
                              onClick={() => {
                                setEditingCandidate(candidate);
                                setDraftCandidate({
                                  position_id: candidate.position_id,
                                  full_name: candidate.full_name,
                                  profession: candidate.profession,
                                  short_profile: candidate.short_profile,
                                  photo: null,
                                });
                                setShowCandidateForm(true);
                              }}
                              type="button"
                            >
                              {editIcon()}
                            </button>
                            <button
                              className="votaciones-icon-btn is-danger"
                              disabled={readonly}
                              onClick={() =>
                                void run(async () => {
                                  await deleteCandidate(token, lista.id, candidate.id, election.id);
                                  const remote = await getAdminList(token, lista.id);
                                  setLista((current) => (current ? keepLocalDraft(current, remote) : remote));
                                }, "Candidato eliminado.")
                              }
                              type="button"
                            >
                              {trashIcon()}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {lista.candidates.length === 0 ? (
                      <tr>
                        <td colSpan={7}>Todavía no hay candidatos. Pulsa Agregar candidato para cargar el primero.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="votaciones-editor-footer">
              <section className="votaciones-editor-card">
                <h2>Estado de la lista</h2>
                <div className="votaciones-status-choices">
                  {(Object.keys(LIST_STATUS_LABELS) as ListStatus[]).map((status) => (
                    <label key={status}>
                      <input
                        checked={lista.status === status}
                        disabled={readonly}
                        name="list-status"
                        onChange={() => setLista({ ...lista, status })}
                        type="radio"
                      />
                      <span>
                        <strong>{LIST_STATUS_LABELS[status]}</strong>
                        <small>{LIST_STATUS_HELP[status]}</small>
                      </span>
                    </label>
                  ))}
                </div>
              </section>
              <section className="votaciones-editor-card">
                <h2>Acciones</h2>
                <div className="votaciones-editor-actions">
                  <button
                    className="secondary-button"
                    onClick={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    type="button"
                  >
                    Vista previa
                  </button>
                  <button
                    className="primary-button"
                    disabled={readonly || saving}
                    onClick={() =>
                      void run(async () => {
                        await persistList();
                      }, "Lista guardada.")
                    }
                    type="button"
                  >
                    Guardar cambios
                  </button>
                  <button
                    className="danger-button"
                    disabled={readonly || saving}
                    onClick={() => {
                      if (!window.confirm("¿Eliminar esta lista y sus candidatos?")) return;
                      void run(async () => {
                        await deleteList(token, lista.id, election.id);
                        router.push("/admin/votaciones/listas");
                      }, "Lista eliminada.");
                    }}
                    type="button"
                  >
                    Eliminar lista
                  </button>
                </div>
              </section>
            </div>
          </div>

          <div ref={previewRef}>
            <ListMemberPreview
              election={election}
              listNumber={lista.sort_order || 1}
              lista={{ ...lista, work_plan_summary: serializeWorkPlanItems(planItems) }}
            />
          </div>
        </div>

        {showCandidateForm ? (
          <div className="votaciones-modal">
            <article className="votaciones-candidate-modal">
              <h3>{editingCandidate ? "Editar candidato" : "Agregar candidato"}</h3>
              <label className="field">
                Cargo
                <select
                  onChange={(event) => setDraftCandidate({ ...draftCandidate, position_id: Number(event.target.value) })}
                  value={draftCandidate.position_id}
                >
                  {activePositions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Nombre completo
                <input
                  onChange={(event) => setDraftCandidate({ ...draftCandidate, full_name: event.target.value })}
                  value={draftCandidate.full_name}
                />
              </label>
              <label className="field">
                Profesión
                <input
                  onChange={(event) => setDraftCandidate({ ...draftCandidate, profession: event.target.value })}
                  value={draftCandidate.profession}
                />
              </label>
              <label className="field">
                Breve perfil
                <textarea
                  onChange={(event) => setDraftCandidate({ ...draftCandidate, short_profile: event.target.value })}
                  rows={3}
                  value={draftCandidate.short_profile}
                />
              </label>
              <label className="field">
                Foto
                <input
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setDraftCandidate({ ...draftCandidate, photo: event.target.files?.[0] ?? null })}
                  type="file"
                />
              </label>
              <div className="votaciones-inline-form">
                <button
                  className="primary-button"
                  disabled={saving || !draftCandidate.full_name.trim()}
                  onClick={() =>
                    void run(async () => {
                      await persistCandidate(draftCandidate, editingCandidate?.id);
                      setShowCandidateForm(false);
                      setEditingCandidate(null);
                      setDraftCandidate({
                        ...EMPTY_DRAFT,
                        position_id: activePositions[0]?.id ?? 0,
                      });
                    }, editingCandidate ? "Candidato actualizado." : "Candidato agregado.")
                  }
                  type="button"
                >
                  {editingCandidate ? "Guardar candidato" : "Agregar candidato"}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setShowCandidateForm(false);
                    setEditingCandidate(null);
                  }}
                  type="button"
                >
                  Cancelar
                </button>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </RoleGate>
  );
}

function keepLocalDraft(current: ElectionList, remote: ElectionList): ElectionList {
  return {
    ...remote,
    name: current.name,
    slogan: current.slogan,
    color: current.color,
    description: current.description,
    status: current.status,
    logo_url: current.logo_url || remote.logo_url,
    work_plan_url: current.work_plan_url || remote.work_plan_url,
    backing_document_url: current.backing_document_url || remote.backing_document_url,
  };
}

function kpiIcon(name: "calendar" | "users") {
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

function logoPlaceholder() {
  return (
    <svg fill="none" height="28" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" width="28">
      <path d="M3 10l9-5 9 5-9 5-9-5z" />
      <path d="M7 12.5V17c0 .8 2.2 2.5 5 2.5s5-1.7 5-2.5v-4.5" />
    </svg>
  );
}

function dragIcon() {
  return (
    <svg fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
      <circle cx="9" cy="7" r="1.5" />
      <circle cx="15" cy="7" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="17" r="1.5" />
      <circle cx="15" cy="17" r="1.5" />
    </svg>
  );
}

function editIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}

function trashIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M5 7h14M10 7V5h4v2M8 7l1 12h6l1-12" />
    </svg>
  );
}
