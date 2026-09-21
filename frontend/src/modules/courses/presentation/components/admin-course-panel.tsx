import type { AdminCourse } from "@/modules/courses/domain/types";
import { CourseDonut } from "@/modules/courses/presentation/components/course-donut";
import { CourseStatusBadge } from "@/modules/courses/presentation/components/course-status-badge";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { attendanceRate } from "@/modules/courses/presentation/lib/course-admin";

interface AdminCoursePanelProps {
  course: AdminCourse | null;
  onOpenInscriptions: () => void;
  onOpenDetails: () => void;
  onFinish: () => void;
  onDelete: () => void;
}

export function AdminCoursePanel({
  course,
  onOpenInscriptions,
  onOpenDetails,
  onFinish,
  onDelete,
}: AdminCoursePanelProps) {
  if (!course) {
    return (
      <aside className="admin-course-panel">
        <div className="admin-course-panel-empty">
          <CourseUiIcon name="clipboard" />
          <h3>Selecciona un curso</h3>
          <p className="muted">Elige una tarjeta para ver indicadores y abrir las acciones en modales.</p>
        </div>
      </aside>
    );
  }

  const total = Math.max(course.inscriptions_count, 1);
  const rate = attendanceRate(course);

  return (
    <aside className="admin-course-panel">
      <header className="admin-course-panel-head">
        <h2>{course.title}</h2>
        <CourseStatusBadge course={course} />
      </header>

      <div className="admin-course-kpis">
        <CourseDonut label="Inscritos" tone="primary" total={total} value={course.inscriptions_count} />
        <CourseDonut label="Pagos" tone="success" total={total} value={course.paid_payments_count ?? 0} />
        <CourseDonut label="Asistentes" tone="warning" total={total} value={course.attendees_count} />
        <CourseDonut label="Certificados" tone="danger" total={total} value={course.certificates_sent_count} />
      </div>

      <div className="admin-course-rate">
        <div>
          <span>Tasa de asistencia</span>
          <strong>{rate}%</strong>
        </div>
        <div className="admin-course-rate-bar" aria-hidden="true">
          <i style={{ width: `${rate}%` }} />
        </div>
      </div>

      <nav className="admin-course-panel-actions">
        <button className="admin-course-panel-btn is-primary" onClick={onOpenInscriptions} type="button">
          <CourseUiIcon name="users" />
          Ver inscritos
        </button>
        <button className="admin-course-panel-btn" onClick={onOpenDetails} type="button">
          <CourseUiIcon name="eye" />
          Ver detalles del curso
        </button>
        <button className="admin-course-panel-btn" disabled={Boolean(course.finished_at)} onClick={onFinish} type="button">
          <CourseUiIcon name="check" />
          Finalizar curso
        </button>
        <button className="admin-course-panel-btn is-danger" onClick={onDelete} type="button">
          <CourseUiIcon name="trash" />
          Eliminar curso
        </button>
      </nav>
    </aside>
  );
}
