"use client";

import Link from "next/link";

import {
  ELECTION_STATUS_LABELS,
  isVotingPending,
  mediaUrl,
  memberCalendarEvents,
  type Election,
  type ElectionList,
  type MemberNotice,
} from "@/modules/votaciones/domain/types";

export function MemberElectionHero({ election }: { election: Election }) {
  return (
    <div
      className={`votaciones-cfg-portal-hero${election.banner_url ? " has-banner" : ""}`}
      style={{
        backgroundColor: election.primary_color || "#0D47A1",
        backgroundImage: election.banner_url ? `url(${mediaUrl(election.banner_url)})` : undefined,
      }}
    >
      <div className="votaciones-cfg-portal-hero-copy">
        <div className="votaciones-cfg-portal-hero-brand">
          {election.logo_url ? <img alt="Logo del proceso" src={mediaUrl(election.logo_url)} /> : null}
          <div>
            <strong>COPSSTEC</strong>
            <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo</small>
          </div>
        </div>
        <h1>{election.title || "Título de la elección"}</h1>
        {election.subtitle ? <p>{election.subtitle}</p> : null}
        {election.tagline ? <blockquote>“{election.tagline}”</blockquote> : null}
        {election.show_process_status ? (
          <em className="votaciones-member-status">{ELECTION_STATUS_LABELS[election.status]}</em>
        ) : null}
      </div>
      <aside className="votaciones-cfg-portal-hero-words" aria-hidden="true">
        <span>PROFESIONALES</span>
        <span>SEGURIDAD</span>
        <span>SALUD</span>
        <span>BIENESTAR</span>
      </aside>
    </div>
  );
}

