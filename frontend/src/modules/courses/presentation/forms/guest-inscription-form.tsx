"use client";

import { FormEvent, useState } from "react";

import type { Course } from "@/modules/courses/domain/types";
import { createGuestInscription } from "@/modules/courses/infrastructure/courses-api";

interface GuestInscriptionFormProps {
  course: Course;
}

function requiresPayment(course: Course): boolean {
  const amount = Number(course.value.replace(",", "."));

  return Number.isFinite(amount) && amount > 0;
}

export function GuestInscriptionForm({ course }: GuestInscriptionFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const needsVoucher = requiresPayment(course);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(formElement);
      const response = await createGuestInscription(course.id, formData);
      setError(null);
      setSuccess(response.message);
      formElement.reset();
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "No se pudo registrar la inscripción.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="card form-stack" onSubmit={handleSubmit}>
      <h2>Inscripción de invitado</h2>
      <p className="muted">
        {needsVoucher
          ? "Este curso requiere voucher de pago para revisión administrativa."
          : "Este curso es gratuito para invitados."}
      </p>

      <div className="field">
        <label htmlFor="names">Nombres completos</label>
        <input id="names" name="names" required />
      </div>

      <div className="field">
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" name="email" required type="email" />
      </div>

      <div className="field">
        <label htmlFor="identifier">Cédula/RUC/Pasaporte</label>
        <input id="identifier" name="identifier" required />
      </div>

      <div className="field">
        <label htmlFor="cellphone">Celular</label>
        <input id="cellphone" name="cellphone" />
      </div>

      <div className="grid">
        <div className="field">
          <label htmlFor="country">País</label>
          <input id="country" name="country" />
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
        <input id="organization" name="organization" />
      </div>

      {needsVoucher ? (
        <>
          <div className="field">
            <label htmlFor="payment_reference">Referencia de pago</label>
            <input id="payment_reference" name="payment_reference" />
          </div>
          <div className="field">
            <label htmlFor="voucher">Voucher de pago</label>
            <input accept="image/png,image/jpeg,image/webp" id="voucher" name="voucher" required type="file" />
          </div>
        </>
      ) : null}

      {error ? (
        <div className="action-alert action-alert-error" role="status">
          <strong>No se pudo registrar</strong>
          <span>{error}</span>
        </div>
      ) : null}
      {success ? (
        <div className="action-alert action-alert-success" role="status">
          <strong>Inscripción enviada</strong>
          <span>{success}</span>
        </div>
      ) : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Enviando..." : "Enviar inscripción"}
      </button>
    </form>
  );
}
