"use client";

import { useState } from "react";
import Link from "next/link";

import { LANDING_MEDIA } from "@/config/landing-media";
import { trackEvent } from "@/shared/lib/analytics";

const EDUCATION_SLIDES = [
  {
    kicker: "Educación",
    title: "Cursos y capacitaciones",
    description: "Alcanza nuevos conocimientos con nuestros expertos.",
    href: "/cursos",
    image: LANDING_MEDIA.overview.educacion,
    alt: "Profesionales de SST en una capacitación",
    event: "overview_cursos",
  },
  {
    kicker: "Educación",
    title: "Blogs públicos",
    description: "Lee artículos y novedades sobre seguridad y salud en el trabajo.",
    href: "/blogs",
    image: LANDING_MEDIA.overview.blogs,
    alt: "Publicaciones y novedades de COPSSTEC",
    event: "overview_blogs",
  },
] as const;

interface OverviewCardProps {
  kicker: string;
  title: string;
  description: string;
  href: string;
  image: string;
  alt: string;
  eventName: string;
  className?: string;
  tone?: "light" | "dark";
}

function OverviewCard({
  kicker,
  title,
  description,
  href,
  image,
  alt,
  eventName,
  className = "",
  tone = "light",
}: OverviewCardProps) {
  return (
    <article className={`landing-overview-card landing-overview-card-${tone} ${className}`.trim()}>
      <img alt={alt} src={image} />
      <div className="landing-overview-card-ui">
        <span className="landing-overview-kicker">{kicker}</span>
        <div className="landing-overview-copy">
          <h2>{title}</h2>
          <p>{description}</p>
          {href.startsWith("http") ? (
            <a
              className="landing-overview-more"
              href={href}
              onClick={() => trackEvent("click", { element_name: eventName, section: "overview" })}
              rel="noreferrer"
              target="_blank"
            >
              Conocer más →
            </a>
          ) : (
            <Link
              className="landing-overview-more"
              href={href}
              onClick={() => trackEvent("click", { element_name: eventName, section: "overview" })}
            >
              Conocer más →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function EducationCard() {
  const [index, setIndex] = useState(0);
  const slide = EDUCATION_SLIDES[index];

  function go(step: number) {
    setIndex((current) => (current + step + EDUCATION_SLIDES.length) % EDUCATION_SLIDES.length);
  }

  return (
    <article className="landing-overview-card landing-overview-card-light landing-overview-educacion">
      <img alt={slide.alt} src={slide.image} />
      <div className="landing-overview-card-ui">
        <div className="landing-overview-card-top">
          <span className="landing-overview-kicker">{slide.kicker}</span>
          <div className="landing-overview-arrows">
            <button aria-label="Anterior" onClick={() => go(-1)} type="button">
              ‹
            </button>
            <button aria-label="Siguiente" onClick={() => go(1)} type="button">
              ›
            </button>
          </div>
        </div>
        <div className="landing-overview-copy">
          <h2>{slide.title}</h2>
          <p>{slide.description}</p>
          <Link
            className="landing-overview-more"
            href={slide.href}
            onClick={() => trackEvent("click", { element_name: slide.event, section: "overview" })}
          >
            Conocer más →
          </Link>
        </div>
      </div>
    </article>
  );
}

export function LandingOverviewPage() {
  return (
    <div className="landing-page landing-overview-page">
      <section className="landing-overview" id="overview">
        <OverviewCard
          alt="Directorio, fundadores y miembros de COPSSTEC"
          className="landing-overview-estructura"
          description="Infórmate de nuestro directorio, nuestros fundadores y miembros activos."
          eventName="overview_estructura"
          href="/#quienes-somos"
          image={LANDING_MEDIA.overview.estructura}
          kicker="Inicio"
          title="Estructura"
        />
        <EducationCard />
        <OverviewCard
          alt="Premio SSOTER a la excelencia en SST"
          className="landing-overview-ssoter"
          description="Reconocimiento anual a la excelencia en la seguridad y salud en el trabajo."
          eventName="overview_ssoter"
          href={LANDING_MEDIA.youtubeChannel}
          image={LANDING_MEDIA.overview.ssoter}
          kicker="Reconocimiento"
          title="Premios SSOTER"
          tone="dark"
        />
        <OverviewCard
          alt="Servicios de COPSSTEC para profesionales de SST"
          className="landing-overview-servicios"
          description="Entérate de todos los servicios que ofrece el COPSSTEC."
          eventName="overview_servicios"
          href="/#servicios"
          image={LANDING_MEDIA.overview.servicios}
          kicker="Servicios"
          title="Servicios COPSSTEC"
        />
        <OverviewCard
          alt="Aliados estratégicos de COPSSTEC"
          className="landing-overview-alianzas"
          description="Conoce nuestras alianzas para mejorar la gestión de seguridad y salud en el trabajo."
          eventName="overview_alianzas"
          href="/#aliados"
          image={LANDING_MEDIA.overview.alianzas}
          kicker="Alianzas"
          title="Aliados Estratégicos"
        />
      </section>
    </div>
  );
}
