"use client";

import { useState } from "react";

import { BRAND_MEDIA } from "@/config/brand-media";
import type { MemberCourse } from "@/modules/courses/domain/types";
import { CourseCover } from "@/modules/courses/presentation/components/course-cover";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import {
  canDownloadCertificate,
  canEnrollInCourse,
  courseCategoryLabel,
  courseDurationLabel,
  formatMemberDateRange,
  formatMemberTimeRange,
  isCourseActive,
  isMemberEnrolled,
  type MemberCoursePanelTab,
} from "@/modules/courses/presentation/lib/member-courses";
import { BrandImage } from "@/shared/components/brand-image";

interface MemberCoursePanelProps {
  course: MemberCourse | null;
  isBusy?: boolean;
  onClose: () => void;
  onDownloadCertificate: () => void;
  onEnroll: () => void;
  onShare: () => void;
}

const TABS: Array<{ id: MemberCoursePanelTab; label: string }> = [
  { id: "materials", label: "Materiales" },
  { id: "schedule", label: "Cronograma" },
  { id: "more", label: "Más información" },
];

export function MemberCoursePanel({
  course,
  isBusy = false,
  onClose,
  onDownloadCertificate,
  onEnroll,
  onShare,
}: MemberCoursePanelProps) {
  const [tab, setTab] = useState<MemberCoursePanelTab>("materials");

  if (!course) {
    return (
      <aside className="member-course-panel" onClick={(event) => event.stopPropagation()}>
        <div className="member-course-panel-empty">
          <CourseUiIcon name="book" />
          <h3>Selecciona un curso</h3>
          <p className="muted">Elige una tarjeta para ver el detalle, inscribirte o descargar el certificado.</p>
        </div>
      </aside>
    );
  }

  const enrolled = isMemberEnrolled(course);
  const active = isCourseActive(course);
  const certificateReady = canDownloadCertificate(course);
  const canEnroll = canEnrollInCourse(course);

  return (
    <aside className="member-course-panel" onClick={(event) => event.stopPropagation()}>
      <i aria-hidden="true" className="member-course-sheet-handle" />
      <header className="member-course-panel-head">
        <h2>Detalles del curso</h2>
        <button aria-label="Cerrar detalle" className="member-course-icon-btn" onClick={onClose} type="button">
          <CourseUiIcon name="close" />
        </button>
      </header>

      <div className="member-course-panel-cover">
        <CourseCover image={course.image} title={course.title} />
        <div className="member-course-panel-brand">
          <BrandImage
            alt="COPSSTEC"
            className="member-course-panel-logo"
            fallback={<strong>COPSSTEC</strong>}
            sources={[BRAND_MEDIA.logoLong, BRAND_MEDIA.logoLongFallback, BRAND_MEDIA.iconShort]}
          />
          <span>Seguridad que construye futuros</span>
        </div>
      </div>

      <h3>{course.title}</h3>
      <div className="member-course-panel-badges">
        <span className={`member-course-chip ${active ? "is-active" : "is-finished"}`}>
          <CourseUiIcon name="checkCircle" />
          {active ? "Activo" : "Finalizado"}
        </span>
        <span className={`member-course-chip is-status ${enrolled ? "is-enrolled" : active ? "is-available" : "is-finished"}`}>
          {enrolled ? "Inscrito" : active ? "Disponible" : "Finalizado"}
        </span>
      </div>

      {enrolled && certificateReady ? (
        <>
          <div className="member-course-note is-success">
            <CourseUiIcon name="checkCircle" />
            <div>
              <strong>Asistencia validada</strong>
              <p>Tu asistencia ha sido registrada por el administrador.</p>
            </div>
          </div>
          <div className="member-course-note is-info">
            <CourseUiIcon name="award" />
            <div>
              <strong>Tu certificado está listo</strong>
              <p>Puedes descargar tu certificado de finalización.</p>
            </div>
          </div>
        </>
      ) : null}

      {enrolled && !certificateReady ? (
        <div className="member-course-note is-pending">
          <CourseUiIcon name="clock" />
          <div>
            <strong>Asistencia pendiente</strong>
            <p>El certificado estará disponible cuando administración marque tu asistencia.</p>
          </div>
        </div>
      ) : null}

      {!enrolled && !canEnroll ? (
        <div className="member-course-note is-pending">
          <CourseUiIcon name="clock" />
          <div>
            <strong>Inscripción cerrada</strong>
            <p>Este curso ya finalizó o su horario ya pasó, por eso no admite nuevas inscripciones.</p>
          </div>
        </div>
      ) : null}

      <ul className="member-course-panel-meta">
        <li>
          <CourseUiIcon name="calendar" />
          <span>{formatMemberDateRange(course)}</span>
        </li>
        <li>
          <CourseUiIcon name="clock" />
          <span>{formatMemberTimeRange(course)}</span>
        </li>
        <li>
          <CourseUiIcon name="monitor" />
          <span>Modalidad: {course.type_modality || "Online"}</span>
        </li>
        <li>
          <CourseUiIcon name="clock" />
          <span>Duración: {courseDurationLabel(course)}</span>
        </li>
        <li>
          <CourseUiIcon name="user" />
          <span>Instructor: {course.capacitator || "Por confirmar"}</span>
        </li>
        <li>
          <CourseUiIcon name="tag" />
          <span>Categoría: {courseCategoryLabel(course)}</span>
        </li>
      </ul>

      {course.about ? (
        <div className="member-course-panel-about">
          <h4>Descripción del curso</h4>
          <p>{course.about}</p>
        </div>
      ) : null}

      <div className="member-course-panel-actions">
        {certificateReady ? (
          <button
            className="primary-button"
            disabled={isBusy}
            onClick={onDownloadCertificate}
            type="button"
          >
            <CourseUiIcon name="download" />
            Descargar certificado
          </button>
        ) : null}
        {canEnroll ? (
          <button className="primary-button" disabled={isBusy} onClick={onEnroll} type="button">
            Inscribirme
          </button>
        ) : null}
        <button
          aria-label="Compartir curso"
          className="member-course-icon-btn is-share"
          onClick={onShare}
          type="button"
        >
          <CourseUiIcon name="share" />
        </button>
      </div>

      <div className="member-course-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            aria-selected={tab === item.id}
            className={tab === item.id ? "is-active" : ""}
            key={item.id}
            onClick={() => setTab(item.id)}
            role="tab"
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="member-course-tab-panel">
        {tab === "materials" ? (
          course.link ? (
            <a className="member-course-material" href={course.link} rel="noreferrer" target="_blank">
              <CourseUiIcon name="download" />
              <span>Abrir material del curso</span>
            </a>
          ) : (
            <p className="muted">Aún no hay materiales publicados para este curso.</p>
          )
        ) : null}
        {tab === "schedule" ? (
          <ul className="member-course-facts">
            <li>
              <CourseUiIcon name="calendar" />
              <span>{formatMemberDateRange(course)}</span>
            </li>
            <li>
              <CourseUiIcon name="clock" />
              <span>{formatMemberTimeRange(course)}</span>
            </li>
            <li>
              <CourseUiIcon name="pin" />
              <span>{course.location || "Ubicación por confirmar"}</span>
            </li>
          </ul>
        ) : null}
        {tab === "more" ? (
          <>
            {course.capacitator_about ? <p>{course.capacitator_about}</p> : null}
            {course.location ? <p className="muted">Lugar: {course.location}</p> : null}
            {!course.capacitator_about && !course.location ? (
              <p className="muted">No hay información adicional.</p>
            ) : null}
          </>
        ) : null}
      </div>
    </aside>
  );
}
