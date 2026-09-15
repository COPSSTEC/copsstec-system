export const SITE = {
  name: "COPSSTEC",
  legalName: "Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador",
  shortName: "COPSSTEC",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "es_EC",
  language: "es",
  description:
    "Colegio de Profesionales de Seguridad y Salud en el Trabajo del Ecuador. Capacitación, membresía, cursos certificados y servicios de SST.",
  email: "copsstec@gmail.com",
  phone: "+593958762480",
  sameAs: ["https://www.youtube.com/@copsstec", "https://www.copsstec.com/"],
} as const;

export function siteUrl(path = "/"): string {
  return new URL(path, SITE.url).toString();
}
