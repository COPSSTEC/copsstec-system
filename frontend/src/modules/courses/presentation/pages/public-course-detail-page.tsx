"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";
import { getPublicCourse } from "@/modules/courses/infrastructure/courses-api";
import { GuestInscriptionForm } from "@/modules/courses/presentation/forms/guest-inscription-form";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicSiteHeader } from "@/shared/components/public-site-header";

interface PublicCourseDetailPageProps {
  courseId: number;
}

export function PublicCourseDetailPage({ courseId }: PublicCourseDetailPageProps) {
  const [course, setCourse] = useState<Course | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCourse() {
      try {
        setCourse(await getPublicCourse(courseId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo cargar el curso.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourse();
  }, [courseId]);

  return (
    <main className="public-page">
      <PublicSiteHeader current="cursos" />

      {isLoading ? <p className="muted">Cargando curso...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {course ? (
        <div className="course-detail-layout">
          <section className="card">
            <div className="course-hero-image" style={{ backgroundImage: `url(${course.image})` }} />
            <p className="eyebrow">{course.type_modality ?? "Curso"}</p>
            <h1>{course.title}</h1>
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
                <span>Valor</span>
                <strong>{Number(course.value.replace(",", ".")) > 0 ? `$${course.value}` : "Gratis"}</strong>
              </div>
            </div>
            <h2>Capacitador</h2>
            <p>
              <strong>{course.capacitator}</strong>
            </p>
            <p className="muted">{course.capacitator_about}</p>
            <div className="hero-actions">
              <Link className="secondary-button button-link" href="/cursos">
                Volver a cursos
              </Link>
              <Link className="secondary-button button-link" href="/mi-espacio/cursos">
                Mis cursos
              </Link>
            </div>
          </section>

          <GuestInscriptionForm course={course} />
        </div>
      ) : null}
      <PublicFooter />
    </main>
  );
}
