"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";

import type {
  AdminCourse,
  CourseFormInput,
  CourseInscription,
  MemberOption,
} from "@/modules/courses/domain/types";
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
  listMemberOptions,
  rejectPayment,
  sendCertificates,
  sendFeedbackLinks,
  updateAttendance,
  updateCourse,
} from "@/modules/courses/infrastructure/courses-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";

const EMPTY_COURSE: CourseFormInput = {
  state_id: 4,
  title: "",
  value: "0",
  location: "",
  capacitator: "",
  capacitator_about: "",
  date_course: "",
  date_course_final: "",
  hour_init: "",
  hour_final: "",
  about: "",
  image: "",
  type_modality: "Online",
  link: "",
};

function stateLabel(stateId: number | null): string {
  const labels: Record<number, string> = {
    4: "Visible",
    5: "Oculto",
    7: "Rechazado",
    8: "Por aprobar",
    9: "Inscrito",
    11: "Asistió",
    14: "Pagado",
    15: "Enviado",
  };

  return stateId ? labels[stateId] ?? `Estado ${stateId}` : "Sin estado";
}

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [editingCourse, setEditingCourse] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<CourseFormInput>(EMPTY_COURSE);
  const [inscriptions, setInscriptions] = useState<CourseInscription[]>([]);
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [selectedInscriptions, setSelectedInscriptions] = useState<number[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<CourseInscription | null>(null);
  const [rejectionObservation, setRejectionObservation] = useState("");
  const token = useMemo(() => getStoredToken(), []);

  async function loadCourses() {
    if (!token) {
      return;
    }

    setCourses(await listAdminCourses(token));
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
        const [courseItems, memberItems] = await Promise.all([
          listAdminCourses(token),
          listMemberOptions(token, ""),
        ]);
        setCourses(courseItems);
        setMembers(memberItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar cursos.");
      }
    }

    void bootstrap();
  }, [token]);

  async function handleCourseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      if (editingCourse) {
        await updateCourse(token, editingCourse.id, form);
        setMessage("Curso actualizado correctamente.");
      } else {
        await createCourse(token, form);
        setMessage("Curso creado correctamente.");
      }

      setEditingCourse(null);
      setForm(EMPTY_COURSE);
      await loadCourses();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el curso.");
    }
  }

  function startEdit(course: AdminCourse) {
    setEditingCourse(course);
    setForm({
      state_id: course.state_id,
      title: course.title,
      value: course.value,
      location: course.location,
      capacitator: course.capacitator,
      capacitator_about: course.capacitator_about,
      date_course: course.date_course,
      date_course_final: course.date_course_final,
      hour_init: course.hour_init,
      hour_final: course.hour_final,
      about: course.about,
      image: course.image,
      type_modality: course.type_modality,
      link: course.link,
    });
  }

  async function selectCourse(courseId: number) {
    setSelectedCourseId(courseId);
    setSelectedInscriptions([]);
    await loadInscriptions(courseId);
  }

  async function runAction(action: () => Promise<unknown>, successMessage: string) {
    setError(null);
    setMessage(null);

    try {
      await action();
      setMessage(successMessage);
      await loadCourses();
      if (selectedCourseId) {
        await loadInscriptions(selectedCourseId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la acción.");
    }
  }

  async function handleDownloadCertificate(certificateId: number, certificateCode: string | null) {
    if (!token) {
      return;
    }

    await runAction(async () => {
      const blob = await downloadCertificate(token, certificateId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificateCode ?? "certificado"}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, "Certificado descargado.");
  }

  async function handleDownloadReport(courseId: number) {
    if (!token) {
      return;
    }

    await runAction(async () => {
      const blob = await downloadAttendeesReport(token, courseId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `curso-${courseId}-asistentes.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    }, "Informe descargado.");
  }

  async function handleGenerateCertificate(inscription: CourseInscription) {
    if (!inscription.attended_at) {
      setError("Primero marca la asistencia para poder generar el certificado.");
      setMessage(null);
      return;
    }

    await runAction(
      () => generateCertificate(token ?? "", inscription.id),
      "Certificado generado correctamente.",
    );
  }

  async function handleGenerateFeedbackLink(inscription: CourseInscription) {
    if (!inscription.attended_at) {
      setError("Primero marca la asistencia para poder enviar la encuesta.");
      setMessage(null);
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

    setError(null);
    setMessage(null);

    try {
      const result = await sendCertificates(token, selectedCourseId, selectedInscriptions);
      const detail = `Procesados: ${result.processed}. Omitidos: ${result.skipped}.`;
      if (result.processed === 0) {
        setError(`${detail} Marca asistencia antes de enviar certificados.`);
      } else {
        setMessage(`Certificados enviados correctamente. ${detail}`);
      }
      await loadCourses();
      await loadInscriptions(selectedCourseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar los certificados.");
    }
  }

  async function handleSendFeedbackLinks() {
    if (!token || !selectedCourseId) {
      return;
    }

    setError(null);
    setMessage(null);

    try {
      const result = await sendFeedbackLinks(token, selectedCourseId, selectedInscriptions);
      const detail = `Procesados: ${result.processed}. Omitidos: ${result.skipped}.`;
      if (result.processed === 0) {
        setError(`${detail} Solo se puede enviar encuesta a inscritos con asistencia.`);
      } else {
        setMessage(`Encuestas enviadas correctamente. ${detail}`);
      }
      await loadCourses();
      await loadInscriptions(selectedCourseId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron enviar las encuestas.");
    }
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Cursos</h1>
          <p>Gestión administrativa de cursos, inscritos, pagos, asistencia y certificados.</p>
        </div>
        <div className="hero-actions">
          <Link className="secondary-button button-link" href="/cursos">
            Ver catálogo público
          </Link>
          <Link className="secondary-button button-link" href="/mi-espacio/cursos">
            Mis cursos
          </Link>
        </div>
      </section>

      {message ? <ActionAlert tone="success" title="Acción completada" message={message} /> : null}
      {error ? <ActionAlert tone="error" title="Revisa la acción" message={error} /> : null}

      <section className="admin-course-layout">
        <form className="card form-stack" onSubmit={handleCourseSubmit}>
          <h2>{editingCourse ? "Editar curso" : "Nuevo curso"}</h2>
          <CourseInput label="Título" name="title" onChange={setForm} value={form.title} />
          <div className="grid">
            <CourseInput label="Valor" name="value" onChange={setForm} value={form.value} />
            <CourseInput label="Estado" name="state_id" onChange={setForm} type="number" value={String(form.state_id)} />
          </div>
          <CourseInput label="Lugar" name="location" onChange={setForm} value={form.location} />
          <CourseInput label="Imagen URL/ruta" name="image" onChange={setForm} value={form.image} />
          <div className="grid">
            <CourseInput label="Fecha inicio" name="date_course" onChange={setForm} value={form.date_course} />
            <CourseInput label="Fecha fin" name="date_course_final" onChange={setForm} value={form.date_course_final} />
          </div>
          <div className="grid">
            <CourseInput label="Hora inicio" name="hour_init" onChange={setForm} value={form.hour_init} />
            <CourseInput label="Hora fin" name="hour_final" onChange={setForm} value={form.hour_final} />
          </div>
          <CourseInput label="Modalidad" name="type_modality" onChange={setForm} value={form.type_modality ?? ""} />
          <CourseInput label="Link" name="link" onChange={setForm} value={form.link ?? ""} />
          <CourseInput label="Capacitador" name="capacitator" onChange={setForm} value={form.capacitator} />
          <CourseTextarea label="Sobre el capacitador" name="capacitator_about" onChange={setForm} value={form.capacitator_about} />
          <CourseTextarea label="Descripción" name="about" onChange={setForm} value={form.about} />
          <div className="hero-actions">
            <button className="primary-button" type="submit">
              {editingCourse ? "Guardar cambios" : "Crear curso"}
            </button>
            {editingCourse ? (
              <button
                className="secondary-button"
                onClick={() => {
                  setEditingCourse(null);
                  setForm(EMPTY_COURSE);
                }}
                type="button"
              >
                Cancelar
              </button>
            ) : null}
          </div>
        </form>

        <section className="card">
          <h2>Listado</h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Estado</th>
                  <th>Inscritos</th>
                  <th>Pagos</th>
                  <th>Asistentes</th>
                  <th>Certificados</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>{course.title}</td>
                    <td>{course.finished_at ? "Finalizado" : stateLabel(course.state_id)}</td>
                    <td>{course.inscriptions_count}</td>
                    <td>{course.pending_payments_count}</td>
                    <td>{course.attendees_count}</td>
                    <td>{course.certificates_sent_count}</td>
                    <td>
                      <div className="table-actions">
                        <button className="secondary-button" onClick={() => startEdit(course)} type="button">
                          Editar
                        </button>
                        <button className="secondary-button" onClick={() => void selectCourse(course.id)} type="button">
                          Inscritos
                        </button>
                        <button className="secondary-button" onClick={() => void handleDownloadReport(course.id)} type="button">
                          Informe
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => void runAction(() => finishCourse(token ?? "", course.id), "Curso finalizado.")}
                          type="button"
                        >
                          Finalizar
                        </button>
                        <button
                          className="secondary-button danger-button"
                          onClick={() => void runAction(() => deleteCourse(token ?? "", course.id), "Curso eliminado.")}
                          type="button"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedCourseId ? (
        <section className="card course-admin-panel">
          <h2>Inscripciones del curso #{selectedCourseId}</h2>
          <div className="member-picker">
            <strong>Registrar miembros sin costo</strong>
            <div className="member-list">
              {members.map((member) => (
                <label key={member.id}>
                  <input
                    checked={selectedMembers.includes(member.id)}
                    onChange={(event) => {
                      setSelectedMembers((current) =>
                        event.target.checked
                          ? [...current, member.id]
                          : current.filter((id) => id !== member.id),
                      );
                    }}
                    type="checkbox"
                  />
                  {member.name} ({member.email})
                </label>
              ))}
            </div>
            <button
              className="primary-button"
              disabled={selectedMembers.length === 0}
              onClick={() =>
                void runAction(
                  () => createMemberInscriptions(token ?? "", selectedCourseId, selectedMembers),
                  "Miembros registrados.",
                )
              }
              type="button"
            >
              Registrar seleccionados
            </button>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Participante</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Pago</th>
                  <th>Asistencia</th>
                  <th>Certificado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {inscriptions.map((inscription) => (
                  <tr key={inscription.id}>
                    <td>
                      <input
                        checked={selectedInscriptions.includes(inscription.id)}
                        onChange={(event) => {
                          setSelectedInscriptions((current) =>
                            event.target.checked
                              ? [...current, inscription.id]
                              : current.filter((id) => id !== inscription.id),
                          );
                        }}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong>{inscription.names}</strong>
                      <span className="muted table-subtitle">{inscription.email}</span>
                    </td>
                    <td>{inscription.participant_type === "member" ? "Miembro" : "Invitado"}</td>
                    <td>{stateLabel(inscription.state_id)}</td>
                    <td>{stateLabel(inscription.payment_state_id)}</td>
                    <td>{inscription.attended_at ? "Sí" : "No"}</td>
                    <td>
                      {inscription.certificate_id ? (
                        <button
                          className="secondary-button"
                          onClick={() =>
                            void handleDownloadCertificate(
                              inscription.certificate_id ?? 0,
                              inscription.certificate_code,
                            )
                          }
                          type="button"
                        >
                          {inscription.certificate_code}
                        </button>
                      ) : (
                        "Pendiente"
                      )}
                    </td>
                    <td>
                      <div className="table-actions">
                        {inscription.payment_state_id === 8 ? (
                          <>
                            <button
                              className="secondary-button"
                              onClick={() =>
                                void runAction(
                                  () => approvePayment(token ?? "", inscription.id),
                                  "Pago aprobado correctamente.",
                                )
                              }
                              type="button"
                            >
                              Aprobar
                            </button>
                            <button
                              className="secondary-button"
                              onClick={() => setRejectionTarget(inscription)}
                              type="button"
                            >
                              Rechazar
                            </button>
                          </>
                        ) : null}
                        <button
                          className="secondary-button"
                          onClick={() =>
                            void runAction(
                              () => updateAttendance(token ?? "", inscription.id, !inscription.attended_at),
                              "Asistencia actualizada.",
                            )
                          }
                          type="button"
                        >
                          {inscription.attended_at ? "Quitar asistencia" : "Asistió"}
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => void handleGenerateCertificate(inscription)}
                          type="button"
                        >
                          Generar certificado
                        </button>
                        <button
                          className="secondary-button"
                          onClick={() => void handleGenerateFeedbackLink(inscription)}
                          type="button"
                        >
                          Encuesta
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            className="primary-button"
            disabled={selectedInscriptions.length === 0}
            onClick={() => void handleSendCertificates()}
            type="button"
          >
            Enviar certificados seleccionados
          </button>
          <button
            className="secondary-button"
            disabled={selectedInscriptions.length === 0}
            onClick={() => void handleSendFeedbackLinks()}
            type="button"
          >
            Enviar encuestas seleccionadas
          </button>
        </section>
      ) : null}

      {rejectionTarget ? (
        <div className="modal-backdrop" role="presentation">
          <form className="confirm-dialog" onSubmit={handleRejectPaymentSubmit}>
            <h2>Rechazar pago</h2>
            <p className="muted">
              Ingresa la observación que recibirá {rejectionTarget.names}.
            </p>
            <div className="field">
              <label htmlFor="rejection-observation">Observación</label>
              <textarea
                id="rejection-observation"
                onChange={(event) => setRejectionObservation(event.target.value)}
                required
                rows={4}
                value={rejectionObservation}
              />
            </div>
            <div className="hero-actions">
              <button className="primary-button" type="submit">
                Confirmar rechazo
              </button>
              <button
                className="secondary-button"
                onClick={() => {
                  setRejectionTarget(null);
                  setRejectionObservation("");
                }}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </RoleGate>
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

interface CourseFieldProps {
  label: string;
  name: keyof CourseFormInput;
  onChange: Dispatch<SetStateAction<CourseFormInput>>;
  type?: string;
  value: string;
}

function CourseInput({ label, name, onChange, type = "text", value }: CourseFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            [name]: name === "state_id" ? Number(event.target.value) : event.target.value,
          }))
        }
        required={name !== "link" && name !== "type_modality"}
        type={type}
        value={value}
      />
    </div>
  );
}

function CourseTextarea({ label, name, onChange, value }: CourseFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            [name]: event.target.value,
          }))
        }
        required
        rows={4}
        value={value}
      />
    </div>
  );
}
