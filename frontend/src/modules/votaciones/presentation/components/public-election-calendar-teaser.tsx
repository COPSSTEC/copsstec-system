"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { formatDate, type Election } from "@/modules/votaciones/domain/types";
import { getPublicCalendar } from "@/modules/votaciones/infrastructure/elections-api";

export function PublicElectionCalendarTeaser() {
  const [election, setElection] = useState<Election | null>(null);

  useEffect(() => {
    void getPublicCalendar()
      .then((payload) => {
        if (payload.public) {
          setElection(payload.election);
        }
      })
      .catch(() => undefined);
  }, []);

  if (!election) {
    return null;
  }

  return (
    <section className="votaciones-landing-teaser">
      <div>
        <p>Proceso electoral</p>
        <h2>{election.title}</h2>
        <p>Votación del {formatDate(election.voting_starts_on)} al {formatDate(election.voting_ends_on)}</p>
      </div>
      <Link className="primary-button" href="/calendario-electoral">
        Ver calendario electoral
      </Link>
    </section>
  );
}
