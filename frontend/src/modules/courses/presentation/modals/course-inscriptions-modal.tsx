"use client";

import { FormEvent, useMemo, useState } from "react";

import { BRAND_MEDIA } from "@/config/brand-media";
import type { AdminCourse, CourseInscription, MemberOption } from "@/modules/courses/domain/types";
import { CourseStatusBadge } from "@/modules/courses/presentation/components/course-status-badge";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { InscriptionActionsMenu } from "@/modules/courses/presentation/components/inscription-actions-menu";
import { MemberSearchPicker } from "@/modules/courses/presentation/components/member-search-picker";
import {
  EMPTY_INSCRIPTION_FILTERS,
  attendanceRate,
  feedbackStatus,
  feedbackStatusLabel,
  initialsFromName,
  matchesInscriptionFilters,
  matchesInscriptionQuery,
  percentOf,
  stateLabel,
  type InscriptionFilters,
} from "@/modules/courses/presentation/lib/course-admin";
import { BrandImage } from "@/shared/components/brand-image";
import { resolveMediaSrc } from "@/shared/lib/media";

interface CourseInscriptionsModalProps {
  course: AdminCourse;
  token: string;
  inscriptions: CourseInscription[];
  selectedMembers: MemberOption[];
  selectedInscriptions: number[];
  rejectionTarget: CourseInscription | null;
  rejectionObservation: string;
  onClose: () => void;
  onOpenDetails: () => void;
  onSelectedMembersChange: (members: MemberOption[]) => void;
  onSelectedInscriptionsChange: (ids: number[]) => void;
  onRegisterMembers: () => void;
  onToggleAttendance: (inscription: CourseInscription) => void;
  onGenerateCertificate: (inscription: CourseInscription) => void;
  onDownloadCertificate: (inscription: CourseInscription) => void;
  onFeedback: (inscription: CourseInscription) => void;
  onApprovePayment: (inscription: CourseInscription) => void;
  onRejectPayment: (inscription: CourseInscription) => void;
  onRejectionObservationChange: (value: string) => void;
  onRejectSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancelRejection: () => void;
  onSendCertificates: () => void;
  onSendFeedback: () => void;
  onDownloadReport: () => void;
}

const PAGE_SIZES = [5, 10, 15, 25];

