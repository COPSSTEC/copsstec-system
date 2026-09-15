"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const [partners, setPartners] = useState<Partner[]>([]);

  useEffect(() => {
    void listPublicPartners()
      .then(setPartners)
      .catch(() => setPartners([]));
  }, []);

  return (
    <div className="landing-page">
      <PublicTopbar />

      <ScrollSequence key={pathname}>
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
        <div className="landing-about-glow" />
        <RevealOnScroll>
          <header className="landing-section-head">
            <span className="landing-kicker">El colegio</span>
            <h2>Quiénes somos</h2>
            <p>
              Somos el Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador.
              Representamos a los profesionales de SST, fomentamos la unidad y fortalecemos el
              compañerismo entre nuestros miembros.
            </p>
          </header>
        </RevealOnScroll>

        <div className="landing-about-bento">
          <RevealOnScroll className="about-bento-mission" from="left">
            <article className="liquid-glass landing-about-card">
              <div>
                <h3>Nuestra misión</h3>
                <p>
                  Impulsar el crecimiento profesional con capacitación, convenios, cursos,
                  talleres, congresos y espacios de encuentro para quienes trabajan en SST.
                </p>
              </div>
              <img
                alt="Miembros de COPSSTEC con cascos y chalecos de seguridad"
                src={LANDING_MEDIA.aboutTeam}
              />
            </article>
          </RevealOnScroll>

          <RevealOnScroll className="about-bento-values" delay={90} from="right">
            <article className="liquid-glass landing-about-card">
              <h3>Valores</h3>
              <p>
                Franqueza, honestidad y trabajo en equipo. Sumamos, colaboramos y construimos
                lazos abiertos, multidisciplinares e integradores.
              </p>
              <div className="landing-values-grid">
                {LANDING_MEDIA.valuesGallery.map((src, index) => (
                  <img alt={VALUE_ALTS[index] ?? "Profesionales de SST"} key={src} src={src} />
                ))}
              </div>
            </article>
          </RevealOnScroll>

          <RevealOnScroll className="about-bento-tv" delay={80} from="up">
            <article className="liquid-glass landing-about-card">
              <h3>COPSSTEC TV</h3>
              <p>Contenido del gremio en nuestro canal de YouTube.</p>
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

          <RevealOnScroll className="about-bento-vision" delay={140} from="right">
            <article className="liquid-glass landing-about-card">
              <h3>Visión</h3>
              <p>
                Ser un referente nacional e internacional en SST, usando la organización social
                para alcanzar las metas del colectivo.
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
              Desde consultoría hasta herramientas digitales, cada servicio está pensado para
              impulsar tu crecimiento profesional.
            </p>
          </header>
        </RevealOnScroll>

        <div className="landing-services-list">
          {LANDING_SERVICES.map((service, index) => (
            <RevealOnScroll delay={index * 80} from={index % 2 === 0 ? "left" : "right"} key={service.id}>
              <article className="landing-service-card">
                <video autoPlay loop muted playsInline src={service.video} />
                <div className="liquid-glass landing-service-glass">
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