export function MemberElectionShowcase({
  election,
  lists,
  variant = "live",
  device = "desktop",
  hasVoted = false,
  canVote = false,
  votingEnabled = true,
  notices = [],
}: {
  election: Election;
  lists: ElectionList[];
  variant?: "live" | "preview";
  device?: "desktop" | "mobile";
  hasVoted?: boolean;
  canVote?: boolean;
  votingEnabled?: boolean;
  notices?: MemberNotice[];
}) {
  const shownLists = lists.filter((item) => (variant === "preview" ? item.status !== "retirada" : item.status === "activa"));
  const interactive = variant === "live";
  const firstPlanList = shownLists.find((item) => item.work_plan_url);
  const uniqueNotices = notices.filter(
    (notice, index, items) =>
      items.findIndex((item) => item.title === notice.title && item.body === notice.body) === index,
  );
  const cronograma = memberCalendarEvents(election);
  const pending = interactive && !canVote && !hasVoted && isVotingPending(election);

  return (
    <div
      className={`votaciones-cfg-portal votaciones-member-showcase is-${device} is-${variant}`}
      style={{
        ["--election-primary" as string]: election.primary_color || "#0D47A1",
        ["--election-secondary" as string]: election.secondary_color || "#1976D2",
      }}
    >
      {variant === "preview" ? (
        <div className="votaciones-cfg-portal-nav">
          <div className="votaciones-cfg-portal-brand">
            {election.logo_url ? <img alt="" src={mediaUrl(election.logo_url)} /> : <strong>C</strong>}
            <div>
              <strong>COPSSTEC</strong>
              <small>Colegio de Profesionales de Seguridad y Salud en el Trabajo</small>
            </div>
          </div>
          <nav>
            <span>Portal de miembros</span>
            <span>Elecciones</span>
            <span>Noticias</span>
            <span>
              Mi cuenta <b>▾</b>
            </span>
          </nav>
        </div>
      ) : null}

      <MemberElectionHero election={election} />

      <div className={`votaciones-cfg-portal-kpis${interactive ? " is-cronograma" : ""}`}>
        {interactive
          ? cronograma.map((item) => (
              <article key={item.eventKey}>
                <i style={{ color: item.color, background: `${item.color}22` }}>{calendarIcon()}</i>
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.label}</span>
                </div>
              </article>
            ))
          : previewKpis(election, shownLists)}
      </div>

      {interactive && hasVoted ? <p className="form-success votaciones-member-alert">Ya registraste tu voto en este periodo.</p> : null}
      {interactive && !votingEnabled ? (
        <p className="muted votaciones-member-alert">Tu voto aún no está habilitado para este periodo.</p>
      ) : null}
      {pending ? (
        <p className="votaciones-member-pending" role="status">
          La votación todavía está pendiente. Podrás emitir tu voto cuando se abra el periodo programado.
        </p>
      ) : null}
      {interactive && !pending && uniqueNotices.length > 0 ? (
        <div className="votaciones-member-notices">
          {uniqueNotices.map((notice) => (
            <article key={notice.id}>
              <strong>{notice.title}</strong>
              <p>{plainText(notice.body)}</p>
            </article>
          ))}
        </div>
      ) : null}

      <div className="votaciones-cfg-portal-lists">
        <header>
          <h2>Listas participantes</h2>
          {election.show_work_plan ? (
            interactive && firstPlanList ? (
              <Link href={`/mi-espacio/votaciones/listas/${firstPlanList.id}`}>
                {checkIcon()} Ver plan de trabajo
              </Link>
            ) : (
              <span>
                {checkIcon()} Ver plan de trabajo
              </span>
            )
          ) : null}
        </header>
        <div>
          {shownLists.map((lista, index) => (
            <ListCard
              color={lista.color || election.primary_color}
              href={interactive ? `/mi-espacio/votaciones/listas/${lista.id}` : undefined}
              key={lista.id}
              lista={lista}
              number={lista.sort_order || index + 1}
              showPhotos={election.show_all_photos}
            />
          ))}
          {shownLists.length === 0 ? (
            <p className="muted">Aún no hay listas activas para este periodo.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function previewKpis(election: Election, lists: ElectionList[]) {
  const voting = memberCalendarEvents(election)[0];
  return (
    <>
      <article>
        <i>{calendarIcon()}</i>
        <div>
          <strong>Votación</strong>
          <span>{voting?.label || "Por definir"}</span>
        </div>
      </article>
      <article>
        <i>{usersIcon()}</i>
        <div>
          <strong>Candidatos</strong>
          <span>
            {lists.length} {lists.length === 1 ? "lista inscrita" : "listas inscritas"}
          </span>
        </div>
      </article>
      <article>
        <i>{fileIcon()}</i>
        <div>
          <strong>Tu voto cuenta</strong>
          <span>Por un mejor futuro profesional</span>
        </div>
      </article>
    </>
  );
}

function ListCard({
  lista,
  number,
  color,
  showPhotos,
  href,
}: {
  lista: ElectionList;
  number: number;
  color: string;
  showPhotos: boolean;
  href?: string;
}) {
  const details = (
    <>
      Ver detalles <b>›</b>
    </>
  );
  const faces = lista.candidates;

  return (
    <article>
      <div className="votaciones-cfg-portal-list-head">
        <i style={{ background: color }} />
        <div>
          <small>LISTA {number}</small>
          <strong>{lista.name}</strong>
        </div>
      </div>
      {showPhotos && faces.length > 0 ? (
        <div className="votaciones-cfg-faces">
          {faces.map((candidate) =>
            candidate.photo_url ? (
              <img alt={candidate.full_name} key={candidate.id} src={mediaUrl(candidate.photo_url)} />
            ) : (
              <span key={candidate.id}>{candidate.full_name.slice(0, 1) || "?"}</span>
            ),
          )}
        </div>
      ) : null}
      <p>{lista.slogan || "Participa por un mejor colegio."}</p>
      {href ? <Link href={href}>{details}</Link> : <em>{details}</em>}
    </article>
  );
}

function plainText(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function calendarIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <rect height="16" rx="2" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function usersIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19a6 6 0 0112 0" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.2 19a4.8 4.8 0 015.8-4.4" />
    </svg>
  );
}

function fileIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function checkIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}
