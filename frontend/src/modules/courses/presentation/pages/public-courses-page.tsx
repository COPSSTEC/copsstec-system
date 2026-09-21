"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Course } from "@/modules/courses/domain/types";
import { listPublicCourses } from "@/modules/courses/infrastructure/courses-api";
import { CourseCard } from "@/modules/courses/presentation/components/course-card";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { matchesPublicCourseFilters } from "@/modules/courses/presentation/lib/public-courses";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicSiteHeader } from "@/shared/components/public-site-header";

const EMPTY_FILTERS = {
  query: "",
  dateFrom: "",
  dateTo: "",
  schedule: "",
  price: "",
  modality: "",
};

export function PublicCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

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

  const modalities = useMemo(
    () => [...new Set(courses.map((course) => course.type_modality).filter((item): item is string => Boolean(item)))],
    [courses],
  );

  const visibleCourses = useMemo(
    () => courses.filter((course) => matchesPublicCourseFilters(course, filters)),
    [courses, filters],
  );

  function updateFilter(key: keyof typeof EMPTY_FILTERS, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="public-page">
      <PublicSiteHeader current="cursos" />

      <section className="page-heading page-heading-actions">
        <div>
          <p className="eyebrow">Capacitaciones</p>
          <h1>Cursos disponibles</h1>
          <p>Oferta pública de capacitaciones COPSSTEC.</p>
        </div>
        <Link className="secondary-button button-link" href="/mi-espacio/cursos">
          Soy miembro, ver mis cursos
        </Link>
      </section>

      <section className="public-course-filters">
        <label className="member-search-control public-course-search">
          <CourseUiIcon name="search" />
          <input
            onChange={(event) => updateFilter("query", event.target.value)}
            placeholder="Buscar por título, lugar o capacitador"
            type="search"
            value={filters.query}
          />
        </label>
        <label className="field">
          Desde
          <input
            onChange={(event) => updateFilter("dateFrom", event.target.value)}
            type="date"
            value={filters.dateFrom}
          />
        </label>
        <label className="field">
          Hasta
          <input onChange={(event) => updateFilter("dateTo", event.target.value)} type="date" value={filters.dateTo} />
        </label>
        <label className="field">
          Estado
          <select onChange={(event) => updateFilter("schedule", event.target.value)} value={filters.schedule}>
            <option value="">Todos</option>
            <option value="upcoming">Próximo</option>
            <option value="ongoing">En curso</option>
            <option value="finished">Finalizado</option>
          </select>
        </label>
        <label className="field">
          Precio
          <select onChange={(event) => updateFilter("price", event.target.value)} value={filters.price}>
            <option value="">Todos</option>
            <option value="free">Gratis</option>
            <option value="paid">De pago</option>
          </select>
        </label>
        <label className="field">
          Modalidad
          <select onChange={(event) => updateFilter("modality", event.target.value)} value={filters.modality}>
            <option value="">Todas</option>
            {modalities.map((modality) => (
              <option key={modality} value={modality}>
                {modality}
              </option>
            ))}
          </select>
        </label>
        <button className="secondary-button" onClick={() => setFilters(EMPTY_FILTERS)} type="button">
          Limpiar
        </button>
      </section>

      {isLoading ? <p className="muted">Cargando cursos...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!isLoading && visibleCourses.length === 0 ? (
        <section className="card">
          <h2>No hay cursos que coincidan</h2>
          <p className="muted">Ajusta los filtros o vuelve más tarde para ver nuevas capacitaciones.</p>
        </section>
      ) : null}

      <section className="courses-grid">
        {visibleCourses.map((course) => (
          <CourseCard course={course} key={course.id} />
        ))}
      </section>
      <PublicFooter />
    </main>
  );
}
