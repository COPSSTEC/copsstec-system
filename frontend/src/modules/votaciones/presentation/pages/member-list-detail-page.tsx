"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";
import { type MemberPortal } from "@/modules/votaciones/domain/types";
import { castVote, getMemberList, getMemberPortal } from "@/modules/votaciones/infrastructure/elections-api";
import { ListMemberPreview } from "@/modules/votaciones/presentation/components/list-member-preview";

export function MemberListDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const listId = Number(params.id);
  const [portal, setPortal] = useState<MemberPortal | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void getMemberList(token, listId)
      .then(setPortal)
      .catch((err: Error) => setError(err.message));
  }, [listId]);

  if (!portal || portal.lists.length === 0) {
    return (
      <RoleGate requiredAccess="member">
        <p className="muted">{error || "Cargando lista..."}</p>
      </RoleGate>
    );
  }

  const election = portal.election;
  const lista = portal.lists[0];

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
        className="votaciones-member"
        style={{
          ["--election-primary" as string]: election.primary_color,
          ["--election-secondary" as string]: election.secondary_color,
        }}
      >
        <Link className="votaciones-back" href="/mi-espacio/votaciones">
          ← Volver a listas
        </Link>
        {error ? (
          <div className="action-alert action-alert-error">
            <span>{error}</span>
          </div>
        ) : null}
        <div className="votaciones-member-detail">
          <ListMemberPreview
            election={election}
            listNumber={lista.sort_order || 1}
            lista={lista}
            mode="member"
            voteDisabled={!portal.can_vote}
            onVote={() => (election.confirm_vote ? setConfirming(true) : void vote())}
          />
        </div>
        <footer className="votaciones-vote-bar">
          <CompareLists currentId={lista.id} />
          {election.allow_blank_vote && portal.can_vote ? (
            <button className="secondary-button" onClick={() => void vote(true)} type="button">
              Voto en blanco
            </button>
          ) : null}
        </footer>
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

function CompareLists({ currentId }: { currentId: number }) {
  const [ids, setIds] = useState<number[]>([]);
  useEffect(() => {
    const token = getStoredToken();
    if (!token) return;
    void getMemberPortal(token).then((portal) => setIds(portal.lists.map((item) => item.id)));
  }, []);
  const other = ids.find((id) => id !== currentId);
  if (!other) return null;
  return (
    <Link className="secondary-button" href={`/mi-espacio/votaciones/listas/${other}`}>
      Comparar otra lista
    </Link>
  );
}
