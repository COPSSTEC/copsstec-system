"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { MemberCourse } from "@/modules/courses/domain/types";
import {
  downloadMyCertificate,
  enrollCurrentMember,
  listMemberAvailableCourses,
  listMyCourses,
} from "@/modules/courses/infrastructure/courses-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";

function stateLabel(stateId: number | null): string {
  const labels: Record<number, string> = {
    4: "Visible",
    7: "Rechazado",
    8: "Por aprobar",
    9: "Inscrito",
    11: "Asistió",
    14: "Pagado",
    15: "Enviado",
  };

  return stateId ? labels[stateId] ?? `Estado ${stateId}` : "No inscrito";
}

export function MemberCoursesPage() {
  const token = useMemo(() => getStoredToken(), []);
  const [myCourses, setMyCourses] = useState<MemberCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<MemberCourse[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailCourse, setDetailCourse] = useState<MemberCourse | null>(null);

  async function loadCourses(): Promise<{ mine: MemberCourse[]; available: MemberCourse[] }> {
    if (!token) {
      return { mine: [], available: [] };
    }

    const [mine, available] = await Promise.all([
      listMyCourses(token),
      listMemberAvailableCourses(token),
    ]);
    setMyCourses(mine);
    setAvailableCourses(available);

    return { mine, available };
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadCourses();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar tus cursos.");
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrap();
  }, []);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    }
  }

  async function downloadCertificate(course: MemberCourse) {
    if (!token || course.inscription_id === null) {
      return;
    }

    if (!course.attended_at) {
      setError("El certificado estará disponible cuando administración marque tu asistencia.");
      setMessage(null);
      return;
    }

    await runAction(async () => {
      const blob = await downloadMyCertificate(token, course.inscription_id ?? 0);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${course.certificate_code ?? `curso-${course.id}-certificado`}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, "Certificado descargado correctamente.");
  }

  async function enrollFromMemberView(course: MemberCourse) {
    if (!token) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      await enrollCurrentMember(token, course.id);
      const { mine, available } = await loadCourses();
      const updated =
        mine.find((item) => item.id === course.id) ??
        available.find((item) => item.id === course.id) ??
        { ...course, inscription_id: course.inscription_id ?? 0, inscription_state_id: 9 };
      setDetailCourse(updated);
      setMessage("Inscripción confirmada sin costo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la inscripción.");
    }
  }

  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Mis cursos</h1>
          <p>Consulta tus cursos inscritos, inscríbete a nuevos cursos y descarga certificados.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button button-link" href="/cursos">
            Ver catálogo público
          </Link>
          <Link className="secondary-button button-link" href="/dashboard">
            Volver al dashboard
          </Link>
        </div>
      </section>

      {message ? <ActionAlert tone="success" title="Acción completada" message={message} /> : null}
      {error ? <ActionAlert tone="error" title="Revisa la acción" message={error} /> : null}
      {isLoading ? <p className="muted">Cargando cursos...</p> : null}

      <section className="card course-admin-panel">
        <h2>Cursos en los que estoy inscrito</h2>
        {myCourses.length === 0 && !isLoading ? (
          <p className="muted">Aún no tienes cursos inscritos.</p>
        ) : null}
        <div className="courses-grid">
          {myCourses.map((course) => (
            <article className="course-card" key={`${course.id}-${course.inscription_id}`}>
              <div className="course-card-body">
                <div className="course-meta">
                  <span>{course.finished_at ? "Finalizado" : "Activo"}</span>
                  <strong>{stateLabel(course.inscription_state_id)}</strong>
                </div>
                <h3>{course.title}</h3>
                <p className="muted">
                  {course.date_course} - {course.date_course_final} · {course.hour_init} a{" "}
                  {course.hour_final}
                </p>
                <p>Asistencia: {course.attended_at ? "Sí" : "Pendiente"}</p>
                <div className="hero-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setDetailCourse(course)}
                    type="button"
                  >
                    Ver detalle
                  </button>
                  <button
                    className="primary-button"
                    disabled={!course.attended_at}
                    onClick={() => void downloadCertificate(course)}
                    type="button"
                  >
                    Descargar certificado
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card course-admin-panel">
        <h2>Cursos disponibles para inscripción</h2>
        <div className="courses-grid">
          {availableCourses.map((course) => (
            <article className="course-card" key={course.id}>
              <div className="course-card-body">
                <div className="course-meta">
                  <span>{course.type_modality ?? "Curso"}</span>
                  <strong>{course.inscription_id ? "Ya inscrito" : "Disponible"}</strong>
                </div>
                <h3>{course.title}</h3>
                <p className="muted">
                  {course.date_course} - {course.date_course_final} · {course.location}
                </p>
                <div className="hero-actions">
                  <button
                    className="secondary-button"
                    onClick={() => setDetailCourse(course)}
                    type="button"
                  >
                    Ver detalle
                  </button>
                  <button
                    className="primary-button"
                    disabled={course.inscription_id !== null}
                    onClick={() =>
                      void enrollFromMemberView(course)
                    }
                    type="button"
                  >
                    {course.inscription_id ? "Inscrito" : "Inscribirme"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {detailCourse ? (
        <CourseDetailModal
          course={detailCourse}
          onClose={() => setDetailCourse(null)}
          onDownloadCertificate={() => void downloadCertificate(detailCourse)}
          onEnroll={() => void enrollFromMemberView(detailCourse)}
        />
      ) : null}
    </RoleGate>
  );
}

interface CourseDetailModalProps {
  course: MemberCourse;
  onClose: () => void;
  onDownloadCertificate: () => void;
  onEnroll: () => void;
}

function CourseDetailModal({
  course,
  onClose,
  onDownloadCertificate,
  onEnroll,
}: CourseDetailModalProps) {
  const isEnrolled = course.inscription_id !== null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-modal="true"
        className="confirm-dialog course-detail-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        {course.image ? (
          <div className="course-hero-image" style={{ backgroundImage: `url(${course.image})` }} />
        ) : null}

        <div className="page-heading page-heading-actions">
          <div>
            <p className="eyebrow">{course.type_modality ?? "Curso"}</p>
            <h2>{course.title}</h2>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>

        <p>{course.about}</p>
        <div className="profile-list">
          <div className="profile-item">
            <span>Fecha</span>
            <strong>
              {course.date_course} - {course.date_course_final}
            </strong>
          </div>
          <div className="profile-item">
            <span>Horario</span>
            <strong>
              {course.hour_init} a {course.hour_final}
            </strong>
          </div>
          <div className="profile-item">
            <span>Ubicación</span>
            <strong>{course.location}</strong>
          </div>
          <div className="profile-item">
            <span>Valor para miembros</span>
            <strong>Sin costo</strong>
          </div>
          <div className="profile-item">
            <span>Estado</span>
            <strong>{isEnrolled ? stateLabel(course.inscription_state_id) : "Disponible"}</strong>
          </div>
          <div className="profile-item">
            <span>Curso</span>
            <strong>{course.finished_at ? "Finalizado" : "Activo"}</strong>
          </div>
        </div>

        <h3>Capacitador</h3>
        <p>
          <strong>{course.capacitator}</strong>
        </p>
        <p className="muted">{course.capacitator_about}</p>

        <div className="hero-actions">
          <button
            className="primary-button"
            disabled={isEnrolled}
            onClick={onEnroll}
            type="button"
          >
            {isEnrolled ? "Ya inscrito" : "Inscribirme"}
          </button>
          {isEnrolled ? (
            <button
              className="secondary-button"
              disabled={!course.attended_at}
              onClick={onDownloadCertificate}
              type="button"
            >
              Descargar certificado
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}

interface ActionAlertProps {
  tone: "success" | "error";
  title: string;
  message: string;
}

function ActionAlert({ tone, title, message }: ActionAlertProps) {
  return (
    <div className={`action-alert action-alert-${tone}`} role="status">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
