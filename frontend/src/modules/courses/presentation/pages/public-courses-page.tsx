"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";
import { listPublicCourses } from "@/modules/courses/infrastructure/courses-api";
import { CourseCard } from "@/modules/courses/presentation/components/course-card";
import { AppLogo } from "@/shared/components/app-logo";

export function PublicCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCourses() {
      try {
        setCourses(await listPublicCourses());
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los cursos.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadCourses();
  }, []);

  return (
    <main className="public-page">
      <header className="public-header">
        <AppLogo />
        <nav className="nav" aria-label="Navegación pública">
          <Link href="/">Inicio</Link>
          <Link href="/login">Ingresar</Link>
        </nav>
      </header>

      <section className="page-heading">
        <h1>Cursos disponibles</h1>
        <p>Oferta pública de capacitaciones COPSSTEC.</p>
      </section>

      {isLoading ? <p className="muted">Cargando cursos...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!isLoading && courses.length === 0 ? (
        <section className="card">
          <h2>No hay cursos visibles</h2>
          <p className="muted">Pronto publicaremos nuevas capacitaciones.</p>
        </section>
      ) : null}

      <section className="courses-grid">
        {courses.map((course) => (
          <CourseCard course={course} key={course.id} />
        ))}
      </section>
    </main>
  );
}
