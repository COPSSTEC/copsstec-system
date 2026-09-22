export const SOCIAL_LINKS = [
  {
    label: "COPSSTEC IA",
    href: "https://chatgpt.com/g/g-67d5ed81992c819199092c0d4b467c93-copsstec",
    icon: "openai",
  },
  {
    label: "Correos",
    href: "https://box.copsstec.com/mail/",
    icon: "gmail",
  },
  {
    label: "Twitter",
    href: "https://twitter.com/copsstec",
    icon: "x",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/copsstec/?locale=es_LA",
    icon: "facebook",
  },
  {
    label: "LinkedIn",
    href: "https://ec.linkedin.com/company/copsstec",
    icon: "linkedin",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@copsstec",
    icon: "youtube",
  },
] as const;

export type SocialIconName = (typeof SOCIAL_LINKS)[number]["icon"];
export type NavIconName =
  | "bolt"
  | "certificate"
  | "usersPlus"
  | "home"
  | "user"
  | "newspaper"
  | "vote"
  | "creditCard"
  | "folder"
  | "megaphone"
  | "academic"
  | SocialIconName;

export function navIconForHref(href: string): NavIconName {
  if (href === "/dashboard") {
    return "home";
  }

  if (href.startsWith("/admin/pagos") || href.startsWith("/mi-espacio/pagos")) {
    return "creditCard";
  }

  if (href.startsWith("/admin/miembros")) {
    return "usersPlus";
  }

  if (href.includes("/cursos") || href.startsWith("/admin/cursos")) {
    return "academic";
  }

  if (href.startsWith("/admin/avisos")) {
    return "megaphone";
  }

  if (href.includes("/blogs") || href.startsWith("/admin/blogs")) {
    return "newspaper";
  }

  if (href.startsWith("/admin/documentos")) {
    return "folder";
  }

  if (href === "/mi-espacio") {
    return "home";
  }

  if (href === "/profile") {
    return "user";
  }

  if (href.includes("/votaciones")) {
    return "vote";
  }

  return "bolt";
}
