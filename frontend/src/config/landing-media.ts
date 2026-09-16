export const LANDING_FRAME_COUNT = 218;
export const LANDING_FRAME_DIR = "/media/landing/frames-desktop-seq";

export function landingFrameSrc(index: number): string {
  return `${LANDING_FRAME_DIR}/frame_${String(index).padStart(4, "0")}.webp`;
}

export const LANDING_MEDIA = {
  aboutTeam: "https://i.postimg.cc/XYjv8z2G/Imagen-3.png",
  aboutTv: "https://i.postimg.cc/g05kGkG8/Imagen-4.png",
  youtubeChannel: "https://www.youtube.com/@copsstec",
  visionGlobe:
    "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1400&q=80",
  valuesGallery: [
    "https://img.freepik.com/foto-gratis/escena-blanco-negro-que-muestra-vida-trabajadores-construccion-sitio_23-2151333249.jpg?w=2000",
    "https://img.freepik.com/fotos-premium/excelencia-ingenieria-orgullo-frances-diseno-construccion_976564-48635.jpg?w=1480",
    "https://img.freepik.com/foto-gratis/mujeres-ingenieras-trabajando_23-2151657915.jpg?w=2000",
    "https://img.freepik.com/fotos-premium/grupo-trabajadores-construccion-cascos-chalecos-seguridad-estan-pie-fila-mirando-algo_1162225-54899.jpg?w=2000",
  ],
  contactEmail: "copsstec@gmail.com",
  contactPhone: "+593 958762480",
  overview: {
    estructura: "https://i.postimg.cc/XYjv8z2G/Imagen-3.png",
    educacion:
      "https://img.freepik.com/foto-gratis/mujeres-ingenieras-trabajando_23-2151657915.jpg?w=2000",
    blogs:
      "https://img.freepik.com/fotos-premium/excelencia-ingenieria-orgullo-frances-diseno-construccion_976564-48635.jpg?w=1480",
    ssoter:
      "https://images.unsplash.com/photo-1578269174936-2709b6aeb913?auto=format&fit=crop&w=1400&q=80",
    servicios:
      "https://img.freepik.com/fotos-premium/grupo-trabajadores-construccion-cascos-chalecos-seguridad-estan-pie-fila-mirando-algo_1162225-54899.jpg?w=2000",
    alianzas:
      "https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1400&q=80",
  },
} as const;

export const LANDING_SERVICES = [
  {
    id: "consultoria",
    kicker: "Soluciones a medida",
    title: "Consultoría integral",
    description:
      "Acompañamos a empresas y profesionales con un diagnóstico claro, planes de SST a medida y resultados que se pueden medir.",
    chips: ["Análisis 360°", "Resultados medibles"],
    cta: "Explorar consultoría",
    href: "/cursos",
    video: "/media/landing/videos/copsstec.mp4",
  },
  {
    id: "recursos",
    kicker: "Acceso 24/7",
    title: "Recursos online",
    description:
      "Consulta normas, guías y materiales de SST en un solo lugar, listos para usar en tu trabajo diario.",
    chips: ["Documentación", "Video-guías"],
    cta: "Explorar documentación",
    href: "/cursos",
    video: "/media/landing/videos/biblioteca.mp4",
  },
  {
    id: "talento",
    kicker: "Conexión profesional",
    title: "Talento humano",
    description:
      "Encuentra y publica oportunidades laborales especializadas en seguridad y salud en el trabajo.",
    chips: ["Perfiles verificados", "Match inteligente"],
    cta: "Explorar bolsa de empleo",
    href: "/afiliacion",
    video: "/media/landing/videos/bolsa.mp4",
  },
  {
    id: "comunicacion",
    kicker: "Infraestructura robusta",
    title: "Comunicación segura",
    description:
      "Profesionaliza tu correo con una cuenta institucional, antispam y avisos de la comunidad SST.",
    chips: ["Anti-spam", "99.9% uptime", "Noticias SST"],
    cta: "Explorar correo institucional",
    href: "/afiliacion",
    video: "/media/landing/videos/correos.mp4",
  },
  {
    id: "espacios",
    kicker: "Ambiente productivo",
    title: "Espacios modernos",
    description:
      "Usa salas, red y espacios de encuentro para capacitarte y conectar con especialistas del gremio.",
    chips: ["Salas modernas", "WiFi", "Cafetería", "Proyector"],
    cta: "Explorar directorio",
    href: "/cursos",
    video: "/media/landing/videos/oficinas.mp4",
  },
  {
    id: "presupuestador",
    kicker: "Cálculo instantáneo",
    title: "Presupuestador",
    description:
      "Estima costos de servicios de seguridad y salud ocupacional y exporta una propuesta clara.",
    chips: ["Exportación PDF", "Multimoneda"],
    cta: "Explorar calculadora",
    href: "/cursos",
    video: "/media/landing/videos/calculadora.mp4",
  },
] as const;
