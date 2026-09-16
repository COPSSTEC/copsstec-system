"use client";

import { useEffect, useState } from "react";

import { formatDate, type Election } from "@/modules/votaciones/domain/types";
import { getPublicCalendar, publicCalendarDownloadUrl } from "@/modules/votaciones/infrastructure/elections-api";
import { PublicFooter } from "@/shared/components/public-footer";

export function PublicElectionCalendarPage() {
  const [election, setElection] = useState<Election | null>(null);
  const [visible, setVisible] = useState<boolean | null>(null);

  useEffect(() => {
    void getPublicCalendar()
      .then((payload) => {
        setVisible(payload.public);
        setElection(payload.election);
      })
      .catch(() => setVisible(false));
  }, []);

  return (
    <main className="votaciones-public">
      <section className="card">
        <h1>Calendario electoral</h1>
        {visible === false || !election ? (
          <p>El cronograma electoral no está publicado en este momento.</p>
        ) : (
          <>
            <p>{election.title}</p>
            <p>Votación: {formatDate(election.voting_starts_on)} - {formatDate(election.voting_ends_on)}</p>
            <ol className="votaciones-timeline">
              {election.calendar.map((event, index) => (
                <li key={event.event_key}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <p>{formatDate(event.starts_on)}{event.ends_on ? ` - ${formatDate(event.ends_on)}` : ""}</p>
                  </div>
                </li>
              ))}
            </ol>
            <a className="primary-button" href={publicCalendarDownloadUrl()}>
              Descargar cronograma
            </a>
          </>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
