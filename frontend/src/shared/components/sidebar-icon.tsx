import type { NavIconName } from "@/config/social-links";

interface SidebarIconProps {
  name: NavIconName;
  className?: string;
}

function SvgIcon({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height="18"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      width="18"
    >
      {children}
    </svg>
  );
}

const PATHS: Record<NavIconName, string[]> = {
  bolt: ["M13 3v7h6l-8 11v-7H5l8-11"],
  certificate: [
    "M14 3v4a1 1 0 001 1h4",
    "M5 8V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2h-5",
    "M6 14m-3 0a3 3 0 106 0a3 3 0 10-6 0",
    "M4.5 17l-1.5 5 3-1.5 3 1.5-1.5-5",
  ],
  usersPlus: [
    "M5 7a4 4 0 108 0 4 4 0 10-8 0",
    "M3 21v-2a4 4 0 014-4h4c.96 0 1.84.338 2.53.901",
    "M16 3.13a4 4 0 010 7.75",
    "M16 19h6",
    "M19 16v6",
  ],
  newspaper: [
    "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1",
    "M15 8h6v10a2 2 0 01-2 2h-4",
    "M7 8h6",
    "M7 12h6",
    "M7 16h4",
  ],
  home: [
    "M5 12H3l9-9 9 9h-2",
    "M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
    "M9 21v-6a2 2 0 012-2h2a2 2 0 012 2v6",
  ],
  user: ["M8 7a4 4 0 108 0 4 4 0 10-8 0", "M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"],
  vote: [
    "M9 11l3 3 8-8",
    "M20 12v6a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h9",
  ],
  openai: [
    "M11.217 19.384a3.501 3.501 0 006.783-1.217v-5.167l-6-3.35",
    "M5.214 15.014a3.501 3.501 0 004.446 5.266l4.34-2.534v-6.946",
    "M6 7.63c-1.391-.236-2.787.395-3.534 1.689a3.474 3.474 0 001.271 4.745l4.263 2.514 6-3.348",
    "M12.783 4.616a3.501 3.501 0 00-6.783 1.217v5.067l6 3.45",
    "M18.786 8.986a3.501 3.501 0 00-4.446-5.266l-4.34 2.534v6.946",
    "M18 16.302c1.391.236 2.787-.395 3.534-1.689a3.474 3.474 0 00-1.271-4.745l-4.308-2.514-5.955 3.42",
  ],
  gmail: [
    "M16 20h3a1 1 0 001-1V5a1 1 0 00-1-1h-3v16z",
    "M5 20h3V4H5a1 1 0 00-1 1v14a1 1 0 001 1z",
    "M16 4l-4 4-4-4",
    "M4 6.5L12 14l8-7.5",
  ],
  x: ["M4 4l11.733 16h4.267L8.267 4H4z", "M4 20l6.768-6.768m2.46-2.46L20 4"],
  facebook: ["M7 10v4h3v7h4v-7h3l1-4h-4v-2a1 1 0 011-1h3v-4h-3a5 5 0 00-5 5v2H7"],
  linkedin: ["M8 11v5", "M8 8v.01", "M12 16v-5", "M16 16v-3a2 2 0 10-4 0", "M3 7a4 4 0 014-4h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4z"],
  youtube: ["M2 8a4 4 0 014-4h12a4 4 0 014 4v8a4 4 0 01-4 4H6a4 4 0 01-4-4V8z", "M10 9l5 3-5 3z"],
  creditCard: [
    "M3 8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z",
    "M3 10h18",
    "M7 15h.01",
    "M11 15h2",
  ],
  folder: [
    "M5 4h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  ],
  megaphone: [
    "M18 8a3 3 0 010 6",
    "M10 8v11a1 1 0 01-1 1H8a1 1 0 01-1-1v-5",
    "M4 8l14-4v10L4 10V8z",
  ],
  academic: [
    "M22 10l-10-5L2 10l10 5 10-5z",
    "M6 12v5c3 2 9 2 12 0v-5",
  ],
};

export function SidebarIcon({ name, className }: SidebarIconProps) {
  return (
    <SvgIcon className={className}>
      {PATHS[name].map((d) => (
        <path d={d} key={d} />
      ))}
    </SvgIcon>
  );
}
