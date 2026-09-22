type DocumentIconName =
  | "file"
  | "clock"
  | "calendar"
  | "download"
  | "info"
  | "check"
  | "upload"
  | "refresh"
  | "pdf";

const PATHS: Record<DocumentIconName, string[]> = {
  file: ["M7 3h7l5 5v13H7z", "M14 3v5h5"],
  clock: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v5l3 2"],
  calendar: ["M7 3v3", "M17 3v3", "M4 9h16", "M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  info: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 11v6", "M12 8h.01"],
  check: ["M20 6L9 17l-5-5"],
  upload: ["M12 20V8", "M7 13l5-5 5 5", "M5 4h14"],
  refresh: ["M21 12a9 9 0 11-3.2-6.8", "M21 3v6h-6"],
  pdf: ["M7 3h7l5 5v13H7z", "M14 3v5h5", "M9 14h6", "M9 17h4"],
};

interface DocumentUiIconProps {
  name: DocumentIconName;
  className?: string;
}

export function DocumentUiIcon({ name, className }: DocumentUiIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={`document-ui-icon ${className ?? ""}`.trim()}
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
