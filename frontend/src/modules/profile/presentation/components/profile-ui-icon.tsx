type ProfileIconName =
  | "user"
  | "phone"
  | "graduation"
  | "calendar"
  | "badge"
  | "download"
  | "pencil"
  | "camera"
  | "check"
  | "file"
  | "id"
  | "mail"
  | "pin"
  | "book"
  | "users"
  | "shield"
  | "arrow"
  | "close"
  | "quote";

const PATHS: Record<ProfileIconName, string[]> = {
  user: ["M12 12a4 4 0 100-8 4 4 0 000 8z", "M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1"],
  phone: ["M6.5 3.5h3l1.5 3.5-2 1.5a12 12 0 006 6l1.5-2 3.5 1.5v3A16 16 0 016.5 3.5z"],
  graduation: ["M3 10l9-5 9 5-9 5-9-5z", "M7 12v4c2 1.4 8 1.4 10 0v-4"],
  calendar: ["M7 3v3", "M17 3v3", "M4 9h16", "M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"],
  badge: ["M12 3l2.2 4.5 5 .7-3.6 3.5.9 4.9L12 14.8 7.5 18.6l.9-4.9L4.8 8.2l5-.7z"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  pencil: ["M4 20h4l10-10-4-4L4 16v4z", "M13 7l4 4"],
  camera: ["M4 8h3l2-2h6l2 2h3v11H4z", "M12 16a3.5 3.5 0 100-7 3.5 3.5 0 000 7z"],
  check: ["M20 6L9 17l-5-5"],
  file: ["M7 3h7l5 5v13H7z", "M14 3v5h5"],
  id: ["M4 6h16v12H4z", "M8 10h4", "M8 14h8", "M16.5 10.5h.01"],
  mail: ["M4 6h16v12H4z", "M4 7l8 6 8-6"],
  pin: [
    "M12 21s6.5-5.2 6.5-10.5a6.5 6.5 0 10-13 0C5.5 15.8 12 21 12 21z",
    "M12 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
  ],
  book: ["M4 5h7v15H4z", "M13 5h7v15h-7z", "M11 5v15", "M13 5v15"],
  users: [
    "M8 10a3 3 0 100-6 3 3 0 000 6z",
    "M3 19v-1.2A4.8 4.8 0 018 13h.5",
    "M16 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    "M14 19v-1a3.5 3.5 0 013.5-3.5H18",
  ],
  shield: ["M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3z", "M9 12l2 2 4-4"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  quote: ["M8 8h4v6H9a3 3 0 01-3-3V8h2z", "M16 8h4v6h-3a3 3 0 01-3-3V8h2z"],
};

interface ProfileUiIconProps {
  name: ProfileIconName;
  className?: string;
}

export function ProfileUiIcon({ name, className }: ProfileUiIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`profile-ui-icon ${className ?? ""}`.trim()}
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
