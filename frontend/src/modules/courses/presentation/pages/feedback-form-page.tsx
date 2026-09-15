"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { getFeedbackContext, submitFeedback } from "@/modules/courses/infrastructure/courses-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

interface FeedbackFormPageProps {
  token: string;
}

interface FeedbackContext {
  course_title: string;
  date_course: string;
  participant_name: string;
}

export function FeedbackFormPage({ token }: FeedbackFormPageProps) {
  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadContext() {
      try {
        setContext(await getFeedbackContext(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "El enlace no está disponible.");
      }
    }

    void loadContext();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await submitFeedback(token, {
        rating: Number(formData.get("rating")),
        content_rating: Number(formData.get("content_rating")),
        instructor_rating: Number(formData.get("instructor_rating")),
        platform_rating: Number(formData.get("platform_rating")),
        comments: String(formData.get("comments") ?? ""),
      });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la calificación.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="public-page">
      <header className="public-header">
        <AppLogo />
        <nav className="nav" aria-label="Navegación pública">
          <Link href="/">Inicio</Link>
          <Link href="/cursos">Cursos</Link>
        </nav>
      </header>

      <section className="auth-card feedback-card">
        <h1>Califica tu experiencia</h1>
        {context ? (
          <p className="muted">
            {context.participant_name}, gracias por asistir a {context.course_title}.
          </p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {context && !success ? (
          <form className="form-stack" onSubmit={handleSubmit}>
            {[
              ["rating", "Calificación general"],
              ["content_rating", "Contenido"],
              ["instructor_rating", "Capacitador"],
              ["platform_rating", "Logística o plataforma"],
            ].map(([name, label]) => (
              <div className="field" key={name}>
                <label htmlFor={name}>{label}</label>
                <input id={name} max={5} min={1} name={name} required type="number" />
              </div>
            ))}

            <div className="field">
              <label htmlFor="comments">Comentarios</label>
              <textarea id="comments" name="comments" rows={5} />
            </div>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Enviando..." : "Enviar calificación"}
            </button>
          </form>
        ) : null}
      </section>
      <PublicFooter />
    </main>
  );
}
