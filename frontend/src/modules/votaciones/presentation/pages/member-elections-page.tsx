"use client";

import { useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { RoleGate } from "@/shared/components/role-gate";
import { type MemberPortal } from "@/modules/votaciones/domain/types";
import { getMemberPortal } from "@/modules/votaciones/infrastructure/elections-api";
import { MemberElectionShowcase } from "@/modules/votaciones/presentation/components/member-election-showcase";

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

  return (
    <RoleGate requiredAccess="member">
      <section className="votaciones-member">
        {error ? (
          <div className="action-alert action-alert-error">
            <span>{error}</span>
          </div>
        ) : null}
        <MemberElectionShowcase
          canVote={portal.can_vote}
          election={portal.election}
          hasVoted={portal.has_voted}
          lists={portal.lists}
          notices={portal.notices}
          variant="live"
          votingEnabled={portal.voting_enabled}
        />
      </section>
    </RoleGate>
  );
}