export function CourseInscriptionsModal({
  course,
  token,
  inscriptions,
  selectedMembers,
  selectedInscriptions,
  rejectionTarget,
  rejectionObservation,
  onClose,
  onOpenDetails,
  onSelectedMembersChange,
  onSelectedInscriptionsChange,
  onRegisterMembers,
  onToggleAttendance,
  onGenerateCertificate,
  onDownloadCertificate,
  onFeedback,
  onApprovePayment,
  onRejectPayment,
  onRejectionObservationChange,
  onRejectSubmit,
  onCancelRejection,
  onSendCertificates,
  onSendFeedback,
  onDownloadReport,
}: CourseInscriptionsModalProps) {
  const [query, setQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<InscriptionFilters>(EMPTY_INSCRIPTION_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const inscribedUserIds = useMemo(
    () => inscriptions.map((item) => item.user_id).filter((id): id is number => id !== null),
    [inscriptions],
  );

  const attendees = inscriptions.filter((item) => item.attended_at).length;
  const pending = inscriptions.filter((item) => !item.attended_at).length;
  const withoutCertificate = inscriptions.filter((item) => !item.certificate_id).length;
  const total = inscriptions.length;

  const filtered = useMemo(
    () =>
      inscriptions.filter(
        (item) => matchesInscriptionQuery(item, query) && matchesInscriptionFilters(item, filters),
      ),
    [filters, inscriptions, query],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const visibleIds = pageRows.map((item) => item.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedInscriptions.includes(id));

  const stateOptions = uniqueOptions(inscriptions.map((item) => item.state_id));
  const paymentOptions = uniqueOptions(inscriptions.map((item) => item.payment_state_id));
  const coverSrc = resolveMediaSrc(course.image);

  function updateFilter(key: keyof InscriptionFilters, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function toggleAllVisible() {
    if (allVisibleSelected) {
      onSelectedInscriptionsChange(selectedInscriptions.filter((id) => !visibleIds.includes(id)));
      return;
    }

    onSelectedInscriptionsChange([...new Set([...selectedInscriptions, ...visibleIds])]);
  }

  function toggleOne(id: number, checked: boolean) {
    onSelectedInscriptionsChange(
      checked ? [...selectedInscriptions, id] : selectedInscriptions.filter((item) => item !== id),
    );
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="confirm-dialog inscriptions-dialog">
        <header className="course-modal-head">
          <div className="course-modal-title">
            <span className="course-modal-icon">
              <CourseUiIcon name="users" />
            </span>
            <div>
              <h2>Inscritos — {course.title}</h2>
              <p className="muted">Gestiona registro, asistencia, pago y certificados de los participantes.</p>
            </div>
          </div>
          <button aria-label="Cerrar" className="icon-ghost-button" onClick={onClose} type="button">
            <CourseUiIcon name="close" />
          </button>
        </header>

        <div className="inscriptions-kpis">
          <article>
            <CourseUiIcon name="users" />
            <div>
              <strong>{total}</strong>
              <span>Total inscritos</span>
            </div>
          </article>
          <article>
            <CourseUiIcon name="user" />
            <div>
              <strong>{attendees}</strong>
              <span>Asistentes</span>
              <em>{percentOf(attendees, total)}%</em>
            </div>
          </article>
          <article>
            <CourseUiIcon name="clock" />
            <div>
              <strong>{pending}</strong>
              <span>Pendientes</span>
              <em>{percentOf(pending, total)}%</em>
            </div>
          </article>
          <article>
            <CourseUiIcon name="certificate" />
            <div>
              <strong>{withoutCertificate}</strong>
              <span>Sin certificado</span>
              <em>{percentOf(withoutCertificate, total)}%</em>
            </div>
          </article>
        </div>

        <div className="inscriptions-workspace">
          <div className="inscriptions-main">
            <div className="inscriptions-toolbar">
              <label className="member-search-control inscriptions-search">
                <CourseUiIcon name="search" />
                <input
                  onChange={(event) => {
                    setPage(1);
                    setQuery(event.target.value);
                  }}
                  placeholder="Buscar por nombre, apellido, cédula o correo"
                  type="search"
                  value={query}
                />
              </label>
              <button
                className={`secondary-button${filtersOpen ? " is-active-filter" : ""}`}
                onClick={() => setFiltersOpen((open) => !open)}
                type="button"
              >
                <CourseUiIcon name="filter" />
                Filtros
              </button>
              <button className="secondary-button" onClick={onDownloadReport} type="button">
                <CourseUiIcon name="download" />
                Exportar
              </button>
              <button
                className="primary-button"
                disabled={selectedMembers.length === 0}
                onClick={onRegisterMembers}
                type="button"
              >
                <CourseUiIcon name="userPlus" />
                Registrar seleccionados
              </button>
            </div>

            <MemberSearchPicker
              inscribedUserIds={inscribedUserIds}
              onChange={onSelectedMembersChange}
              selected={selectedMembers}
              token={token}
            />

            {filtersOpen ? (
              <div className="inscriptions-filters">
                <label className="field">
                  Estado
                  <select onChange={(event) => updateFilter("state", event.target.value)} value={filters.state}>
                    <option value="">Todos ({total})</option>
                    {stateOptions.map((value) => (
                      <option key={value} value={value}>
                        {stateLabel(Number(value))}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Asistencia
                  <select onChange={(event) => updateFilter("attendance", event.target.value)} value={filters.attendance}>
                    <option value="">Todos ({total})</option>
                    <option value="yes">Sí ({attendees})</option>
                    <option value="no">No ({pending})</option>
                  </select>
                </label>
                <label className="field">
                  Pago
                  <select onChange={(event) => updateFilter("payment", event.target.value)} value={filters.payment}>
                    <option value="">Todos ({total})</option>
                    {paymentOptions.filter(Boolean).map((value) => (
                      <option key={value} value={value}>
                        {stateLabel(Number(value))}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Certificado
                  <select onChange={(event) => updateFilter("certificate", event.target.value)} value={filters.certificate}>
                    <option value="">Todos ({total})</option>
                    <option value="yes">Con certificado</option>
                    <option value="no">Pendiente</option>
                  </select>
                </label>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setFilters(EMPTY_INSCRIPTION_FILTERS);
                    setPage(1);
                  }}
                  type="button"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : null}

            <div className="table-scroll inscriptions-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        aria-label="Seleccionar visibles"
                        checked={allVisibleSelected}
                        onChange={toggleAllVisible}
                        type="checkbox"
                      />
                    </th>
                    <th>Participante</th>
                    <th>Cédula</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Pago</th>
                    <th>Asistencia</th>
                    <th>Certificado</th>
                    <th>Encuesta</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td className="muted" colSpan={10}>
                        No hay inscritos que coincidan con el filtro.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((inscription) => {
                      const survey = feedbackStatus(inscription);
                      return (
                        <tr key={inscription.id}>
                          <td>
                            <input
                              checked={selectedInscriptions.includes(inscription.id)}
                              onChange={(event) => toggleOne(inscription.id, event.target.checked)}
                              type="checkbox"
                            />
                          </td>
                          <td>
                            <div className="inscription-person">
                              <span className="inscription-avatar">{initialsFromName(inscription.names)}</span>
                              <div>
                                <strong>{inscription.names}</strong>
                                <span className="muted table-subtitle">{inscription.email}</span>
                              </div>
                            </div>
                          </td>
                          <td>{inscription.identifier}</td>
                          <td>{inscription.participant_type === "member" ? "Miembro" : "Invitado"}</td>
                          <td>
                            <span className={`status-badge ${paymentBadgeClass(inscription.state_id)}`}>
                              {stateLabel(inscription.state_id)}
                            </span>
                          </td>
                          <td>
                            <span className={`status-badge ${paymentBadgeClass(inscription.payment_state_id)}`}>
                              {stateLabel(inscription.payment_state_id)}
                            </span>
                          </td>
                          <td>
                            <span className={`inscription-flag ${inscription.attended_at ? "is-yes" : "is-no"}`}>
                              <CourseUiIcon name={inscription.attended_at ? "check" : "xCircle"} />
                              {inscription.attended_at ? "Sí" : "No"}
                            </span>
                          </td>
                          <td>
                            {inscription.certificate_id ? (
                              <button
                                className="secondary-button"
                                onClick={() => onDownloadCertificate(inscription)}
                                type="button"
                              >
                                {inscription.certificate_code}
                              </button>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td>
                            <span className={`status-badge status-badge-${surveyBadge(survey)}`}>
                              {feedbackStatusLabel(inscription)}
                            </span>
                          </td>
                          <td>
                            <InscriptionActionsMenu
                              inscription={inscription}
                              onApprovePayment={onApprovePayment}
                              onDownloadCertificate={onDownloadCertificate}
                              onFeedback={onFeedback}
                              onGenerateCertificate={onGenerateCertificate}
                              onRejectPayment={onRejectPayment}
                              onToggleAttendance={onToggleAttendance}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <footer className="inscriptions-pagination">
              <span className="muted">
                {filtered.length === 0
                  ? "0 registros"
                  : `Mostrando ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} de ${filtered.length} registros`}
              </span>
              <div className="pagination-controls">
                <button
                  className="secondary-button"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  type="button"
                >
                  ‹
                </button>
                <span>{currentPage}</span>
                <button
                  className="secondary-button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  type="button"
                >
                  ›
                </button>
                <select
                  onChange={(event) => {
                    setPage(1);
                    setPageSize(Number(event.target.value));
                  }}
                  value={pageSize}
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} por página
                    </option>
                  ))}
                </select>
              </div>
            </footer>
          </div>

          <aside className="inscriptions-course-card">
            <p className="muted">Curso seleccionado</p>
            <div className="inscriptions-course-cover">
              {coverSrc ? (
                <img alt="" src={coverSrc} />
              ) : (
                <BrandImage
                  alt="COPSSTEC"
                  className="course-form-preview-logo"
                  fallback={<span className="course-form-preview-fallback">CS</span>}
                  sources={[BRAND_MEDIA.logoLong, BRAND_MEDIA.iconShort]}
                />
              )}
              <CourseStatusBadge course={course} />
            </div>
            <h3>{course.title}</h3>
            <ul className="inscriptions-course-stats">
              <li>
                <CourseUiIcon name="users" />
                {course.inscriptions_count} inscritos
              </li>
              <li>
                <CourseUiIcon name="dollar" />
                {course.paid_payments_count ?? 0} pagos
              </li>
              <li>
                <CourseUiIcon name="user" />
                {course.attendees_count} asistentes
              </li>
              <li>
                <CourseUiIcon name="certificate" />
                {course.certificates_sent_count} certificados
              </li>
            </ul>
            <div className="admin-course-rate">
              <div>
                <span>Tasa de asistencia</span>
                <strong>{attendanceRate(course)}%</strong>
              </div>
              <div className="admin-course-rate-bar" aria-hidden="true">
                <i style={{ width: `${attendanceRate(course)}%` }} />
              </div>
            </div>
            <ul className="course-form-preview-meta">
              <li>
                <CourseUiIcon name="user" />
                <span>{course.capacitator || "Capacitador por confirmar"}</span>
              </li>
              <li>
                <CourseUiIcon name="monitor" />
                <span>{course.type_modality || "Modalidad por confirmar"}</span>
              </li>
              <li>
                <CourseUiIcon name="calendar" />
                <span>
                  {course.date_course}
                  {course.date_course_final && course.date_course_final !== course.date_course
                    ? ` – ${course.date_course_final}`
                    : ""}
                </span>
              </li>
              <li>
                <CourseUiIcon name="clock" />
                <span>
                  {course.hour_init} – {course.hour_final}
                </span>
              </li>
              <li>
                <CourseUiIcon name="pin" />
                <span>{course.location}</span>
              </li>
            </ul>
            <p className="muted">{course.about}</p>
            <button className="admin-course-panel-btn" onClick={onOpenDetails} type="button">
              Ver detalles
              <CourseUiIcon name="arrow" />
            </button>
          </aside>
        </div>

        <footer className="inscriptions-footer">
          <button
            className="primary-button"
            disabled={selectedInscriptions.length === 0}
            onClick={onSendCertificates}
            type="button"
          >
            Enviar certificados seleccionados
          </button>
          <button
            className="secondary-button"
            disabled={selectedInscriptions.length === 0}
            onClick={onSendFeedback}
            type="button"
          >
            Enviar encuestas seleccionadas
          </button>
          <button className="secondary-button" onClick={onDownloadReport} type="button">
            Descargar informe
          </button>
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </footer>
      </section>

      {rejectionTarget ? (
        <div className="modal-backdrop rejection-overlay">
          <form className="confirm-dialog" onSubmit={onRejectSubmit}>
            <h2>Rechazar pago</h2>
            <p className="muted">Ingresa la observación que recibirá {rejectionTarget.names}.</p>
            <div className="field">
              <label htmlFor="rejection-observation">Observación</label>
              <textarea
                id="rejection-observation"
                onChange={(event) => onRejectionObservationChange(event.target.value)}
                required
                rows={4}
                value={rejectionObservation}
              />
            </div>
            <div className="hero-actions">
              <button className="primary-button" type="submit">
                Confirmar rechazo
              </button>
              <button className="secondary-button" onClick={onCancelRejection} type="button">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function uniqueOptions(values: Array<number | null>): string[] {
  return [...new Set(values.map((value) => (value == null ? "" : String(value))))];
}

function paymentBadgeClass(stateId: number | null): string {
  if (stateId === 14 || stateId === 11) {
    return "status-badge-success";
  }

  if (stateId === 7) {
    return "status-badge-danger";
  }

  if (stateId === 8) {
    return "status-badge-warning";
  }

  return "status-badge-muted";
}

function surveyBadge(status: "pending" | "sent" | "answered"): string {
  if (status === "answered") {
    return "success";
  }

  if (status === "sent") {
    return "info";
  }

  return "muted";
}
