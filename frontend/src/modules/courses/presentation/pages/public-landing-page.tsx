"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { LANDING_MEDIA, LANDING_SERVICES } from "@/config/landing-media";
import type { Partner } from "@/modules/partners/domain/types";
import { listPublicPartners } from "@/modules/partners/infrastructure/partners-api";
import { PublicFooter } from "@/shared/components/public-footer";
import { PublicTopbar } from "@/shared/components/public-topbar";
import { RevealOnScroll } from "@/shared/components/reveal-on-scroll";
import { ScrollFillTitle } from "@/shared/components/scroll-fill-title";
import { ScrollSequence } from "@/shared/components/scroll-sequence";
import { trackEvent } from "@/shared/lib/analytics";

const VALUE_ALTS = [
  "Trabajadores de construcción con equipos de protección",
  "Ingeniería y gestión técnica en obra",
  "Profesionales de SST en campo",
  "Equipo de seguridad industrial con cascos y chalecos",
];

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
              <Link
                className="landing-button landing-button-dark"
                href="/afiliacion"
                onClick={() =>
                  trackEvent("generate_lead", {
                    method: "afiliacion",
                    section: "hero",
                    element_name: "registrarse_ahora",
                  })
                }
              >
                Registrarse ahora
              </Link>
            </article>
            <article className="landing-glass-card">
              <h2>Zona de Miembros</h2>
              <p>Accede a tu panel exclusivo, recursos premium y certificaciones.</p>
              <Link
                className="landing-button"
                href="/login"
                onClick={() =>
                  trackEvent("login", {
                    method: "landing",
                    section: "hero",
                    element_name: "ingresar_sistema",
                  })
                }
              >
                Ingresar al Sistema
              </Link>
            </article>
          </div>
        </div>
      </ScrollSequence>

      <section className="landing-about" id="quienes-somos">
        <RevealOnScroll>
          <header className="landing-section-head">
            <h2>Quiénes somos</h2>
            <p>
              Somos el Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador.
              Una organización que representa y defiende los derechos e intereses de los
              profesionales de la seguridad y salud en el trabajo, que fomenta y fortalece la
              unidad, el compañerismo y la solidaridad entre sus miembros.
            </p>
          </header>
        </RevealOnScroll>

        <div className="landing-about-grid">
          <RevealOnScroll delay={80}>
            <article className="landing-panel">
              <h3>Nuestra misión</h3>
              <p>
                Generar crecimiento profesional de los miembros, mediante el impulso y desarrollo
                de programas de capacitación a través de convenios de cooperación o la ejecución
                de cursos, talleres, seminarios, congresos, simposios y otros.
              </p>
              <img
                alt="Miembros de COPSSTEC con cascos y chalecos de seguridad"
                src={LANDING_MEDIA.aboutTeam}
              />
            </article>
          </RevealOnScroll>

          <RevealOnScroll delay={160}>
            <article className="landing-panel">
              <h3>Valores</h3>
              <p>
                En COPSSTEC tenemos un estilo propio de hacer las cosas, basado en la franqueza y
                la honestidad. Sumamos, colaboramos y establecemos lazos, con un talante abierto
                y no excluyente. El trabajo en equipo da mejores resultados: somos
                multidisciplinares e integradores.
              </p>
              <div className="landing-values-grid">
                {LANDING_MEDIA.valuesGallery.map((src, index) => (
                  <img alt={VALUE_ALTS[index] ?? "Profesionales de SST"} key={src} src={src} />
                ))}
              </div>
            </article>
          </RevealOnScroll>

          <RevealOnScroll delay={80}>
            <article className="landing-panel">
              <h3>COPSSTEC TV</h3>
              <p>Mira el contenido en nuestro canal de YouTube</p>
              <a
                className="landing-tv"
                href={LANDING_MEDIA.youtubeChannel}
                onClick={() => trackEvent("click", { element_name: "copsstec_tv", section: "about" })}
                rel="noreferrer"
                target="_blank"
              >
                <img alt="Profesionales de COPSSTEC en contenido audiovisual" src={LANDING_MEDIA.aboutTv} />
                <span>Ver canal</span>
              </a>
            </article>
          </RevealOnScroll>

          <RevealOnScroll delay={160}>
            <article className="landing-panel">
              <h3>Visión</h3>
              <p>
                Consolidarnos como un referente en materia de seguridad y salud en el trabajo con
                reconocimiento nacional e internacional. En COPSSTEC creemos en la organización
                social como una herramienta para lograr las metas que nos marcamos como colectivo.
              </p>
              <img alt="Visión global de COPSSTEC en seguridad y salud en el trabajo" src={LANDING_MEDIA.visionGlobe} />
            </article>
          </RevealOnScroll>
        </div>
      </section>

      <section className="landing-services" id="servicios">
        <RevealOnScroll>
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
        </RevealOnScroll>

        <div className="landing-services-list">
          {LANDING_SERVICES.map((service, index) => (
            <RevealOnScroll delay={index * 70} key={service.id}>
              <article className="landing-service-card">
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
                  <Link
                    className="landing-button"
                    href={service.href}
                    onClick={() =>
                      trackEvent("click", {
                        element_name: `explorar_${service.id}`,
                        section: "servicios",
                        page_type: "landing",
                      })
                    }
                  >
                    {service.cta}
                  </Link>
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="landing-partners" id="aliados">
        <RevealOnScroll>
          <p className="landing-kicker">Alianzas estratégicas</p>
        </RevealOnScroll>
        <div className="landing-partners-list">
          {partners.map((partner, index) => (
            <RevealOnScroll delay={index * 80} key={partner.id}>
              <article className="landing-partner-card">
                <div>
                  {partner.slogan ? <p className="landing-kicker">{partner.slogan}</p> : null}
                  <h3>{partner.name}</h3>
                  <p>{partner.description}</p>
                  {partner.link ? (
                    <a
                      className="landing-text-link"
                      href={partner.link}
                      onClick={() =>
                        trackEvent("click", {
                          element_name: "visitar_aliado",
                          section: "aliados",
                          partner_name: partner.name,
                        })
                      }
                      rel="noreferrer"
                      target="_blank"
                    >
                      Visitar sitio
                    </a>
                  ) : null}
                </div>
                <div className="landing-partner-logo">
                  <img alt={`Logo de ${partner.name}`} src={partner.logo_url} />
                </div>
              </article>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <section className="landing-cta" id="afiliate">
        <div className="landing-cta-sticky">
          <ScrollFillTitle lines={["Se miembro", "COPSSTEC"]} />
          <div className="landing-cta-actions">
            <Link
              className="landing-button"
              href="/afiliacion"
              onClick={() =>
                trackEvent("sign_up", {
                  method: "afiliacion",
                  section: "cta",
                  element_name: "inscribete",
                })
              }
            >
              Inscríbete
            </Link>
            <Link className="landing-text-link" href="#quienes-somos">
              ¿Quieres saber más?
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
