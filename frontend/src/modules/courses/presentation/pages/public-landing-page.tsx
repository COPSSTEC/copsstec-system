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
        <div className="avp-statement">
          <RevealOnScroll>
            <p>
              COPSSTEC reúne a los profesionales
              <br />
              de SST del Ecuador.
            </p>
            <p>
              Capacitamos, representamos y fortalecemos
              <br />
              el compañerismo del gremio.
            </p>
            <p>El colegio que impulsa tu carrera está aquí.</p>
          </RevealOnScroll>
        </div>

        <article className="avp-module">
          <div className="avp-stage">
            <img alt="Miembros de COPSSTEC con cascos y chalecos de seguridad" src={LANDING_MEDIA.aboutTeam} />
            <div className="avp-stage-copy">
              <p className="avp-eyebrow">Misión</p>
              <h2>
                Impulsar el crecimiento
                <br />
                profesional.
              </h2>
            </div>
          </div>
          <div className="avp-copy-band">
            <RevealOnScroll>
              <p>
                Impulsamos el desarrollo de quienes trabajan en SST con capacitación, convenios,
                cursos, talleres, congresos y espacios de encuentro para el colectivo.
              </p>
            </RevealOnScroll>
          </div>
        </article>

        <article className="avp-module">
          <div className="avp-stage">
            <img alt={VALUE_ALTS[0]} src={LANDING_MEDIA.valuesGallery[0]} />
            <div className="avp-stage-copy">
              <p className="avp-eyebrow">Valores</p>
              <h2>
                Franqueza, honestidad
                <br />
                y trabajo en equipo.
              </h2>
            </div>
          </div>
          <div className="avp-copy-band">
            <RevealOnScroll>
              <p>
                Sumamos, colaboramos y construimos lazos abiertos, multidisciplinares e
                integradores. El gremio crece cuando cada profesional avanza con los demás.
              </p>
            </RevealOnScroll>
          </div>
          <div className="avp-look">
            {LANDING_MEDIA.valuesGallery.map((src, index) => (
              <img alt={VALUE_ALTS[index] ?? "Profesionales de SST"} key={src} src={src} />
            ))}
          </div>
        </article>

        <article className="avp-module">
          <div className="avp-stage">
            <img alt="Profesionales de COPSSTEC en contenido audiovisual" src={LANDING_MEDIA.aboutTv} />
            <div className="avp-stage-copy">
              <p className="avp-eyebrow">COPSSTEC TV</p>
              <h2>
                El gremio,
                <br />
                también en pantalla.
              </h2>
            </div>
            <a
              className="avp-caption"
              href={LANDING_MEDIA.youtubeChannel}
              onClick={() => trackEvent("click", { element_name: "copsstec_tv", section: "about" })}
              rel="noreferrer"
              target="_blank"
            >
              Ver canal ↗
            </a>
          </div>
          <div className="avp-copy-band">
            <RevealOnScroll>
              <p>Contenido del colegio, voces del gremio y recursos para quienes trabajan en SST.</p>
              <a
                className="avp-link"
                href={LANDING_MEDIA.youtubeChannel}
                onClick={() => trackEvent("click", { element_name: "copsstec_tv_copy", section: "about" })}
                rel="noreferrer"
                target="_blank"
              >
                Ir a YouTube ↗
              </a>
            </RevealOnScroll>
          </div>
        </article>

        <article className="avp-module">
          <div className="avp-stage">
            <img alt="Visión global de COPSSTEC en seguridad y salud en el trabajo" src={LANDING_MEDIA.visionGlobe} />
            <div className="avp-stage-copy">
              <p className="avp-eyebrow">Visión</p>
              <h2>
                Un referente
                <br />
                en SST.
              </h2>
            </div>
          </div>
          <div className="avp-copy-band">
            <RevealOnScroll>
              <p>
                Ser un referente nacional e internacional en seguridad y salud en el trabajo,
                usando la organización social para alcanzar las metas del colectivo.
              </p>
            </RevealOnScroll>
          </div>
        </article>
      </section>

      <section className="landing-services" id="servicios">
        <div className="avp-statement avp-statement-compact">
          <RevealOnScroll>
            <p className="avp-eyebrow avp-eyebrow-dark">Nuestros servicios</p>
            <h2>
              Soluciones que
              <br />
              transforman tu práctica.
            </h2>
          </RevealOnScroll>
        </div>

        {LANDING_SERVICES.map((service) => (
          <article className="avp-module" key={service.id}>
            <div className="avp-stage">
              <video autoPlay loop muted playsInline src={service.video} />
              <div className="avp-stage-copy">
                <p className="avp-eyebrow">{service.kicker}</p>
                <h3>{service.title}.</h3>
              </div>
            </div>
            <div className="avp-copy-band">
              <RevealOnScroll>
                <p>{service.description}</p>
                <Link
                  className="avp-link"
                  href={service.href}
                  onClick={() =>
                    trackEvent("click", {
                      element_name: `explorar_${service.id}`,
                      section: "servicios",
                      page_type: "landing",
                    })
                  }
                >
                  {service.cta} ↗
                </Link>
              </RevealOnScroll>
            </div>
          </article>
        ))}
      </section>

      <section className="landing-partners" id="aliados">
        <div className="avp-statement avp-statement-compact">
          <RevealOnScroll>
            <p className="avp-eyebrow avp-eyebrow-dark">Alianzas estratégicas</p>
            <h2>
              Confianza que se
              <br />
              construye en red.
            </h2>
          </RevealOnScroll>
        </div>

        {partners.map((partner) => (
          <article className="avp-module" key={partner.id}>
            <div className="avp-stage avp-stage-light">
              <div className="avp-stage-copy avp-stage-copy-dark">
                {partner.slogan ? (
                  <p className="avp-eyebrow avp-eyebrow-dark">{partner.slogan.split(",")[0]}</p>
                ) : null}
                <h3>{partner.name.replace(/\.$/, "")}.</h3>
              </div>
              <div className="avp-partner-mark">
                <img alt={`Logo de ${partner.name}`} src={partner.logo_url} />
              </div>
            </div>
            <div className="avp-copy-band">
              <RevealOnScroll>
                <p>{partner.description}</p>
                {partner.link ? (
                  <a
                    className="avp-link"
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
                    Visitar sitio ↗
                  </a>
                ) : null}
              </RevealOnScroll>
            </div>
          </article>
        ))}
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
