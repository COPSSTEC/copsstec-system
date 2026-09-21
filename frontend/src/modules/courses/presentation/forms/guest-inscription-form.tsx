"use client";

import { FormEvent, useState } from "react";

import type { Course } from "@/modules/courses/domain/types";
import { createGuestInscription } from "@/modules/courses/infrastructure/courses-api";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { formatCoursePrice, isPaidCourse } from "@/modules/courses/presentation/lib/public-courses";
import { useToast } from "@/shared/hooks/use-toast";

interface GuestInscriptionFormProps {
  course: Course;
}

export function GuestInscriptionForm({ course }: GuestInscriptionFormProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const needsVoucher = isPaidCourse(course);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setIsSubmitting(true);

    try {
      const formData = new FormData(formElement);
      const response = await createGuestInscription(course.id, formData);
      toast.success(response.message, "Inscripción enviada");
      formElement.reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar la inscripción.", "No se pudo registrar");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card form-stack guest-inscription-card" onSubmit={handleSubmit}>
      <header className="guest-inscription-head">
        <span className="course-modal-icon">
          <CourseUiIcon name="userPlus" />
        </span>
        <div>
          <h2>Inscripción de invitado</h2>
          <p className="muted">
            {needsVoucher
              ? "Este curso requiere voucher de pago para revisión administrativa."
              : "Este curso es gratuito para invitados."}
          </p>
        </div>
        <strong className={`status-badge ${needsVoucher ? "status-badge-info" : "status-badge-success"}`}>
          {formatCoursePrice(course.value)}
        </strong>
      </header>

      <section className="guest-inscription-section">
        <h3>Datos personales</h3>
        <div className="field">
          <label htmlFor="names">Nombres completos</label>
          <input id="names" name="names" placeholder="Nombre y apellidos" required />
        </div>
        <div className="grid">
          <div className="field">
            <label htmlFor="email">Correo electrónico</label>
            <input id="email" name="email" placeholder="nombre@ejemplo.com" required type="email" />
          </div>
          <div className="field">
            <label htmlFor="identifier">Cédula / RUC / Pasaporte</label>
            <input id="identifier" name="identifier" placeholder="Documento de identidad" required />
          </div>
        </div>
        <div className="field">
          <label htmlFor="cellphone">Celular</label>
          <input id="cellphone" name="cellphone" placeholder="0999999999" />
        </div>
      </section>

      <section className="guest-inscription-section">
        <h3>Ubicación y organización</h3>
        <div className="grid">
          <div className="field">
            <label htmlFor="country">País</label>
            <input id="country" name="country" placeholder="Ecuador" />
          </div>
          <div className="field">
            <label htmlFor="province">Provincia</label>
            <input id="province" name="province" />
          </div>
          <div className="field">
            <label htmlFor="city">Ciudad</label>
            <input id="city" name="city" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="organization">Empresa o institución</label>
          <input id="organization" name="organization" placeholder="Opcional" />
        </div>
      </section>

      {needsVoucher ? (
        <section className="guest-inscription-section">
          <h3>Comprobante de pago</h3>
          <div className="field">
            <label htmlFor="payment_reference">Referencia de pago</label>
            <input id="payment_reference" name="payment_reference" placeholder="Número de transferencia" />
          </div>
          <div className="field">
            <label htmlFor="voucher">Voucher de pago</label>
            <input accept="image/png,image/jpeg,image/webp" id="voucher" name="voucher" required type="file" />
          </div>
        </section>
      ) : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Enviando..." : "Enviar inscripción"}
      </button>
    </form>
  );
}
