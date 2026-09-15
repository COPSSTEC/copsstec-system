import { SITE } from "@/config/site";
import { BRAND_MEDIA } from "@/config/brand-media";

export function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#organization`,
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE.url,
        logo: `${SITE.url}${BRAND_MEDIA.logoLong}`,
        email: SITE.email,
        telephone: SITE.phone,
        sameAs: SITE.sameAs,
        areaServed: "EC",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: SITE.name,
        inLanguage: SITE.language,
        publisher: { "@id": `${SITE.url}/#organization` },
      },
      {
        "@type": "ProfessionalService",
        name: SITE.name,
        description: SITE.description,
        url: SITE.url,
        areaServed: "Ecuador",
        serviceType: [
          "Capacitación en seguridad y salud en el trabajo",
          "Consultoría SST",
          "Membresía profesional",
        ],
      },
    ],
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      type="application/ld+json"
    />
  );
}
