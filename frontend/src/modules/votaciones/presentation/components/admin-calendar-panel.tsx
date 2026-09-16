"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  CALENDAR_EVENT_COLORS,
  ELECTION_STATUS_LABELS,
  calendarEventDate,
  formatCronogramaDate,
  formatMonthYear,
  isSingleDateCalendarEvent,
  type CalendarEvent,
  type Election,
} from "@/modules/votaciones/domain/types";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export function AdminCalendarPanel({
  admin,
  election,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
}) {
  const [events, setEvents] = useState(election.calendar);
  const [editing, setEditing] = useState(false);
  const [cursor, setCursor] = useState(() => monthFrom(election.voting_starts_on) ?? monthFrom(firstDatedEvent(election.calendar)) ?? new Date());

  useEffect(() => {
    setEvents(election.calendar);
  }, [election.calendar]);

  const voting = events.find((item) => item.event_key === "votacion");
  const termStart = events.find((item) => item.event_key === "inicio_gestion");
  const termEnd = events.find((item) => item.event_key === "fin_gestion");
  const termStartDate = termStart ? calendarEventDate(termStart).start : election.term_starts_on;
  const termEndDate = termEnd ? calendarEventDate(termEnd).start : election.term_ends_on;
  const grid = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);

  function patchEvent(eventKey: string, field: "starts_on" | "ends_on", value: string) {
    setEvents((current) =>
      current.map((item) => {
        if (item.event_key !== eventKey) {
          return item;
        }
        if (field === "starts_on" && isSingleDateCalendarEvent(item.event_key)) {
          return { ...item, starts_on: value || null, ends_on: null };
        }
        return { ...item, [field]: value || null };
      }),
    );
  }

  async function save() {
    const payload = events.map((item) => {
      if (!isSingleDateCalendarEvent(item.event_key)) {
        return item;
      }
      return { ...item, starts_on: calendarEventDate(item).start, ends_on: null };
    });
    await admin.saveCalendarEvents(payload);
    setEditing(false);
  }

  return (
    <section className="votaciones-calendar">
      <div className="votaciones-cal-kpis">
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">{kpiIcon("calendar")}</span>
          <div>
            <p>Elecciones en</p>
            <strong>{formatMonthYear(voting?.starts_on || election.voting_starts_on)}</strong>
            <small>{election.title}</small>
          </div>
        </article>
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">{kpiIcon("clock")}</span>
          <div>
            <p>Periodo de votación</p>
            <strong>
              {formatCronogramaDate(voting?.starts_on || election.voting_starts_on, voting?.ends_on || election.voting_ends_on)}
            </strong>
            <small>Votación en línea para miembros habilitados</small>
          </div>
        </article>
        <article>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">{kpiIcon("users")}</span>
          <div>
            <p>Periodo de gestión de la Directiva</p>
            <strong>
              {formatMonthYear(termStartDate)}
              {" - "}
              {formatMonthYear(termEndDate)}
            </strong>
            <small>{managementYears(termStartDate, termEndDate)}</small>
          </div>
        </article>
        <article className={`votaciones-cal-status ${election.calendar_public ? "is-public" : ""}`}>
          <span className="votaciones-cal-kpi-icon" aria-hidden="true">{kpiIcon("clock")}</span>
          <div>
            <strong>{ELECTION_STATUS_LABELS[election.status]}</strong>
            <small>{election.calendar_public ? "Calendario publicado" : "Calendario no publicado"}</small>
          </div>
        </article>
      </div>

      <div className="votaciones-calendar-grid">
        <section className="votaciones-cronograma-card">
          <header>
            <div>
              <h2>Cronograma del proceso electoral</h2>
              <p>Fases y fechas importantes del proceso</p>
            </div>
          </header>
          <ol className="votaciones-timeline">
            {events.map((event, index) => {
              const resolved = calendarEventDate(event);
              const color = CALENDAR_EVENT_COLORS[event.event_key] || "var(--primary)";
              const scheduled = Boolean(resolved.start);
              return (
                <li key={event.event_key}>
                  <span style={{ background: color }}>{index + 1}</span>
                  <div className="votaciones-timeline-body">
                    <div className="votaciones-timeline-copy">
                      <i style={{ color }} aria-hidden="true">{eventIcon(event.event_key)}</i>
                      <strong>{event.title}</strong>
                      <em>{formatCronogramaDate(resolved.start, resolved.end, resolved.single)}</em>
                      <small className={scheduled ? "is-ready" : ""}>{scheduled ? "Programado" : "Pendiente"}</small>
                    </div>
                    {editing ? (
                      <div className="votaciones-timeline-dates">
                        <label>
                          {resolved.single ? "Fecha" : "Inicio"}
                          <input
                            disabled={election.is_readonly}
                            onChange={(change) => patchEvent(event.event_key, "starts_on", change.target.value)}
                            type="date"
                            value={resolved.start ?? ""}
                          />
                        </label>
                        {resolved.single ? null : (
                          <label>
                            Fin
                            <input
                              disabled={election.is_readonly}
                              onChange={(change) => patchEvent(event.event_key, "ends_on", change.target.value)}
                              type="date"
                              value={event.ends_on ?? ""}
                            />
                          </label>
                        )}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="votaciones-cal-aside">
          <div className="votaciones-mini-cal">
            <header>
              <strong>
                {(() => {
                  const label = cursor.toLocaleDateString("es-EC", { month: "long", year: "numeric" });
                  return label.charAt(0).toUpperCase() + label.slice(1);
                })()}
              </strong>
              <div>
                <button onClick={() => setCursor(shiftMonth(cursor, -1))} type="button" aria-label="Mes anterior">
                  ‹
                </button>
                <button onClick={() => setCursor(shiftMonth(cursor, 1))} type="button" aria-label="Mes siguiente">
                  ›
                </button>
              </div>
            </header>
            <div className="votaciones-mini-cal-weekdays">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>
            <div className="votaciones-mini-cal-days">
              {grid.map((cell, index) => {
                if (!cell) {
                  return <span key={`empty-${index}`} />;
                }
                const marks = eventsForDay(events, cell.iso);
                const primary = marks[0];
                return (
                  <span
                    className={`votaciones-mini-cal-day${marks.length ? " has-event" : ""}${cell.outside ? " is-outside" : ""}`}
                    key={cell.iso}
                    style={primary ? { background: `${CALENDAR_EVENT_COLORS[primary.event_key]}22`, color: CALENDAR_EVENT_COLORS[primary.event_key] } : undefined}
                    title={marks.map((item) => item.title).join(" · ")}
                  >
                    {cell.day}
                    {marks.length ? (
                      <i>
                        {marks.slice(0, 3).map((item) => (
                          <b key={item.event_key} style={{ background: CALENDAR_EVENT_COLORS[item.event_key] }} />
                        ))}
                      </i>
                    ) : null}
                  </span>
                );
              })}
            </div>
            <div className="votaciones-mini-cal-legend">
              {events.filter((item) => calendarEventDate(item).start).map((item) => (
                <span key={item.event_key}>
                  <b style={{ background: CALENDAR_EVENT_COLORS[item.event_key] }} />
                  {item.title}
                </span>
              ))}
            </div>
            <div className="votaciones-mini-cal-note">
              <strong>Periodo de votación</strong>
              <p>
                {formatCronogramaDate(voting?.starts_on || election.voting_starts_on, voting?.ends_on || election.voting_ends_on)}
              </p>
              <p>Los miembros habilitados podrán emitir su voto en este periodo.</p>
            </div>
          </div>
          <div className="votaciones-actions-stack">
            <p>Acciones</p>
            {editing ? (
              <button className="primary-button" disabled={election.is_readonly || admin.isMutating} onClick={() => void save()} type="button">
                Guardar calendario
              </button>
            ) : (
              <button className="primary-button" disabled={election.is_readonly} onClick={() => setEditing(true)} type="button">
                Editar calendario
              </button>
            )}
            <button className="secondary-button" disabled={election.is_readonly} onClick={() => void admin.toggleCalendarPublic(!election.calendar_public)} type="button">
              {election.calendar_public ? "Ocultar calendario" : "Publicar calendario"}
            </button>
            <button className="secondary-button" onClick={() => void admin.downloadCronograma()} type="button">
              Descargar cronograma
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}

function firstDatedEvent(events: CalendarEvent[]): string | null {
  return events.find((item) => item.starts_on)?.starts_on ?? null;
}

function monthFrom(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const [year, month] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month) {
    return null;
  }
  return new Date(year, month - 1, 1);
}

function shiftMonth(value: Date, delta: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function managementYears(start: string | null | undefined, end: string | null | undefined): string {
  if (!start || !end) {
    return "Periodo de gestión";
  }
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  const years = endYear - startYear;
  if (years <= 0) {
    return "Periodo de gestión";
  }
  return `${years} año${years === 1 ? "" : "s"} de gestión`;
}

function eventsForDay(events: CalendarEvent[], iso: string): CalendarEvent[] {
  return events.filter((item) => {
    const resolved = calendarEventDate(item);
    if (!resolved.start) {
      return false;
    }
    const end = resolved.single || !resolved.end ? resolved.start : resolved.end;
    return iso >= resolved.start && iso <= end;
  });
}

function buildMonthGrid(year: number, month: number): Array<{ day: number; iso: string; outside: boolean } | null> {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number; iso: string; outside: boolean } | null> = Array.from({ length: startPad }, () => null);
  for (let day = 1; day <= days; day += 1) {
    cells.push({
      day,
      iso: `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      outside: false,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

function kpiIcon(name: "calendar" | "clock" | "users") {
  if (name === "clock") {
    return (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
        <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16 11a3 3 0 100-6 3 3 0 000 6zM4 19a4 4 0 018 0M12 19a4 4 0 018 0" />
      </svg>
    );
  }
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <rect height="16" rx="2" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function eventIcon(eventKey: string) {
  const icons: Record<string, ReactNode> = {
    convocatoria: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M4 10v4h3l5 4V6L7 10H4zM16 9a4 4 0 010 6" />
      </svg>
    ),
    inscripcion_listas: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M8 6h11M8 12h11M8 18h11M5 6h.01M5 12h.01M5 18h.01" />
      </svg>
    ),
    revision_listas: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <circle cx="11" cy="11" r="6" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
    publicacion_listas: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
    campana: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16.5 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4 19a4 4 0 018 0M14 19a3.5 3.5 0 016 0" />
      </svg>
    ),
    votacion: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M4 10h16v9H4zM8 10V7l4-3 4 3v3" />
      </svg>
    ),
    escrutinio: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M4 19h16M7 16V10M12 16V6M17 16v-4" />
      </svg>
    ),
    inicio_gestion: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M12 4l2.2 4.6L19 9.2l-3.5 3.4.8 4.9L12 15.8 7.7 17.5l.8-4.9L5 9.2l4.8-.6L12 4z" />
      </svg>
    ),
    fin_gestion: (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M5 21V4h9l-1 4 1 4H5" />
      </svg>
    ),
  };
  return icons[eventKey] ?? icons.convocatoria;
}
