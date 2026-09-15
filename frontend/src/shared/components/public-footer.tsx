import { AppLogo } from "@/shared/components/app-logo";

export function PublicFooter() {
  return (
    <footer className="public-footer">
      <AppLogo />
      <p>COPSSTEC © {new Date().getFullYear()}</p>
    </footer>
  );
}
