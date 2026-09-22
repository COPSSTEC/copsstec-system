"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import type { MemberCourse } from "@/modules/courses/domain/types";
import {
  downloadMyCertificate,
  enrollCurrentMember,
  listMemberAvailableCourses,
  listMyCourses,
} from "@/modules/courses/infrastructure/courses-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { MemberCourseCard } from "@/modules/courses/presentation/components/member-course-card";
import { MemberCoursePanel } from "@/modules/courses/presentation/components/member-course-panel";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import {
  MEMBER_COURSE_PREVIEW,
  canDownloadCertificate,
  matchesMemberCourseFilters,
  visibleCategories,
  type MemberCourseFilter,
} from "@/modules/courses/presentation/lib/member-courses";
import { RoleGate } from "@/shared/components/role-gate";
import { useToast } from "@/shared/hooks/use-toast";

const COMPACT_COURSES_QUERY = "(max-width: 1100px)";

function isCompactCoursesLayout() {
  return window.matchMedia(COMPACT_COURSES_QUERY).matches;
}

export function MemberCoursesPage() {
  const toast = useToast();
  const token = useMemo(() => getStoredToken(), []);
  const [myCourses, setMyCourses] = useState<MemberCourse[]>([]);
  const [availableCourses, setAvailableCourses] = useState<MemberCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [detailCourse, setDetailCourse] = useState<MemberCourse | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [filter, setFilter] = useState<MemberCourseFilter>("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<{ enrolled: boolean; available: boolean }>({
    enrolled: false,
    available: false,
  });
  const didAutoSelect = useRef(false);

  const filters = { query, category };

  const filteredMine = useMemo(
    () => myCourses.filter((course) => matchesMemberCourseFilters(course, filters)),
    [myCourses, query, category],
  );
  const enrolledIds = useMemo(() => new Set(myCourses.map((course) => course.id)), [myCourses]);
  const filteredAvailable = useMemo(
    () =>
      availableCourses.filter(
        (course) => !enrolledIds.has(course.id) && matchesMemberCourseFilters(course, filters),
      ),
    [availableCourses, enrolledIds, query, category],
  );
  const categories = useMemo(
    () => visibleCategories([...myCourses, ...availableCourses]),
    [myCourses, availableCourses],
  );

  const showEnrolled = filter !== "available";
  const showAvailable = filter !== "enrolled";
  const visibleMine = expanded.enrolled || filter === "enrolled" ? filteredMine : filteredMine.slice(0, MEMBER_COURSE_PREVIEW);
  const visibleAvailable =
    expanded.available || filter === "available" ? filteredAvailable : filteredAvailable.slice(0, MEMBER_COURSE_PREVIEW);

  async function loadCourses(): Promise<{ mine: MemberCourse[]; available: MemberCourse[] }> {
    if (!token) {
      return { mine: [], available: [] };
    }

    const [mine, available] = await Promise.all([
      listMyCourses(token),
      listMemberAvailableCourses(token),
    ]);
    setMyCourses(mine);
    setAvailableCourses(available);

    return { mine, available };
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await loadCourses();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No se pudieron cargar tus cursos.");
      } finally {
        setIsLoading(false);
      }
    }

    void bootstrap();
  }, []);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_COURSES_QUERY);
    const sync = () => setCompactLayout(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (didAutoSelect.current || isLoading) {
      return;
    }

    const first = myCourses[0] ?? availableCourses[0] ?? null;
    if (first) {
      setDetailCourse(first);
      setPanelOpen(!isCompactCoursesLayout());
      didAutoSelect.current = true;
    }
  }, [availableCourses, isLoading, myCourses]);

  useEffect(() => {
    if (!panelOpen || !compactLayout) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [compactLayout, panelOpen]);

  function selectCourse(course: MemberCourse) {
    setDetailCourse(course);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  function resolveCourse(
    courseId: number,
    mine: MemberCourse[],
    available: MemberCourse[],
    fallback: MemberCourse,
  ): MemberCourse {
    return mine.find((item) => item.id === courseId) ?? available.find((item) => item.id === courseId) ?? fallback;
  }

  async function downloadCertificate(course: MemberCourse) {
    if (!token || course.inscription_id === null) {
      return;
    }

    if (!canDownloadCertificate(course)) {
      toast.error("El certificado estará disponible cuando administración marque tu asistencia.");
      return;
    }

    setIsBusy(true);
    try {
      const blob = await downloadMyCertificate(token, course.inscription_id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${course.certificate_code ?? `curso-${course.id}-certificado`}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success("Certificado descargado correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar el certificado.");
    } finally {
      setIsBusy(false);
    }
  }

  async function enrollFromMemberView(course: MemberCourse) {
    if (!token || course.inscription_id !== null) {
      return;
    }

    setIsBusy(true);
    try {
      await enrollCurrentMember(token, course.id);
      const { mine, available } = await loadCourses();
      const updated = resolveCourse(course.id, mine, available, {
        ...course,
        inscription_id: course.inscription_id ?? 0,
        inscription_state_id: 9,
      });
      setDetailCourse(updated);
      setPanelOpen(true);
      toast.success("Inscripción confirmada sin costo.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo completar la inscripción.");
    } finally {
      setIsBusy(false);
    }
  }

  async function shareCourse(course: MemberCourse) {
    const url = `${window.location.origin}/cursos/${course.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, url });
        return;
      }

      await navigator.clipboard.writeText(url);
      toast.success("Enlace del curso copiado.");
    } catch {
      toast.info(url, "Enlace del curso");
    }
  }

  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading page-heading-actions member-courses-heading">
        <div>
          <h1>Mis cursos</h1>
          <p>Consulta tus cursos inscritos, explora nuevas capacitaciones y descarga tus certificados.</p>
        </div>
        <div className="member-courses-heading-actions">
          <Link className="member-course-ghost-btn" href="/cursos">
            <CourseUiIcon name="book" />
            Ver catálogo público
          </Link>
          <Link className="member-course-ghost-btn" href="/dashboard">
            <CourseUiIcon name="plus" />
            Volver al dashboard
          </Link>
        </div>
      </section>

      <div className="member-courses-toolbar">
        <div className="member-courses-tabs" role="tablist">
          <FilterTab
            active={filter === "enrolled"}
            count={filteredMine.length}
            label="Inscritos"
            onClick={() => setFilter("enrolled")}
          />
          <FilterTab
            active={filter === "available"}
            count={filteredAvailable.length}
            label="Disponibles"
            onClick={() => setFilter("available")}
          />
          <FilterTab
            active={filter === "all"}
            count={filteredMine.length + filteredAvailable.length}
            label="Todos"
            onClick={() => setFilter("all")}
          />
        </div>
        <div className="member-courses-tools">
          <label className="member-courses-search">
            <CourseUiIcon name="search" />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar cursos..."
              type="search"
              value={query}
            />
          </label>
          <select
            aria-label="Filtrar por categoría"
            className="member-courses-select"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? <p className="muted">Cargando cursos...</p> : null}

      <div className={`member-courses-workspace ${panelOpen ? "" : "is-collapsed"}`}>
        <div className="member-courses-main">
          {showEnrolled ? (
            <CourseSection
              count={filteredMine.length}
              emptyText="Aún no tienes cursos inscritos."
              icon="graduation"
              isLoading={isLoading}
              onSeeAll={() => {
                setExpanded((current) => ({ ...current, enrolled: true }));
                setFilter("enrolled");
              }}
              showSeeAll={filter === "all" && filteredMine.length > 0}
              title="Cursos en los que estoy inscrito"
            >
              {visibleMine.map((course) => (
                <MemberCourseCard
                  course={course}
                  isSelected={panelOpen && detailCourse?.id === course.id}
                  key={`${course.id}-${course.inscription_id}`}
                  onSelect={() => selectCourse(course)}
                />
              ))}
            </CourseSection>
          ) : null}

          {showAvailable ? (
            <CourseSection
              count={filteredAvailable.length}
              emptyText="No hay cursos disponibles para inscripción."
              icon="book"
              isLoading={isLoading}
              onSeeAll={() => {
                setExpanded((current) => ({ ...current, available: true }));
                setFilter("available");
              }}
              showSeeAll={filter === "all" && filteredAvailable.length > 0}
              title="Cursos disponibles para inscripción"
            >
              {visibleAvailable.map((course) => (
                <MemberCourseCard
                  course={course}
                  isSelected={panelOpen && detailCourse?.id === course.id}
                  key={course.id}
                  onEnroll={() => void enrollFromMemberView(course)}
                  onSelect={() => selectCourse(course)}
                />
              ))}
            </CourseSection>
          ) : null}
        </div>

        {panelOpen ? (
          <div
            className={`member-course-sheet ${compactLayout ? "is-overlay" : ""}`}
            onClick={(event) => {
              if (compactLayout && event.target === event.currentTarget) {
                closePanel();
              }
            }}
          >
            <MemberCoursePanel
              key={detailCourse?.id ?? "empty"}
              course={detailCourse}
              isBusy={isBusy}
              onClose={closePanel}
              onDownloadCertificate={() => {
                if (detailCourse) {
                  void downloadCertificate(detailCourse);
                }
              }}
              onEnroll={() => {
                if (detailCourse) {
                  void enrollFromMemberView(detailCourse);
                }
              }}
              onShare={() => {
                if (detailCourse) {
                  void shareCourse(detailCourse);
                }
              }}
            />
          </div>
        ) : null}
      </div>
    </RoleGate>
  );
}

function FilterTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`member-courses-tab ${active ? "is-active" : ""}`} onClick={onClick} type="button">
      {label} ({count})
    </button>
  );
}

function CourseSection({
  children,
  count,
  emptyText,
  icon,
  isLoading,
  onSeeAll,
  showSeeAll,
  title,
}: {
  children: ReactNode;
  count: number;
  emptyText: string;
  icon: "graduation" | "book";
  isLoading: boolean;
  onSeeAll: () => void;
  showSeeAll: boolean;
  title: string;
}) {
  return (
    <section className="member-courses-section">
      <header className="member-courses-section-head">
        <h2>
          <CourseUiIcon name={icon} />
          {title} ({count})
        </h2>
        {showSeeAll ? (
          <button className="member-courses-see-all" onClick={onSeeAll} type="button">
            Ver todos
            <CourseUiIcon name="arrow" />
          </button>
        ) : null}
      </header>
      {count === 0 && !isLoading ? <p className="muted">{emptyText}</p> : null}
      <div className="member-courses-grid">{children}</div>
    </section>
  );
}
