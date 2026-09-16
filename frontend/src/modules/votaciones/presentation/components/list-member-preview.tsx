"use client";

import type { ReactNode } from "react";

import {
  LIST_STATUS_LABELS,
  mediaUrl,
  parseWorkPlanItems,
  type Election,
  type ElectionList,
} from "@/modules/votaciones/domain/types";

const PLAN_ICONS = ["shield", "book", "briefcase", "heart", "chip", "leaf"] as const;

export function ListMemberPreview({
  election,
  lista,
  listNumber,
  voteDisabled = true,
  onVote,
  mode = "admin",
  actions,
}: {
  election: Election;
  lista: ElectionList;
  listNumber: number;
  voteDisabled?: boolean;
  onVote?: () => void;
  mode?: "admin" | "member" | "catalog";
  actions?: ReactNode;
}) {
  const items = parseWorkPlanItems(lista.work_plan_summary);
  const termLabel = termYears(election.term_starts_on, election.term_ends_on);
  const color = lista.color || election.primary_color || "#0D47A1";
  const showPdf = Boolean(lista.work_plan_url) && mode !== "catalog" && (mode === "admin" || election.show_work_plan !== false);

  return (
    <aside className={`votaciones-member-preview${mode === "catalog" ? " is-catalog" : ""}`}>
      {mode === "admin" ? (
        <header>
          <div>
            <strong>Vista previa para los miembros</strong>
            <p>Así se mostrará la lista a los socios durante el periodo de votación.</p>
          </div>
          <span>Vista de miembro</span>
        </header>
      ) : null}

      <article className="votaciones-member-preview-card">
        <div className="votaciones-member-preview-banner" style={{ background: color }}>
          <div className="votaciones-member-preview-logo">
            {lista.logo_url ? (
              <img alt={`Logo de ${lista.name}`} src={mediaUrl(lista.logo_url)} />
            ) : (
              <span aria-hidden="true">{logoPlaceholder()}</span>
            )}
          </div>
          <div>
            <small>Lista {listNumber}</small>
            <h3>{lista.name || "Nombre de la lista"}</h3>
            <p>{lista.slogan ? `“${lista.slogan}”` : "Lema o slogan de la lista"}</p>
          </div>
          {mode === "catalog" ? (
            <em className={`votaciones-list-status is-${lista.status}`}>{LIST_STATUS_LABELS[lista.status]}</em>
          ) : null}
        </div>

        <section className="votaciones-member-preview-body">
          <h4>
            <span aria-hidden="true">{planHeadingIcon()}</span>
            Nuestro plan de trabajo{termLabel ? ` ${termLabel}` : ""}
          </h4>

          {items.length > 0 ? (
            <ol className="votaciones-plan-items">
              {items.map((item, index) => (
                <li key={`${item.title}-${index}`}>
                  <span className={`is-${PLAN_ICONS[index % PLAN_ICONS.length]}`} aria-hidden="true">
                    {planItemIcon(PLAN_ICONS[index % PLAN_ICONS.length])}
                  </span>
                  <div>
                    <strong>
                      {index + 1}. {item.title}
                    </strong>
                    {item.body ? <p>{item.body}</p> : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : null}

          {mode === "catalog" ? (
            <p className={`votaciones-plan-flag ${lista.work_plan_url ? "is-ready" : ""}`}>
              {lista.work_plan_url ? "Plan de trabajo PDF cargado" : "Sin plan de trabajo cargado"}
            </p>
          ) : showPdf ? (
            <iframe className="votaciones-pdf is-preview" src={mediaUrl(lista.work_plan_url)} title="Plan de trabajo" />
          ) : items.length === 0 ? (
            <p className="muted">Sube el PDF y escribe los ejes del plan para verlos aquí.</p>
          ) : null}

          <h4>
            <span aria-hidden="true">{peopleHeadingIcon()}</span>
            Nuestros candidatos
          </h4>
          {lista.candidates.length === 0 ? (
            <p className="muted">
              {mode === "catalog" ? "Todavía no hay candidatos en esta lista." : "Agrega candidatos para verlos en la vista previa."}
            </p>
          ) : (
            <div className="votaciones-preview-people">
              {lista.candidates.map((candidate) => (
                <figure key={candidate.id}>
                  {candidate.photo_url ? (
                    <img alt={candidate.full_name} src={mediaUrl(candidate.photo_url)} />
                  ) : (
                    <span>{(candidate.full_name || "?").slice(0, 1)}</span>
                  )}
                  <figcaption>
                    <strong>{candidate.position_name}</strong>
                    <small>{candidate.full_name}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </section>

        {mode === "catalog" ? (
          <div className="votaciones-catalog-actions">{actions}</div>
        ) : (
          <button className="primary-button votaciones-preview-vote" disabled={voteDisabled} onClick={onVote} type="button">
            <span aria-hidden="true">{voteIcon()}</span>
            Votar por esta lista
          </button>
        )}
      </article>
    </aside>
  );
}

function termYears(start: string | null, end: string | null): string {
  if (!start || !end) {
    return "";
  }
  const startYear = start.slice(0, 4);
  const endYear = end.slice(0, 4);
  if (!startYear || !endYear) {
    return "";
  }
  return startYear === endYear ? startYear : `${startYear} - ${endYear}`;
}

function logoPlaceholder() {
  return (
    <svg fill="none" height="36" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" width="36">
      <path d="M3 10l9-5 9 5-9 5-9-5z" />
      <path d="M7 12.5V17c0 .8 2.2 2.5 5 2.5s5-1.7 5-2.5v-4.5" />
    </svg>
  );
}

function planHeadingIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 6h11M8 12h11M8 18h7M5 6h.01M5 12h.01M5 18h.01" />
    </svg>
  );
}

function peopleHeadingIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM4 19a4 4 0 018 0M12 19a4 4 0 018 0" />
    </svg>
  );
}

function voteIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function planItemIcon(name: (typeof PLAN_ICONS)[number]) {
  if (name === "book") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <path d="M5 5h8a3 3 0 013 3v12H8a3 3 0 01-3-3V5zM16 8h3v12h-6" />
      </svg>
    );
  }
  if (name === "briefcase") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <rect height="12" rx="2" width="16" x="4" y="8" />
        <path d="M9 8V6h6v2M4 13h16" />
      </svg>
    );
  }
  if (name === "heart") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <path d="M12 19s-7-4.4-7-9a4 4 0 017-2 4 4 0 017 2c0 4.6-7 9-7 9z" />
      </svg>
    );
  }
  if (name === "chip") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <rect height="10" rx="2" width="10" x="7" y="7" />
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      </svg>
    );
  }
  if (name === "leaf") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <path d="M5 19c8-1 13-8 14-14-6 1-13 6-14 14z" />
        <path d="M9 15c2-2 4-5 5-8" />
      </svg>
    );
  }
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-3z" />
    </svg>
  );
}
