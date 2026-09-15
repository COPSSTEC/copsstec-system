"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { LANDING_MEDIA, LANDING_SERVICES } from "@/config/landing-media";
import type { Partner } from "@/modules/partners/domain/types";
import { listPublicPartners } from "@/modules/partners/infrastructure/partners-api";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicTopbar } from "@/shared/components/public-topbar";
import { ScrollSequence } from "@/shared/components/scroll-sequence";

const CTA_TITLE = "Se miembro COPSSTEC";

function RevealHeading({ text }: { text: string }) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("is-visible");
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <h2 className="landing-cta-title" ref={ref}>
      {text.split("").map((character, index) => (
        <span key={`${character}-${index}`} style={{ animationDelay: `${index * 28}ms` }}>
          {character === " " ? "\u00a0" : character}
        </span>
      ))}
    </h2>
  );
}

export function PublicLandingPage() {
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    void listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  return (
    <div className="landing-page">
      <PublicTopbar />

      <ScrollSequence>
        <div className="landing-hero-copy">
          <article className="landing-glass-card landing-hero-left">
            <h1>¡Hazte miembro del COPSSTEC, conviértete en un experto en SST!</h1>
            <p>Desliza para descubrir más ↓</p>
          </article>

          <div className="landing-hero-right">
            <article className="landing-glass-card">
              <p>
                Domina la seguridad y salud en el trabajo con nuestros cursos certificados.
                Amplía tus oportunidades laborales.
              </p>
              <p>
                <strong>Inscríbete hoy y da el siguiente paso.</strong>
              </p>
              <Link className="landing-button landing-button-dark" href="/afiliacion">
                Registrarse ahora
              </Link>
            </article>
            <article className="landing-glass-card">
              <h2>Zona de Miembros</h2>
              <p>Accede a tu panel exclusivo, recursos premium y certificaciones.</p>
              <Link className="landing-button" href="/login">
                Ingresar al Sistema
              </Link>
            </article>
          </div>
        </div>
      </ScrollSequence>

      <section className="landing-about" id="quienes-somos">
        <header className="landing-section-head">
          <h2>Quiénes somos</h2>
          <p>
            Somos el Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador.
            Una organización que representa y defiende los derechos e intereses de los
            profesionales de la seguridad y salud en el trabajo, que fomenta y fortalece la
            unidad, el compañerismo y la solidaridad entre sus miembros.
          </p>
        </header>

        <div className="landing-about-grid">
          <article className="landing-panel">
            <h3>Nuestra misión</h3>
            <p>
              Generar crecimiento profesional de los miembros, mediante el impulso y desarrollo
              de programas de capacitación a través de convenios de cooperación o la ejecución
              de cursos, talleres, seminarios, congresos, simposios y otros.
            </p>
            <img alt="Equipo COPSSTEC" src={LANDING_MEDIA.aboutTeam} />
          </article>

          <article className="landing-panel">
            <h3>Valores</h3>
            <p>
              En COPSSTEC tenemos un estilo propio de hacer las cosas, basado en la franqueza y
              la honestidad. Sumamos, colaboramos y establecemos lazos, con un talante abierto
              y no excluyente. El trabajo en equipo da mejores resultados: somos
              multidisciplinares e integradores.
            </p>
            <div className="landing-values-grid">
              {LANDING_MEDIA.valuesGallery.map((src) => (
                <img alt="" key={src} src={src} />
              ))}
            </div>
          </article>

          <article className="landing-panel">
            <h3>COPSSTEC TV</h3>
            <p>Mira el contenido en nuestro canal de YouTube</p>
            <a className="landing-tv" href={LANDING_MEDIA.youtubeChannel} rel="noreferrer" target="_blank">
              <img alt="COPSSTEC TV" src={LANDING_MEDIA.aboutTv} />
              <span>Ver canal</span>
            </a>
          </article>

          <article className="landing-panel">
            <h3>Visión</h3>
            <p>
              Consolidarnos como un referente en materia de seguridad y salud en el trabajo con
              reconocimiento nacional e internacional. En COPSSTEC creemos en la organización
              social como una herramienta para lograr las metas que nos marcamos como colectivo.
            </p>
            <img alt="Visión global COPSSTEC" src={LANDING_MEDIA.visionGlobe} />
          </article>
        </div>
      </section>

      <section className="landing-services" id="servicios">
        <header className="landing-section-head">
          <span className="landing-kicker">Nuestros servicios</span>
          <h2>
            Soluciones que <em>transforman</em>
          </h2>
          <p>
            Desde la consultoría especializada hasta herramientas digitales, cada servicio está
            diseñado para impulsar tu crecimiento profesional.
          </p>
        </header>

        <div className="landing-services-list">
          {LANDING_SERVICES.map((service) => (
            <article className="landing-service-card" key={service.id}>
              <video autoPlay loop muted playsInline src={service.video} />
              <div className="landing-service-overlay">
                <span>{service.kicker}</span>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <ul>
                  {service.chips.map((chip) => (
                    <li key={chip}>{chip}</li>
                  ))}
                </ul>
                <Link className="landing-button" href={service.href}>
                  {service.cta}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-partners" id="aliados">
        <p className="landing-kicker">Alianzas estratégicas</p>
        <div className="landing-partners-list">
          {partners.map((partner) => (
            <article className="landing-partner-card" key={partner.id}>
              <div>
                {partner.slogan ? <p className="landing-kicker">{partner.slogan}</p> : null}
                <h3>{partner.name}</h3>
                <p>{partner.description}</p>
                {partner.link ? (
                  <a className="landing-text-link" href={partner.link} rel="noreferrer" target="_blank">
                    Visitar sitio
                  </a>
                ) : null}
              </div>
              <div className="landing-partner-logo">
                <img alt={partner.name} src={partner.logo_url} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-cta" id="afiliate">
        <RevealHeading text={CTA_TITLE} />
        <div className="landing-cta-actions">
          <Link className="landing-button" href="/afiliacion">
            Inscríbete
          </Link>
          <Link className="landing-text-link" href="#quienes-somos">
            ¿Quieres saber más?
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
