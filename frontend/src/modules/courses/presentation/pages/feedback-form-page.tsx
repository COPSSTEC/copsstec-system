"use client";

import { FormEvent, useEffect, useState } from "react";

import { getFeedbackContext, submitFeedback, type FeedbackContext } from "@/modules/courses/infrastructure/courses-api";
import { CourseCover } from "@/modules/courses/presentation/components/course-cover";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { FeedbackRatingScale } from "@/modules/courses/presentation/components/feedback-rating-scale";
import { formatCoursePrice } from "@/modules/courses/presentation/lib/public-courses";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicSiteHeader } from "@/shared/components/public-site-header";
import { useToast } from "@/shared/hooks/use-toast";

interface FeedbackFormPageProps {
  token: string;
}

const EMPTY_RATINGS = {
  rating: null,
  content_rating: null,
  instructor_rating: null,
  platform_rating: null,
};

export function FeedbackFormPage({ token }: FeedbackFormPageProps) {
  const toast = useToast();
  const [context, setContext] = useState<FeedbackContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number | null>>(EMPTY_RATINGS);
  const [comments, setComments] = useState("");

  useEffect(() => {
    async function loadContext() {
      try {
        setContext(await getFeedbackContext(token));
      } catch (err) {
        setError(err instanceof Error ? err.message : "El enlace no está disponible.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadContext();
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ratings.rating || !ratings.content_rating || !ratings.instructor_rating || !ratings.platform_rating) {
      toast.error("Completa las cuatro calificaciones para enviar la encuesta.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitFeedback(token, {
        rating: ratings.rating,
        content_rating: ratings.content_rating,
        instructor_rating: ratings.instructor_rating,
        platform_rating: ratings.platform_rating,
        comments,
      });
      setSuccess(response.message);
      toast.success(response.message, "Calificación enviada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la calificación.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const dateLabel = context
    ? [context.date_course, context.date_course_final && context.date_course_final !== context.date_course
        ? context.date_course_final
        : null]
        .filter(Boolean)
        .join(" – ")
    : "";

  return (
    <main className="public-page">
      <PublicSiteHeader current="cursos" />

      {isLoading ? <p className="muted">Cargando encuesta...</p> : null}
      {error && !context ? <p className="form-error">{error}</p> : null}

      {context ? (
        <section className="feedback-layout">
          <article className="card public-course-detail">
            <CourseCover className="course-hero-cover" image={context.image} title={context.course_title} />
            <div className="course-meta">
              <span>{context.type_modality ?? "Curso"}</span>
              {context.value ? <strong>{formatCoursePrice(context.value)}</strong> : null}
            </div>
            <h1>{context.course_title}</h1>
            {context.about ? <p className="muted">{context.about}</p> : null}
            <ul className="course-form-preview-meta">
              {dateLabel ? (
                <li>
                  <CourseUiIcon name="calendar" />
                  <span>{dateLabel}</span>
                </li>
              ) : null}
              {context.hour_init ? (
                <li>
                  <CourseUiIcon name="clock" />
                  <span>
                    {context.hour_init}
                    {context.hour_final ? ` a ${context.hour_final}` : ""}
                  </span>
                </li>
              ) : null}
              {context.location ? (
                <li>
                  <CourseUiIcon name="pin" />
                  <span>{context.location}</span>
                </li>
              ) : null}
              {context.capacitator ? (
                <li>
                  <CourseUiIcon name="user" />
                  <span>{context.capacitator}</span>
                </li>
              ) : null}
            </ul>
          </article>

          <section className="card feedback-form-card">
            <header className="guest-inscription-head">
              <span className="course-modal-icon">
                <CourseUiIcon name="star" />
              </span>
              <div>
                <h2>Califica tu experiencia</h2>
                <p className="muted">
                  {context.participant_name}, gracias por asistir. Indica qué tan satisfecho quedaste en cada aspecto.
                </p>
              </div>
            </header>

            {success ? (
              <p className="form-success">{success}</p>
            ) : (
              <form className="form-stack" onSubmit={handleSubmit}>
                <FeedbackRatingScale
                  label="Calificación general"
                  name="rating"
                  onChange={(value) => setRatings((current) => ({ ...current, rating: value }))}
                  value={ratings.rating}
                />
                <FeedbackRatingScale
                  label="Contenido"
                  name="content_rating"
                  onChange={(value) => setRatings((current) => ({ ...current, content_rating: value }))}
                  value={ratings.content_rating}
                />
                <FeedbackRatingScale
                  label="Capacitador"
                  name="instructor_rating"
                  onChange={(value) => setRatings((current) => ({ ...current, instructor_rating: value }))}
                  value={ratings.instructor_rating}
                />
                <FeedbackRatingScale
                  label="Logística o plataforma"
                  name="platform_rating"
                  onChange={(value) => setRatings((current) => ({ ...current, platform_rating: value }))}
                  value={ratings.platform_rating}
                />

                <div className="field">
                  <label htmlFor="comments">Comentarios</label>
                  <textarea
                    id="comments"
                    onChange={(event) => setComments(event.target.value)}
                    placeholder="Cuéntanos qué mejorarías o qué destacó del curso"
                    rows={4}
                    value={comments}
                  />
                </div>

                <button className="primary-button" disabled={isSubmitting} type="submit">
                  {isSubmitting ? "Enviando..." : "Enviar calificación"}
                </button>
              </form>
            )}
          </section>
        </section>
      ) : null}
      <PublicFooter />
    </main>
  );
}
