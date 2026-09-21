"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { AdminCourse, CourseFormInput, CourseInscription, MemberOption } from "@/modules/courses/domain/types";
import {
  approvePayment,
  createCourse,
  createMemberInscriptions,
  deleteCourse,
  downloadAttendeesReport,
  downloadCertificate,
  finishCourse,
  generateCertificate,
  generateFeedbackLink,
  listAdminCourses,
  listCourseInscriptions,
  rejectPayment,
  sendCertificates,
  sendFeedbackLinks,
  updateAttendance,
  updateCourse,
} from "@/modules/courses/infrastructure/courses-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { AdminCourseCard } from "@/modules/courses/presentation/components/admin-course-card";
import { AdminCoursePanel } from "@/modules/courses/presentation/components/admin-course-panel";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { ConfirmCourseModal } from "@/modules/courses/presentation/modals/confirm-course-modal";
import { CourseFormModal } from "@/modules/courses/presentation/modals/course-form-modal";
import { CourseInscriptionsModal } from "@/modules/courses/presentation/modals/course-inscriptions-modal";
import {
  EMPTY_COURSE,
  courseToForm,
  matchesCourseQuery,
  normalizeCourseForm,
} from "@/modules/courses/presentation/lib/course-admin";
import { RoleGate } from "@/shared/components/role-gate";
import { useToast } from "@/shared/hooks/use-toast";

type ConfirmKind = "finish" | "delete";

