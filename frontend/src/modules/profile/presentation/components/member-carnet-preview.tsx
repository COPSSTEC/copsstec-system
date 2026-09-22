"use client";

import { BRAND_MEDIA } from "@/config/brand-media";
import type { Profile } from "@/modules/auth/domain/types";
import { publicMemberQrUrl } from "@/modules/profile/infrastructure/profile-api";
import { CARNET_ORG_NAME, memberCode } from "@/modules/profile/presentation/lib/member-profile";
import { resolveMediaSrc } from "@/shared/lib/media";

interface MemberCarnetPreviewProps {
  profile: Profile;
  active: boolean;
}

export function MemberCarnetPreview({ profile, active }: MemberCarnetPreviewProps) {
  const photoSrc = resolveMediaSrc(profile.foto_id);
  const fullName = `${profile.names} ${profile.lastname}`.trim();

  return (
    <article className="member-carnet-preview" aria-label={`Carnet de ${fullName}`}>
      <div className="member-carnet-rail">
        <span className="member-carnet-status">{active ? "MIEMBRO ACTIVO" : "MIEMBRO INACTIVO"}</span>
        <span className="member-carnet-org">{CARNET_ORG_NAME}</span>
        <span className="member-carnet-code">{memberCode(profile)}</span>
      </div>
      <div className="member-carnet-body">
        <img alt="COPSSTEC" className="member-carnet-logo" src={BRAND_MEDIA.iconShort} />
        {photoSrc ? (
          <img alt={fullName} className="member-carnet-photo" src={photoSrc} />
        ) : (
          <div className="member-carnet-photo is-empty" />
        )}
        <div className="member-carnet-copy">
          <div className="member-carnet-name">
            <strong>{(profile.names || "").toUpperCase()}</strong>
            <strong>{(profile.lastname || "").toUpperCase()}</strong>
          </div>
          <div className="member-carnet-blood">
            <span>Tipo de sangre</span>
            <b>{(profile.blood_type || "—").toUpperCase()}</b>
          </div>
        </div>
        <img alt="Código QR de verificación" className="member-carnet-qr" src={publicMemberQrUrl(profile.id)} />
      </div>
    </article>
  );
}
