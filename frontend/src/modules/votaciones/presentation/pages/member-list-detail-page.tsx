"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";
import {
  isVotingPending,
  mediaUrl,
  parseWorkPlanItems,
  type ElectionCandidate,
  type ElectionList,
  type MemberPortal,
} from "@/modules/votaciones/domain/types";
import { castVote, getMemberPortal } from "@/modules/votaciones/infrastructure/elections-api";
import { MemberElectionHero } from "@/modules/votaciones/presentation/components/member-election-showcase";

const PLAN_ICONS = ["shield", "book", "cap", "gear", "leaf"] as const;

export function MemberListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listId = Number(params.id);
  const [portal, setPortal] = useState<MemberPortal | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<ElectionCandidate | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void getMemberPortal(token)
      .then(setPortal)
      .catch((err: Error) => setError(err.message));
  }, [listId]);

  const election = portal?.election;
  const lists = portal?.lists ?? [];
  const lista = lists.find((item) => item.id === listId) ?? lists[0];

  if (!portal || !election) {
    return (
      <RoleGate requiredAccess="member">
        <p className="muted">{error || "Cargando lista..."}</p>
      </RoleGate>
    );
  }

  if (!lista) {
    return (
      <RoleGate requiredAccess="member">
        <section className="votaciones-member">
          <p className="muted">{error || "Esta lista todavía no está activa."}</p>
          <Link className="votaciones-back" href="/mi-espacio/votaciones">
            ← Volver a listas
          </Link>
        </section>
      </RoleGate>
    );
  }

  const pending = !portal.can_vote && !portal.has_voted && isVotingPending(election);
  const items = parseWorkPlanItems(lista.work_plan_summary);
  const termLabel = termYears(election.term_starts_on, election.term_ends_on);
  const listNumber = lista.sort_order || lists.findIndex((item) => item.id === lista.id) + 1;

  async function vote(isBlank = false) {
    const token = getStoredToken();
    if (!token) return;
    try {
      await castVote(token, isBlank ? { is_blank: true } : { list_id: lista.id });
      router.push("/mi-espacio/votaciones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el voto.");
    }
  }

  return (
    <RoleGate requiredAccess="member">
      <section
        className="votaciones-member votaciones-list-detail"
        style={{
          ["--election-primary" as string]: election.primary_color || "#0D47A1",
          ["--election-secondary" as string]: election.secondary_color || "#1976D2",
          ["--list-color" as string]: lista.color || election.primary_color || "#0D47A1",
        }}
      >
        <MemberElectionHero election={election} />

        {error ? (
          <div className="action-alert action-alert-error">
            <span>{error}</span>
          </div>
        ) : null}
        {portal.has_voted ? <p className="form-success votaciones-member-alert">Ya registraste tu voto en este periodo.</p> : null}
        {pending ? (
          <p className="votaciones-member-pending" role="status">
            La votación todavía está pendiente. Podrás emitir tu voto cuando se abra el periodo programado.
          </p>
        ) : null}

        <nav className="votaciones-list-nav">
          <Link href="/mi-espacio/votaciones">← Volver a listas</Link>
          <span>Puedes navegar entre listas antes de votar</span>
          <div>
            {lists.map((item, index) => (
              <Link
                className={item.id === lista.id ? "is-active" : ""}
                href={`/mi-espacio/votaciones/listas/${item.id}`}
                key={item.id}
              >
                Lista {item.sort_order || index + 1}
              </Link>
            ))}
          </div>
        </nav>

        <div className="votaciones-list-detail-card">
          <div className="votaciones-list-detail-grid">
            <section>
              <header
                className="votaciones-list-detail-head"
                style={{ backgroundColor: lista.color || election.primary_color || "#0D47A1" }}
              >
                <div className="votaciones-list-detail-logo">
                  {lista.logo_url ? (
                    <img alt={`Logo de ${lista.name}`} src={mediaUrl(lista.logo_url)} />
                  ) : (
                    <span aria-hidden="true">{listNumber}</span>
                  )}
                </div>
                <div>
                  <small>Lista {listNumber}</small>
                  <h2>{lista.name}</h2>
                  {lista.slogan ? <p>“{lista.slogan}”</p> : null}
                  {lista.description ? <span>{lista.description}</span> : null}
                </div>
              </header>
              <h3>Candidatos de la Lista {listNumber}</h3>
              {lista.candidates.length === 0 ? (
                <p className="muted">Todavía no hay candidatos en esta lista.</p>
              ) : (
                <div className="votaciones-list-people">
                  {lista.candidates.map((candidate) => (
                    <button key={candidate.id} onClick={() => setSelectedCandidate(candidate)} type="button">
                      <figure>
                        {candidate.photo_url ? (
                          <img alt={candidate.full_name} src={mediaUrl(candidate.photo_url)} />
                        ) : (
                          <span>{(candidate.full_name || "?").slice(0, 1)}</span>
                        )}
                        <figcaption>
                          <strong>{candidate.position_name}</strong>
                          <b>{candidate.full_name}</b>
                          {candidate.short_profile ? <small>{candidate.short_profile}</small> : null}
                        </figcaption>
                      </figure>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <aside>
              <h3>
                <span aria-hidden="true">{planIcon()}</span>
                Plan de trabajo{termLabel ? ` ${termLabel}` : ""}
              </h3>
              {items.length > 0 ? (
                <ol>
                  {items.map((item, index) => (
                    <li key={`${item.title}-${index}`}>
                      <i className={`is-${PLAN_ICONS[index % PLAN_ICONS.length]}`}>{planItemIcon(PLAN_ICONS[index % PLAN_ICONS.length])}</i>
                      <div>
                        <strong>
                          {index + 1}. {item.title}
                        </strong>
                        {item.body ? <p>{item.body}</p> : null}
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="muted">Esta lista aún no publica los ejes de su plan de trabajo.</p>
              )}
              {lista.work_plan_url ? (
                <iframe className="votaciones-list-plan-pdf" src={mediaUrl(lista.work_plan_url)} title="Plan de trabajo" />
              ) : null}
              <p className="votaciones-list-plan-note">
                Revisa con atención la información de esta lista. Luego podrás emitir tu voto de manera informada.
              </p>
            </aside>
          </div>

          <footer className="votaciones-list-detail-actions">
            {portal.can_vote ? (
              <button className="primary-button" onClick={() => (election.confirm_vote ? setConfirming(true) : void vote())} type="button">
                {voteIcon()} Votar por esta lista
              </button>
            ) : null}
            <CompareButton currentId={lista.id} lists={lists} />
          </footer>
        </div>

        {selectedCandidate ? (
          <div className="votaciones-modal" onClick={() => setSelectedCandidate(null)}>
            <article className="votaciones-candidate-detail-modal" onClick={(event) => event.stopPropagation()}>
              {selectedCandidate.photo_url ? (
                <img alt={selectedCandidate.full_name} src={mediaUrl(selectedCandidate.photo_url)} />
              ) : (
                <span className="votaciones-candidate-detail-fallback">{(selectedCandidate.full_name || "?").slice(0, 1)}</span>
              )}
              <small>{selectedCandidate.position_name}</small>
              <h3>{selectedCandidate.full_name}</h3>
              {selectedCandidate.profession ? <p>{selectedCandidate.profession}</p> : null}
              {selectedCandidate.short_profile ? <p>{selectedCandidate.short_profile}</p> : null}
              <button className="secondary-button" onClick={() => setSelectedCandidate(null)} type="button">
                Cerrar
              </button>
            </article>
          </div>
        ) : null}
        {confirming ? (
          <div className="votaciones-modal">
            <article>
              <h3>¿Confirmas tu voto por {lista.name}?</h3>
              <p>No podrás cambiarlo después.</p>
              <div className="votaciones-inline-form">
                <button className="primary-button" onClick={() => void vote()} type="button">
                  Confirmar voto
                </button>
                <button className="secondary-button" onClick={() => setConfirming(false)} type="button">
                  Cancelar
                </button>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </RoleGate>
  );
}

function CompareButton({ currentId, lists }: { currentId: number; lists: ElectionList[] }) {
  const other = lists.find((item) => item.id !== currentId);
  if (!other) return null;
  return (
    <Link className="secondary-button" href={`/mi-espacio/votaciones/listas/${other.id}`}>
      {compareIcon()} Comparar otra lista
    </Link>
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

function voteIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="18">
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

function compareIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  );
}

function planIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 6h11M8 12h11M8 18h7M5 6h.01M5 12h.01M5 18h.01" />
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
  if (name === "cap") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <path d="M3 10l9-4 9 4-9 4-9-4zM7 12v4c2 1.4 8 1.4 10 0v-4" />
      </svg>
    );
  }
  if (name === "gear") {
    return (
      <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4" />
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
