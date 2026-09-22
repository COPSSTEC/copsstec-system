import type { PaymentIconName } from "@/modules/payments/presentation/lib/member-payments";

const PATHS: Record<PaymentIconName, string[]> = {
  crown: [
    "M4 16l3-8 5 4 5-4 3 8H4z",
    "M4 18h16",
    "M7 8a1 1 0 100-2 1 1 0 000 2z",
    "M12 8a1 1 0 100-2 1 1 0 000 2z",
    "M17 8a1 1 0 100-2 1 1 0 000 2z",
  ],
  gavel: ["M13 5l6 6-2 2-6-6 2-2z", "M10.5 9.5L5 15", "M4 18h8"],
  file: ["M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z", "M14 3v5h5", "M9 13h6", "M9 17h4"],
  graduation: ["M3 10l9-5 9 5-9 5-9-5z", "M7 12v4c2 1.4 8 1.4 10 0v-4"],
  badge: ["M12 3l2.2 4.5 5 .7-3.6 3.5.9 4.9L12 14.8 7.5 18.6l.9-4.9L4.8 8.2l5-.7z"],
  users: [
    "M8 10a3 3 0 100-6 3 3 0 000 6z",
    "M3 19v-1.2A4.8 4.8 0 018 13h.5",
    "M16 11a2.5 2.5 0 100-5 2.5 2.5 0 000 5z",
    "M14 19v-1a3.5 3.5 0 013.5-3.5H18",
  ],
  calendar: [
    "M7 3v3",
    "M17 3v3",
    "M4 9h16",
    "M5 5h14a2 2 0 012 2v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  ],
  shield: ["M12 3l8 3v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3z", "M9 12l2 2 4-4"],
  wallet: ["M4 7h16a1 1 0 011 1v11a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z", "M3 7l2.2-3h13.6L21 7", "M16 13h3"],
  invoice: ["M7 3h10v18l-2.2-1.4L12 21l-2.8-1.4L7 21V3z", "M9 8h6", "M9 12h6"],
  check: ["M20 6L9 17l-5-5"],
  close: ["M6 6l12 12", "M18 6L6 18"],
  search: ["M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z", "M16 16l5 5"],
  download: ["M12 4v12", "M7 11l5 5 5-5", "M5 20h14"],
  printer: ["M6 9V4h12v5", "M6 14h12v6H6z", "M4 9h16v7h-2", "M8 17h8"],
  share: ["M8 12h8", "M14 8l4 4-4 4", "M6 6v12"],
  arrow: ["M5 12h14", "M13 6l6 6-6 6"],
  clock: ["M12 21a9 9 0 100-18 9 9 0 000 18z", "M12 7v5l3 2"],
};

interface PaymentUiIconProps {
  name: PaymentIconName;
}

export function PaymentUiIcon({ name }: PaymentUiIconProps) {
  return (
    <svg className="payment-ui-icon" fill="none" viewBox="0 0 24 24">
      {PATHS[name].map((d) => (
        <path d={d} key={d} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      ))}
    </svg>
  );
}
