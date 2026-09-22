"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import type { User } from "@/modules/auth";
import { BULLETIN_MEDIA } from "@/modules/dashboard/domain/bulletin-media";
import type { MemberFeedJob, MemberFeedNotice } from "@/modules/dashboard/domain/types";
import { useMemberNewspaper } from "@/modules/dashboard/presentation/hooks/use-member-newspaper";
import { NoticeDetailModal } from "@/modules/dashboard/presentation/modals/notice-detail-modal";
import { InductionDocumentsModal } from "@/modules/documents/presentation/modals/induction-documents-modal";
import { SOCIAL_LINKS } from "@/config/social-links";
import { UserAvatar } from "@/shared/components/user-avatar";

const INDUCTION_STORAGE_KEY = "copsstec.induction-modal.seen";
const IA_LINK = SOCIAL_LINKS.find((item) => item.label === "COPSSTEC IA")?.href ?? "/dashboard";

interface MemberNewspaperPageProps {
  user: User;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCoverage(value: string | null | undefined): string {
  if (!value) {
    return "Sin fecha de cobertura";
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function coverageProgress(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const end = new Date(`${value}T00:00:00`).getTime();
  if (Number.isNaN(end)) {
    return 0;
  }
  const now = Date.now();
  const start = end - 365 * 24 * 60 * 60 * 1000;
  const ratio = (now - start) / (end - start);
  return Math.max(8, Math.min(100, Math.round(ratio * 100)));
}

function parseCourseDate(value: string): Date | null {
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime()) && value.includes("-")) {
    return iso;
  }
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (!match) {
    return null;
  }
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

function formatEventDate(value: string): { month: string; day: string } {
  const date = parseCourseDate(value) ?? new Date();
  return {
    month: date.toLocaleDateString("es-EC", { month: "short" }).replace(".", "").toUpperCase(),
    day: String(date.getDate()).padStart(2, "0"),
  };
}

function matchesQuery(query: string, ...parts: Array<string | null | undefined>): boolean {
  if (!query) {
    return true;
  }
  return parts.some((part) => (part ?? "").toLowerCase().includes(query));
}

function isExternalLink(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export function MemberNewspaperPage({ user }: MemberNewspaperPageProps) {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const { snapshot, subscription, isLoading, error } = useMemberNewspaper();
  const [selectedNotice, setSelectedNotice] = useState<MemberFeedNotice | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    if (!snapshot || sessionStorage.getItem(INDUCTION_STORAGE_KEY) === "1") {
      return;
    }
    setDocumentsOpen(true);
    sessionStorage.setItem(INDUCTION_STORAGE_KEY, "1");
  }, [snapshot]);

  const displayName = user.profile
    ? `${user.profile.names} ${user.profile.lastname}`.trim()
    : user.name;
  const memberCode = user.profile?.cod?.trim() || `A-${String(user.id).padStart(5, "0")}`;

  const heroNotices = useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const featured = [...snapshot.notices.high, ...snapshot.notices.medium];
    return featured.filter((notice) =>
      matchesQuery(query, notice.title, notice.excerpt, notice.description),
    );
  }, [query, snapshot]);

  const currentHero = heroNotices[heroIndex] ?? heroNotices[0] ?? null;

  useEffect(() => {
    setHeroIndex(0);
  }, [heroNotices.length, query]);

  if (isLoading) {
    return <p className="muted">Cargando el boletín...</p>;
  }

  if (error || snapshot === null) {
    return <p className="form-error">{error ?? "No se pudo cargar el boletín."}</p>;
  }

  const blogs = snapshot.blogs.filter((item) => matchesQuery(query, item.title, item.excerpt));
  const courses = snapshot.courses.filter((item) =>
    matchesQuery(query, item.title, item.location, item.type_modality),
  );
  const jobs = snapshot.jobs.filter((item) =>
    matchesQuery(query, item.title, item.name_enterprise, item.location),
  );
  const notices = [...snapshot.notices.high, ...snapshot.notices.medium, ...snapshot.notices.low].filter(
    (item) => matchesQuery(query, item.title, item.excerpt),
  );
  const events = courses.slice(0, 3);

  return (
    <div className="bulletin">
      <div className="bulletin-layout">
        <div className="bulletin-main">
          <header className="bulletin-masthead">
            <p className="bulletin-kicker">Colegio Profesional de SST del Ecuador</p>
            <h1>El Boletín COPSSTEC</h1>
            <p className="bulletin-date">
              <CalendarIcon />
              {todayLabel()}
            </p>
            <p className="bulletin-lead">
              Bienvenido, <strong>{displayName}</strong>. Esta es la edición de hoy, con las noticias,
              oportunidades y novedades relevantes para ti y nuestra comunidad profesional.
            </p>
          </header>

          <section className="bulletin-hero">
            <div
              className="bulletin-hero-photo"
              style={{ backgroundImage: `url(${BULLETIN_MEDIA.hero})` }}
            >
              <p className="bulletin-hero-quote">
                Profesionales
                <br />
                que protegen vidas
              </p>
              <p className="bulletin-hero-caption">
                La prevención también construye un mejor Ecuador
              </p>
            </div>
            <article className="bulletin-hero-card">
              {currentHero ? (
                <>
                  <p className="bulletin-hero-tag">
                    {currentHero.importance === "alta" ? "Alta institucional" : "Institucional"}
                  </p>
                  <h2>{currentHero.title}</h2>
                  {currentHero.excerpt ? <p>{currentHero.excerpt}</p> : null}
                  <button
                    className="bulletin-hero-cta"
                    onClick={() => setSelectedNotice(currentHero)}
                    type="button"
                  >
                    Leer aviso
                    <span aria-hidden>→</span>
                  </button>
                </>
              ) : (
                <>
                  <p className="bulletin-hero-tag">Institucional</p>
                  <h2>La prevención también construye un mejor Ecuador</h2>
                  <p>Cuando el colegio publique un aviso, su imagen y titular aparecerán aquí.</p>
                </>
              )}
              {heroNotices.length > 1 ? (
                <div className="bulletin-hero-nav">
                  <div className="bulletin-dots">
                    {heroNotices.map((notice, index) => (
                      <button
                        aria-label={notice.title}
                        className={`bulletin-dot ${index === heroIndex ? "is-active" : ""}`}
                        key={notice.id}
                        onClick={() => setHeroIndex(index)}
                        type="button"
                      />
                    ))}
                  </div>
                  <div className="bulletin-hero-arrows">
                    <button
                      aria-label="Anterior"
                      onClick={() =>
                        setHeroIndex((value) => (value - 1 + heroNotices.length) % heroNotices.length)
                      }
                      type="button"
                    >
                      ←
                    </button>
                    <button
                      aria-label="Siguiente"
                      onClick={() => setHeroIndex((value) => (value + 1) % heroNotices.length)}
                      type="button"
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          </section>

          <nav className="bulletin-shortcuts">
            <Link className="bulletin-shortcut" href="/cursos">
              <span className="bulletin-shortcut-icon" aria-hidden>
                <GraduationIcon />
              </span>
              <strong>Capacitaciones</strong>
              <small>Sigue aprendiendo</small>
              <span className="bulletin-shortcut-arrow" aria-hidden>
                →
              </span>
            </Link>
            <a className="bulletin-shortcut" href="#empleo">
              <span className="bulletin-shortcut-icon" aria-hidden>
                <BriefcaseIcon />
              </span>
              <strong>Ofertas de empleo</strong>
              <small>Nuevas oportunidades</small>
              <span className="bulletin-shortcut-arrow" aria-hidden>
                →
              </span>
            </a>
            <button className="bulletin-shortcut" onClick={() => setDocumentsOpen(true)} type="button">
              <span className="bulletin-shortcut-icon" aria-hidden>
                <DocumentIcon />
              </span>
              <strong>Documentos</strong>
              <small>Normativa y recursos</small>
              <span className="bulletin-shortcut-arrow" aria-hidden>
                →
              </span>
            </button>
            <a className="bulletin-shortcut" href="#avisos">
              <span className="bulletin-shortcut-icon" aria-hidden>
                <MegaphoneIcon />
              </span>
              <strong>Avisos</strong>
              <small>Mantente informado</small>
              <span className="bulletin-shortcut-arrow" aria-hidden>
                →
              </span>
            </a>
          </nav>

          <section className="bulletin-stories">
            <StoryCard
              cover={BULLETIN_MEDIA.blogs}
              href="/blogs"
              kicker="Opinión"
              title="Blogs y opinión"
            >
              {blogs[0] ? (
                <StoryLink
                  excerpt={blogs[0].excerpt}
                  href={`/blogs/${blogs[0].id}`}
                  kicker="Opinión"
                  meta={blogs[0].created_at ? new Date(blogs[0].created_at).toLocaleDateString("es-EC") : ""}
                  title={blogs[0].title}
                />
              ) : (
                <p className="muted">Pronto publicaremos nuevas notas.</p>
              )}
            </StoryCard>

            <StoryCard
              cover={BULLETIN_MEDIA.courses}
              href="/cursos"
              kicker="Formación"
              title="Capacitaciones"
            >
              {courses[0] ? (
                <StoryLink
                  href={`/cursos/${courses[0].id}`}
                  kicker="Formación"
                  meta={[courses[0].date_course, courses[0].type_modality].filter(Boolean).join(" · ")}
                  title={courses[0].title}
                />
              ) : (
                <p className="muted">No hay capacitaciones visibles.</p>
              )}
            </StoryCard>

            <StoryCard
              cover={BULLETIN_MEDIA.jobs}
              href="#empleo"
              kicker="Empleo"
              title="Ofertas de empleo"
            >
              {jobs[0] ? (
                <JobStory job={jobs[0]} />
              ) : (
                <p className="muted" id="empleo">
                  Pronto publicaremos nuevas oportunidades.
                </p>
              )}
            </StoryCard>

            <StoryCard
              cover={BULLETIN_MEDIA.notices}
              href="#avisos"
              kicker="Aviso"
              title="Avisos"
            >
              {notices[0] ? (
                <button
                  className="bulletin-story-link"
                  id="avisos"
                  onClick={() => setSelectedNotice(notices[0])}
                  type="button"
                >
                  <p className="eyebrow">Aviso</p>
                  <h3>{notices[0].title}</h3>
                  {notices[0].excerpt ? <p className="muted">{notices[0].excerpt}</p> : null}
                </button>
              ) : (
                <p className="muted" id="avisos">
                  Aún no hay avisos publicados.
                </p>
              )}
            </StoryCard>
          </section>
        </div>

        <aside className="bulletin-aside">
          <section className="bulletin-card bulletin-membership">
            <div className="bulletin-membership-head">
              <p>Tu membresía</p>
              <Link href="/profile">Mi perfil</Link>
            </div>
            <div className="bulletin-membership-body">
              <div className="bulletin-membership-photo">
                <UserAvatar
                  fotoId={user.profile?.foto_id}
                  name={displayName}
                  size="lg"
                />
              </div>
              <div>
                <strong>Miembro COPSSTEC</strong>
                <p>#{memberCode}</p>
              </div>
              <div className="bulletin-membership-meta">
                <span
                  className={`bulletin-pill ${subscription?.status === "vencida" ? "is-pending" : ""}`}
                >
                  {subscription?.status === "vencida" ? "Pendiente" : "Activa"}
                </span>
                <small className="muted">
                  Válida hasta el {formatCoverage(subscription?.coverage_until)}
                </small>
              </div>
            </div>
            <div className="bulletin-progress">
              <span style={{ width: `${coverageProgress(subscription?.coverage_until)}%` }} />
            </div>
            <p className="bulletin-renewal">Siguiente renovación</p>
          </section>

          <section className="bulletin-card">
            <div className="bulletin-membership-head">
              <p>Próximos eventos</p>
              <Link href="/cursos">Ver todos →</Link>
            </div>
            {events.length === 0 ? (
              <p className="muted">No hay capacitaciones próximas.</p>
            ) : (
              <ul className="bulletin-events">
                {events.map((course) => {
                  const stamp = formatEventDate(course.date_course);
                  return (
                    <li key={course.id}>
                      <Link href={`/cursos/${course.id}`}>
                        <span className="bulletin-event-date">
                          <small>{stamp.month}</small>
                          <strong>{stamp.day}</strong>
                        </span>
                        <span>
                          <strong>{course.title}</strong>
                          <small>
                            {[course.type_modality, course.location].filter(Boolean).join(" · ")}
                          </small>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <a className="bulletin-ia" href={IA_LINK} rel="noreferrer" target="_blank">
            <div className="bulletin-ia-copy">
              <span className="bulletin-ia-mark" aria-hidden>
                <NetworkIcon />
              </span>
              <p className="eyebrow">COPSSTEC IA</p>
              <h2>Tu asistente virtual en normativa, cursos y más</h2>
              <span>Consultar ahora →</span>
              <p className="bulletin-ia-quote">
                “La seguridad y el trabajo son más fuertes juntos.”
              </p>
            </div>
            <img alt="" src={BULLETIN_MEDIA.ia} />
          </a>
        </aside>
      </div>

      {documentsOpen ? (
        <InductionDocumentsModal
          documents={snapshot.documents}
          onClose={() => setDocumentsOpen(false)}
        />
      ) : null}

      {selectedNotice ? (
        <NoticeDetailModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} />
      ) : null}
    </div>
  );
}

function StoryCard({
  title,
  href,
  cover,
  children,
}: {
  title: string;
  kicker: string;
  href: string;
  cover: string;
  children: ReactNode;
}) {
  return (
    <article className="bulletin-story">
      <Link className="bulletin-story-cover" href={href} style={{ backgroundImage: `url(${cover})` }}>
        <span className="sr-only">{title}</span>
      </Link>
      <div className="bulletin-story-body">
        <div className="bulletin-membership-head">
          <p>{title}</p>
          <Link href={href}>Ver todos →</Link>
        </div>
        {children}
      </div>
    </article>
  );
}

function StoryLink({
  href,
  title,
  kicker,
  meta,
  excerpt,
}: {
  href: string;
  title: string;
  kicker: string;
  meta: string;
  excerpt?: string;
}) {
  return (
    <Link className="bulletin-story-link" href={href}>
      <p className="eyebrow">{kicker}</p>
      <h3>{title}</h3>
      {excerpt ? <p className="muted">{excerpt}</p> : null}
      {meta ? <p className="bulletin-story-meta">{meta}</p> : null}
    </Link>
  );
}

function JobStory({ job }: { job: MemberFeedJob }) {
  const body = (
    <>
      <p className="eyebrow">Empleo</p>
      <h3>{job.title}</h3>
      <p className="muted">{[job.name_enterprise, job.location].filter(Boolean).join(" · ")}</p>
    </>
  );

  if (isExternalLink(job.link)) {
    return (
      <a className="bulletin-story-link" href={job.link} id="empleo" rel="noreferrer" target="_blank">
        {body}
      </a>
    );
  }

  return (
    <div className="bulletin-story-link" id="empleo">
      {body}
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg fill="none" height="16" viewBox="0 0 24 24" width="16">
      <rect height="16" rx="3" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="5" />
      <path d="M8 3.5V7M16 3.5V7M4 10h16" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function NetworkIcon() {
  return (
    <svg fill="none" height="18" viewBox="0 0 24 24" width="18">
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="5" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="19" cy="7" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="6" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="m6.4 8.2 4 2.6M17.6 8.2l-4 2.6M7.2 16.6 10.4 13.6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function GraduationIcon() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M3 10.5 12 6l9 4.5-9 4.5L3 10.5z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7 13v4.2c0 .6 2.2 1.8 5 1.8s5-1.2 5-1.8V13" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <rect height="12" rx="2" stroke="currentColor" strokeWidth="1.7" width="16" x="4" y="7" />
      <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M7 3.8h7l4 4V20.2H7V3.8z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M14 3.8v4h4M9 12h6M9 15h6" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg fill="none" height="22" viewBox="0 0 24 24" width="22">
      <path d="M4 10v4h3l6 3V7L7 10H4z" stroke="currentColor" strokeWidth="1.7" />
      <path d="M19 9.5c1 .8 1.5 1.8 1.5 2.5s-.5 1.7-1.5 2.5M8 14.2 7 19h3l1-3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