export function AdminCoursesPage() {
  const toast = useToast();
  const token = useMemo(() => getStoredToken(), []);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<CourseFormInput>(EMPTY_COURSE);
  const [inscriptionsOpen, setInscriptionsOpen] = useState(false);
  const [inscriptions, setInscriptions] = useState<CourseInscription[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberOption[]>([]);
  const [selectedInscriptions, setSelectedInscriptions] = useState<number[]>([]);
  const [rejectionTarget, setRejectionTarget] = useState<CourseInscription | null>(null);
  const [rejectionObservation, setRejectionObservation] = useState("");
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; course: AdminCourse } | null>(null);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const visibleCourses = useMemo(
    () => courses.filter((course) => matchesCourseQuery(course, query)),
    [courses, query],
  );

  async function loadCourses() {
    if (!token) {
      return [];
    }

    const items = await listAdminCourses(token);
    setCourses(items);
    return items;
  }

  async function loadInscriptions(courseId: number) {
    if (!token) {
      return;
    }

    setInscriptions(await listCourseInscriptions(token, courseId));
  }

  useEffect(() => {
    async function bootstrap() {
      if (!token) {
        return;
      }

      try {
        const items = await loadCourses();
        if (items[0]) {
          setSelectedCourseId(items[0].id);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudo cargar cursos.");
      }
    }

    void bootstrap();
  }, [token]);

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    try {
      await action();
      toast.success(successMessage);
      await loadCourses();
      if (selectedCourseId && inscriptionsOpen) {
        await loadInscriptions(selectedCourseId);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la acción.");
    }
  }

  async function handleCourseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    try {
      const payload = normalizeCourseForm(form);
      if (editingCourse) {
        await updateCourse(token, editingCourse.id, payload);
        toast.success("Curso actualizado correctamente.");
      } else {
        const created = await createCourse(token, payload);
        toast.success("Curso creado correctamente.");
        setSelectedCourseId(created.id);
      }

      setFormOpen(false);
      setEditingCourse(null);
      setForm(EMPTY_COURSE);
      await loadCourses();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar el curso.");
    }
  }

  function openCreate() {
    setEditingCourse(null);
    setForm(EMPTY_COURSE);
    setFormOpen(true);
  }

  function openDetails(course: AdminCourse) {
    setEditingCourse(course);
    setForm(courseToForm(course));
    setFormOpen(true);
  }

  async function selectCourse(courseId: number) {
    setSelectedCourseId(courseId);
    setSelectedInscriptions([]);
    setSelectedMembers([]);
  }

  async function openInscriptions(course: AdminCourse) {
    setSelectedCourseId(course.id);
    setSelectedInscriptions([]);
    setSelectedMembers([]);
    setInscriptionsOpen(true);
    await loadInscriptions(course.id);
  }

  async function handleDownloadCertificate(inscription: CourseInscription) {
    if (!token || !inscription.certificate_id) {
      return;
    }

    await runAction(async () => {
      const blob = await downloadCertificate(token, inscription.certificate_id ?? 0);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${inscription.certificate_code ?? "certificado"}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, "Certificado descargado.");
  }

  async function handleGenerateCertificate(inscription: CourseInscription) {
    if (!inscription.attended_at) {
      toast.error("Primero marca la asistencia para poder generar el certificado.");
      return;
    }

    await runAction(() => generateCertificate(token ?? "", inscription.id), "Certificado generado correctamente.");
  }

  async function handleGenerateFeedbackLink(inscription: CourseInscription) {
    if (!inscription.attended_at) {
      toast.error("Primero marca la asistencia para poder enviar la encuesta.");
      return;
    }

    await runAction(async () => {
      const response = await generateFeedbackLink(token ?? "", inscription.id);
      await navigator.clipboard.writeText(`${window.location.origin}${response.url}`);
    }, "Link de encuesta copiado correctamente.");
  }

  async function handleRejectPaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rejectionTarget) {
      return;
    }

    await runAction(
      () => rejectPayment(token ?? "", rejectionTarget.id, rejectionObservation),
      "Pago rechazado y observación enviada.",
    );
    setRejectionTarget(null);
    setRejectionObservation("");
  }

  async function handleSendCertificates() {
    if (!token || !selectedCourseId) {
      return;
    }

    try {
      const result = await sendCertificates(token, selectedCourseId, selectedInscriptions);
      const detail = `Procesados: ${result.processed}. Omitidos: ${result.skipped}.`;
      if (result.processed === 0) {
        toast.error(`${detail} Marca asistencia antes de enviar certificados.`);
      } else {
        toast.success(`Certificados enviados correctamente. ${detail}`);
      }
      await loadCourses();
      await loadInscriptions(selectedCourseId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron enviar los certificados.");
    }
  }

  async function handleSendFeedbackLinks() {
    if (!token || !selectedCourseId) {
      return;
    }

    try {
      const result = await sendFeedbackLinks(token, selectedCourseId, selectedInscriptions);
      const detail = `Procesados: ${result.processed}. Omitidos: ${result.skipped}.`;
      if (result.processed === 0) {
        toast.error(`${detail} Solo se puede enviar encuesta a inscritos con asistencia.`);
      } else {
        toast.success(`Encuestas enviadas correctamente. ${detail}`);
      }
      await loadCourses();
      await loadInscriptions(selectedCourseId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudieron enviar las encuestas.");
    }
  }

  async function handleConfirm() {
    if (!confirm || !token) {
      return;
    }

    const course = confirm.course;
    setConfirm(null);

    if (confirm.kind === "finish") {
      await runAction(() => finishCourse(token, course.id), "Curso finalizado.");
      return;
    }

    await runAction(async () => {
      await deleteCourse(token, course.id);
      if (selectedCourseId === course.id) {
        setSelectedCourseId(null);
        setInscriptionsOpen(false);
      }
    }, "Curso eliminado.");
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions admin-courses-heading">
        <div>
          <h1>Cursos</h1>
          <p>Gestión administrativa de cursos, inscritos, pagos, asistencia y certificados.</p>
        </div>
        <div className="admin-courses-heading-actions">
          <label className="admin-courses-search">
            <CourseUiIcon name="search" />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar curso"
              type="search"
              value={query}
            />
          </label>
          <Link className="secondary-button button-link" href="/cursos">
            Ver catálogo público
          </Link>
          <button className="primary-button" onClick={openCreate} type="button">
            <CourseUiIcon name="plus" />
            Nuevo curso
          </button>
        </div>
      </section>

      <section className="admin-courses-workspace">
        <div className="admin-courses-grid-wrap">
          <header className="admin-courses-grid-head">
            <h2>Todos los cursos</h2>
            <span className="muted">{visibleCourses.length} cursos</span>
          </header>
          {visibleCourses.length === 0 ? (
            <p className="muted">No hay cursos que coincidan con la búsqueda.</p>
          ) : (
            <div className="admin-courses-grid">
              {visibleCourses.map((course) => (
                <AdminCourseCard
                  course={course}
                  key={course.id}
                  onSelect={(courseId) => void selectCourse(courseId)}
                  selected={course.id === selectedCourseId}
                />
              ))}
            </div>
          )}
        </div>

        <AdminCoursePanel
          course={selectedCourse}
          onDelete={() => selectedCourse && setConfirm({ kind: "delete", course: selectedCourse })}
          onFinish={() => selectedCourse && setConfirm({ kind: "finish", course: selectedCourse })}
          onOpenDetails={() => selectedCourse && openDetails(selectedCourse)}
          onOpenInscriptions={() => selectedCourse && void openInscriptions(selectedCourse)}
        />
      </section>

      {formOpen ? (
        <CourseFormModal
          editing={Boolean(editingCourse)}
          form={form}
          onChange={setForm}
          onClose={() => {
            setFormOpen(false);
            setEditingCourse(null);
            setForm(EMPTY_COURSE);
          }}
          onSubmit={handleCourseSubmit}
        />
      ) : null}

      {inscriptionsOpen && selectedCourse ? (
        <CourseInscriptionsModal
          course={selectedCourse}
          inscriptions={inscriptions}
          onApprovePayment={(inscription) =>
            void runAction(() => approvePayment(token ?? "", inscription.id), "Pago aprobado correctamente.")
          }
          onCancelRejection={() => {
            setRejectionTarget(null);
            setRejectionObservation("");
          }}
          onClose={() => setInscriptionsOpen(false)}
          onDownloadCertificate={(inscription) => void handleDownloadCertificate(inscription)}
          onOpenDetails={() => {
            setInscriptionsOpen(false);
            openDetails(selectedCourse);
          }}
          onFeedback={(inscription) => void handleGenerateFeedbackLink(inscription)}
          onGenerateCertificate={(inscription) => void handleGenerateCertificate(inscription)}
          onRegisterMembers={() =>
            void runAction(async () => {
              await createMemberInscriptions(
                token ?? "",
                selectedCourse.id,
                selectedMembers.map((member) => member.id),
              );
              setSelectedMembers([]);
            }, "Miembros registrados.")
          }
          onRejectPayment={setRejectionTarget}
          onRejectSubmit={handleRejectPaymentSubmit}
          onRejectionObservationChange={setRejectionObservation}
          onSelectedInscriptionsChange={setSelectedInscriptions}
          onSelectedMembersChange={setSelectedMembers}
          onDownloadReport={() =>
            void runAction(async () => {
              const blob = await downloadAttendeesReport(token ?? "", selectedCourse.id);
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `curso-${selectedCourse.id}-asistentes.csv`;
              link.click();
              window.URL.revokeObjectURL(url);
            }, "Informe descargado.")
          }
          onSendCertificates={() => void handleSendCertificates()}
          onSendFeedback={() => void handleSendFeedbackLinks()}
          onToggleAttendance={(inscription) =>
            void runAction(
              () => updateAttendance(token ?? "", inscription.id, !inscription.attended_at),
              "Asistencia actualizada.",
            )
          }
          rejectionObservation={rejectionObservation}
          rejectionTarget={rejectionTarget}
          selectedInscriptions={selectedInscriptions}
          selectedMembers={selectedMembers}
          token={token ?? ""}
        />
      ) : null}

      {confirm ? (
        <ConfirmCourseModal
          confirmLabel={confirm.kind === "delete" ? "Eliminar" : "Finalizar"}
          danger={confirm.kind === "delete"}
          description={
            confirm.kind === "delete"
              ? `Se eliminará “${confirm.course.title}” del listado administrativo.`
              : `“${confirm.course.title}” quedará marcado como finalizado.`
          }
          onCancel={() => setConfirm(null)}
          onConfirm={() => void handleConfirm()}
          title={confirm.kind === "delete" ? "Eliminar curso" : "Finalizar curso"}
        />
      ) : null}
    </RoleGate>
  );
}
