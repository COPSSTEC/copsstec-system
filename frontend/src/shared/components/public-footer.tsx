import { AppLogo } from "@/shared/components/app-logo";
import { LANDING_MEDIA } from "@/config/landing-media";

export function PublicFooter() {
  return (
    <footer className="public-footer landing-footer">
      <AppLogo />
      <div className="landing-footer-contacts">
        <a href={`mailto:${LANDING_MEDIA.contactEmail}`}>{LANDING_MEDIA.contactEmail}</a>
        <a href={`tel:${LANDING_MEDIA.contactPhone.replace(/\s/g, "")}`}>
          {LANDING_MEDIA.contactPhone}
        </a>
      </div>
      <p>COPSSTEC © {new Date().getFullYear()}</p>
    </footer>
  );
}
