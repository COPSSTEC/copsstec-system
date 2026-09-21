type CourseIconName =
  | "users"
  | "eye"
  | "check"
  | "trash"
  | "plus"
  | "search"
  | "more"
  | "mail"
  | "certificate"
  | "clipboard"
  | "userPlus"
  | "close"
  | "arrow"
  | "image"
  | "clock"
  | "calendar"
  | "pin"
  | "dollar"
  | "monitor"
  | "filter"
  | "download"
  | "cloud"
  | "user"
  | "book"
  | "xCircle";

const PATHS: Record<CourseIconName, string[]> = {
  users: [
    "M5 7a4 4 0 108 0 4 4 0 10-8 0",
    "M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2",
    "M16 3.13a4 4 0 010 7.75",
    "M21 21v-2a4 4 0 00-3-3.87",
  ],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z", "M12 15a3 3 0 100-6 3 3 0 000 6z"],
  check: ["M5 13l4 4L19 7"],
  trash: ["M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12", "M9 7V4h6v3"],
  plus: ["M12 5v14", "M5 12h14"],
  search: ["M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z", "M16 16l5 5"],
  more: ["M12 6h.01", "M12 12h.01", "M12 18h.01"],
  mail: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  certificate: [
    "M14 3v4a1 1 0 001 1h4",
    "M5 8V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2h-5",
    "M6 14m-3 0a3 3 0 106 0a3 3 0 10-6 0",
  ],
  clipboard: ["M9 5h6", "M8 5a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2H8z", "M9 12h6", "M9 16h4"],
  userPlus: [
    "M5 7a4 4 0 108 0 4 4 0 10-8 0",
    "M3 21v-2a4 4 0 014-4h4c.96 0 1.84.338 2.53.901",
    "M16 19h6",
    "M19 16v6",
  ],
  close: ["M6 6l12 12", "M18 6L6 18"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  image: ["M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z", "M8 10a2 2 0 100-4 2 2 0 000 4z", "M4 16l5-5 3 3 3-4 5 6"],
  clock: ["M21 12a9 9 0 11-18 0 9 9 0 0118 0z", "M12 7v5l3 2"],
  calendar: [
    "M7 3v3",
    "M17 3v3",
    "M4 9h16",
    "M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  ],
  pin: [
    "M12 21s6.5-5.2 6.5-10.5a6.5 6.5 0 10-13 0C5.5 15.8 12 21 12 21z",
    "M12 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  ],
  dollar: ["M12 3v18", "M16.5 7.5A3.5 3.5 0 0013 5H10a3 3 0 000 6h3a3 3 0 010 6H8"],
  monitor: ["M3 5h18v11H3z", "M8 21h8", "M12 16v5"],
  filter: ["M4 6h16", "M7 12h10", "M10 18h4"],
  download: ["M12 4v10", "M8 10l4 4 4-4", "M5 19h14"],
  cloud: ["M7 18a4 4 0 010-8 5 5 0 019.5-1.5A3.5 3.5 0 0117 18H7z"],
  user: ["M8 7a4 4 0 108 0 4 4 0 10-8 0", "M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"],
  book: ["M5 5a2 2 0 012-2h11v16H7a2 2 0 00-2 2V5z", "M7 3v16"],
  xCircle: ["M21 12a9 9 0 11-18 0 9 9 0 0118 0z", "M9 9l6 6", "M15 9l-6 6"],
};

interface CourseUiIconProps {
  name: CourseIconName;
  className?: string;
}

export function CourseUiIcon({ name, className }: CourseUiIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`course-ui-icon ${className ?? ""}`.trim()}
      fill="none"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="16"
    >
      {PATHS[name].map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}
