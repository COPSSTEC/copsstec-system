"use client";

import { useEffect, useState } from "react";

import { resolveMediaSrc } from "@/shared/lib/media";
import { getPublicMember, type PublicMember } from "@/modules/profile/infrastructure/profile-api";

interface PublicMemberPageProps {
  profileId: number;
}

export function PublicMemberPage({ profileId }: PublicMemberPageProps) {
  const [member, setMember] = useState<PublicMember | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getPublicMember(profileId);
        if (!cancelled) {
          setMember(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "No se encontró el miembro.");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return (
    <main className="public-member-page">
      <div className="public-member-sheet">
        {error ? (
          <p className="public-member-error">{error}</p>
        ) : member === null ? (
          <p className="public-member-loading">Verificando credencial...</p>
        ) : (
          <>
            {resolveMediaSrc(member.foto_id) ? (
              <img
                alt={`${member.names} ${member.lastname}`}
                className="public-member-photo"
                src={resolveMediaSrc(member.foto_id) ?? ""}
              />
            ) : (
              <div className="public-member-photo is-empty" />
            )}
            <h1>
              {member.names} {member.lastname}
            </h1>
            <ul>
              <li>C.C: {member.identifier || "No registrado"}</li>
              <li>Título: {member.title || "No registrado"}</li>
              <li>Teléfono: {member.mobile_phone || "No registrado"}</li>
              <li>Correo: {member.email || "No registrado"}</li>
              <li>Provincia: {member.province || "No registrada"}</li>
              <li className="is-status">{member.state_label}</li>
            </ul>
          </>
        )}
      </div>
    </main>
  );
}
