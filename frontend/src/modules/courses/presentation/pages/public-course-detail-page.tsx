"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";
import { getPublicCourse } from "@/modules/courses/infrastructure/courses-api";
import { CourseCover } from "@/modules/courses/presentation/components/course-cover";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { GuestInscriptionForm } from "@/modules/courses/presentation/forms/guest-inscription-form";
import {
  courseScheduleLabel,
  courseScheduleState,
  formatCourseDates,
  formatCoursePrice,
} from "@/modules/courses/presentation/lib/public-courses";
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

  const schedule = course ? courseScheduleState(course) : null;

  return (
    <main className="public-page">
      <PublicSiteHeader current="cursos" />

      {isLoading ? <p className="muted">Cargando curso...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {course ? (
        <div className="course-detail-layout">
          <section className="card public-course-detail">
            <CourseCover className="course-hero-cover" image={course.image} title={course.title} />
            <div className="course-meta">
              <span>{course.type_modality ?? "Curso"}</span>
              <strong>{formatCoursePrice(course.value)}</strong>
            </div>
            {schedule ? (
              <span className={`course-schedule-badge is-${schedule}`}>{courseScheduleLabel(schedule)}</span>
            ) : null}
            <h1>{course.title}</h1>
            <p>{course.about}</p>
            <ul className="course-form-preview-meta">
              <li>
                <CourseUiIcon name="calendar" />
                <span>{formatCourseDates(course)}</span>
              </li>
              <li>
                <CourseUiIcon name="clock" />
                <span>
                  {course.hour_init} a {course.hour_final}
                </span>
              </li>
              <li>
                <CourseUiIcon name="pin" />
                <span>{course.location}</span>
              </li>
              <li>
                <CourseUiIcon name="user" />
                <span>{course.capacitator}</span>
              </li>
            </ul>
            {course.capacitator_about ? (
              <>
                <h2>Capacitador</h2>
                <p className="muted">{course.capacitator_about}</p>
              </>
            ) : null}
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
