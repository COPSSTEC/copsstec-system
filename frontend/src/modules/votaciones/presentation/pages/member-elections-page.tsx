"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";
import { formatDate, mediaUrl, type MemberPortal } from "@/modules/votaciones/domain/types";
import { getMemberPortal } from "@/modules/votaciones/infrastructure/elections-api";

export function MemberElectionsPage() {
  const [portal, setPortal] = useState<MemberPortal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void getMemberPortal(token)
      .then(setPortal)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (!portal) {
    return (
      <RoleGate requiredAccess="member">
        <p className="muted">{error || "Cargando votaciones..."}</p>
      </RoleGate>
    );
  }

  const { election } = portal;
  return (
    <RoleGate requiredAccess="member">
      <section
        className="votaciones-member"
        style={{
          ["--election-primary" as string]: election.primary_color,
          ["--election-secondary" as string]: election.secondary_color,
        }}
      >
        <header
          className="votaciones-hero"
          style={{ backgroundImage: election.banner_url ? `url(${mediaUrl(election.banner_url)})` : undefined }}
        >
          {election.logo_url ? <img alt="" className="votaciones-hero-logo" src={mediaUrl(election.logo_url)} /> : null}
          <div>
            <p>Votaciones</p>
            <h1>{election.title}</h1>
            <p>{election.subtitle}</p>
            <strong>{election.tagline}</strong>
          </div>
        </header>
        <ol className="votaciones-steps">
          <li>Revisar listas</li>
          <li>Ver candidatos</li>
          <li>Consultar plan de trabajo</li>
          <li>Decidir y votar</li>
        </ol>
        {portal.has_voted ? <p className="form-success">Ya registraste tu voto en este periodo.</p> : null}
        {!portal.voting_enabled ? <p className="muted">Tu voto aún no está habilitado para este periodo.</p> : null}
        <div className="votaciones-member-grid">
          {portal.lists.map((lista) => (
            <article key={lista.id}>
              <h2>{lista.name}</h2>
              <p>{lista.slogan}</p>
              <Link className="primary-button" href={`/mi-espacio/votaciones/listas/${lista.id}`}>
                Ver candidatos y plan
              </Link>
            </article>
          ))}
        </div>
        {portal.lists.length === 0 ? (
          <div className="card">
            <h2>Ninguna lista se muestra al inicio</h2>
            <p>Selecciona una lista cuando el administrador las publique. Periodo de votación: {formatDate(election.voting_starts_on)} - {formatDate(election.voting_ends_on)}.</p>
          </div>
        ) : (
          <p className="muted">Ninguna lista aparece preseleccionada. Elige una para continuar.</p>
        )}
      </section>
    </RoleGate>
  );
}
