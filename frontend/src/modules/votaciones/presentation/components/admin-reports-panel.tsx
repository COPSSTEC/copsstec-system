"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import {
  ELECTION_STATUS_LABELS,
  calendarEventDate,
  formatDate,
  mediaUrl,
  type Election,
  type ElectionReport,
  type ElectionStatus,
  type ReportRow,
  type ReportTimeline,
} from "@/modules/votaciones/domain/types";
import { useAdminElection } from "@/modules/votaciones/presentation/hooks/use-admin-election";

const BAR_FALLBACKS = ["#2563eb", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];
const BLANK_COLOR = "#1e293b";
const QUORUM_PCT = 50;
const MONTHS = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sept.", "oct.", "nov.", "dic."];

export function AdminReportsPanel({
  admin,
  election,
}: {
  admin: ReturnType<typeof useAdminElection>;
  election: Election;
}) {
  const report = admin.report;
  if (!report) {
    return <p className="muted">Cargando reportes...</p>;
  }

  const voting = election.calendar.find((item) => item.event_key === "votacion");
  const votingStart = voting ? calendarEventDate(voting).start : election.voting_starts_on;
  const votingEnd = voting?.ends_on || election.voting_ends_on;
  const listRows = report.rows.filter((row) => row.list_id !== null);
  const blankRow = report.rows.find((row) => row.list_id === null);
  const chartRows = [...listRows, ...(blankRow ? [blankRow] : [])];
  const maxVotes = Math.max(...chartRows.map((row) => row.votes), 0);
  const axisMax = niceMax(maxVotes);
  const abstention = Math.max(report.eligible - report.votes_cast, 0);
  const abstentionPct = report.eligible ? roundPct((abstention / report.eligible) * 100) : 0;
  const reachedQuorum = report.participation >= QUORUM_PCT;
  const closed = election.status === "cerrada" || election.status === "finalizada";
  const statuses = uniqueStatuses(
    election.status,
    election.periods.map((item) => item.status),
  );

  return (
    <section className="votaciones-reports-page">
      <Link className="votaciones-voters-back" href="/admin/votaciones">
        {chevronLeft()} Volver
      </Link>

      <header className="votaciones-reports-hero">
        <div className="votaciones-voters-hero">
          <span className="votaciones-voters-hero-icon" aria-hidden="true">
            {barsIcon()}
          </span>
          <div>
            <h1>Reportes de votación</h1>
            <p>Analiza los resultados y nivel de participación de la elección del Colegio.</p>
          </div>
        </div>
        <div className="votaciones-reports-exports">
          <button className="votaciones-reports-pdf" onClick={() => void admin.exportPdf()} type="button">
            {fileIcon()} Exportar PDF
          </button>
          <button className="votaciones-reports-xlsx" onClick={() => void admin.exportExcel()} type="button">
            {sheetIcon()} Exportar Excel
          </button>
          <button className="primary-button votaciones-reports-acta" onClick={() => void admin.generateActa()} type="button">
            {stampIcon()} Generar acta
          </button>
        </div>
      </header>

      <div className="votaciones-reports-kpis">
        <KpiCard
          tone="info"
          icon={usersIcon()}
          label="Total de votantes habilitados"
          value={formatCount(report.eligible)}
          hint="Miembros con derecho a voto"
        />
        <KpiCard
          tone="success"
          icon={bagIcon()}
          label="Votos emitidos"
          value={formatCount(report.votes_cast)}
          hint="Total de votos registrados"
        />
        <KpiCard
          tone="purple"
          icon={pieIcon()}
          label="Participación"
          value={`${report.participation.toFixed(1)}%`}
          hint="Del total de habilitados"
        />
        <KpiCard
          tone="sand"
          icon={docIcon()}
          label="Votos en blanco"
          value={formatCount(report.blank_votes)}
          hint={`${report.blank_percentage.toFixed(1)}% del total de votos`}
        />
        <KpiCard
          tone="warning"
          icon={usersIcon()}
          label="Listas participantes"
          value={formatCount(report.lists_count)}
          hint="En esta elección"
        />
      </div>

      <div className="votaciones-reports-toolbar">
        <label>
          <span>{calendarIcon()} Rango de fechas</span>
          <select onChange={(event) => admin.selectPeriod(Number(event.target.value))} value={election.id}>
            {election.periods.map((period) => (
              <option key={period.id} value={period.id}>
                {formatDate(period.voting_starts_on) === "—" && formatDate(period.voting_ends_on) === "—"
                  ? period.title
                  : `${formatDate(period.voting_starts_on)} - ${formatDate(period.voting_ends_on)}`}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Estado de la elección</span>
          <div className={`votaciones-reports-status-field is-${election.status}`}>
            <i />
            <select
              onChange={(event) => {
                const next = election.periods.find((item) => item.status === event.target.value);
                if (next) {
                  admin.selectPeriod(next.id);
                }
              }}
              value={election.status}
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {ELECTION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </label>
        <p>
          {clockIcon()} Última actualización: {formatStamp(report.updated_at) || formatStamp(new Date().toISOString())}
        </p>
      </div>

      <div className="votaciones-reports-grid">
        <section className="votaciones-reports-card">
          <header>
            <span aria-hidden="true">{barsIcon()}</span>
            <div>
              <h2>Votos por lista</h2>
              <p>Total de votos recibidos por cada lista participante.</p>
            </div>
          </header>
          <div className="votaciones-reports-bars">
            <div className="votaciones-reports-yaxis" aria-hidden="true">
              {axisTicks(axisMax).map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
            <div className="votaciones-reports-plot">
              <div className="votaciones-reports-gridlines" aria-hidden="true">
                {axisTicks(axisMax).map((tick) => (
                  <i key={tick} />
                ))}
              </div>
              <div className="votaciones-reports-cols">
                {chartRows.map((row, index) => (
                  <div key={row.list_id ?? "blank"}>
                    <div className="votaciones-reports-col-plot">
                      <strong>{row.votes}</strong>
                      <b
                        style={{
                          height: `${axisMax ? (row.votes / axisMax) * 100 : 0}%`,
                          background: barColor(row, index),
                        }}
                      />
                    </div>
                    <span>{displayName(row)}</span>
                    <small>{row.slogan}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="votaciones-reports-card">
          <header>
            <span aria-hidden="true">{pieIcon()}</span>
            <div>
              <h2>Participación electoral</h2>
              <p>Relación entre votos emitidos y abstención.</p>
            </div>
          </header>
          <div
            className="votaciones-reports-donut"
            style={{ background: `conic-gradient(#2563eb ${report.participation * 3.6}deg, #dbeafe 0)` }}
          >
            <div>
              <strong>{report.participation.toFixed(1)}%</strong>
              <small>Participación</small>
            </div>
          </div>
          <ul className="votaciones-reports-legend">
            <li>
              <i style={{ background: "#2563eb" }} />
              <span>Votos emitidos</span>
              <em>
                {formatCount(report.votes_cast)} ({report.participation.toFixed(1)}%)
              </em>
            </li>
            <li>
              <i style={{ background: "#93c5fd" }} />
              <span>Abstención</span>
              <em>
                {formatCount(abstention)} ({abstentionPct.toFixed(1)}%)
              </em>
            </li>
          </ul>
          <p className={`votaciones-reports-quorum ${reachedQuorum ? "is-ok" : ""}`}>
            {infoIcon()}
            {reachedQuorum
              ? "Se superó el quórum mínimo establecido en el reglamento del Colegio."
              : "Aún no se alcanza el quórum mínimo establecido en el reglamento del Colegio."}
          </p>
        </section>

        <section className="votaciones-reports-card votaciones-reports-table-card">
          <header>
            <span aria-hidden="true">{listIcon()}</span>
            <div>
              <h2>Resultados por lista</h2>
              <p>Detalle de votos y porcentaje obtenido por cada lista.</p>
            </div>
          </header>
          <div className="votaciones-table-wrap">
            <table className="votaciones-table votaciones-reports-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Lista</th>
                  <th>Candidato principal</th>
                  <th>Votos</th>
                  <th>Porcentaje</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {report.rows.map((row, index) => (
                  <tr key={row.list_id ?? "blank"}>
                    <td>{row.list_id ? index + 1 : "-"}</td>
                    <td>
                      <div className="votaciones-reports-list">
                        {row.logo_url ? (
                          <img alt="" src={mediaUrl(row.logo_url)} />
                        ) : (
                          <span style={{ background: barColor(row, index) }} aria-hidden="true">
                            {row.list_id ? displayName(row).slice(0, 1) : docMiniIcon()}
                          </span>
                        )}
                        <div>
                          <strong>{displayName(row)}</strong>
                          {row.slogan ? <small>{row.slogan}</small> : null}
                        </div>
                      </div>
                    </td>
                    <td>{row.list_id ? row.principal_name || "—" : "-"}</td>
                    <td>{formatCount(row.votes)}</td>
                    <td>{row.percentage.toFixed(1)}%</td>
                    <td>
                      <ResultBadge status={row.result_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="votaciones-reports-card votaciones-reports-trace-card">
        <header>
          <div>
            <span aria-hidden="true">{clockIcon()}</span>
            <div>
              <h2>Trazabilidad del proceso</h2>
              <p>Eventos clave y auditoría de la elección.</p>
            </div>
          </div>
          {closed ? (
            <em className="votaciones-reports-done">
              {checkIcon()} Proceso finalizado exitosamente
              <small>Todos los registros han sido validados.</small>
            </em>
          ) : (
            <em className="votaciones-reports-done is-open">
              {clockIcon()} Proceso en curso
              <small>Los resultados se actualizan con cada voto.</small>
            </em>
          )}
        </header>
        <ol className="votaciones-reports-trace">
          {report.timeline.map((item) => (
            <li className={`is-${item.tone} is-${item.key}`} key={item.key}>
              <span aria-hidden="true">{timelineIcon(item)}</span>
              <strong>{item.title}</strong>
              <em>{timelineHeadline(item, report, votingStart, votingEnd)}</em>
              <p>{item.detail}</p>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}

function KpiCard({
  tone,
  icon,
  label,
  value,
  hint,
}: {
  tone: "info" | "success" | "purple" | "sand" | "warning";
  icon: ReactNode;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className={`votaciones-reports-kpi is-${tone}`}>
      <span aria-hidden="true">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

function ResultBadge({ status }: { status: string }) {
  const tone = status === "Ganadora" ? "success" : status === "Participante" ? "info" : "muted";
  return <span className={`votaciones-reports-status is-${tone}`}>{status}</span>;
}

function displayName(row: ReportRow) {
  return row.list_id ? row.name : "Votos en blanco";
}

function barColor(row: ReportRow, index: number) {
  if (!row.list_id) {
    return BLANK_COLOR;
  }
  return row.color || BAR_FALLBACKS[index % BAR_FALLBACKS.length];
}

function niceMax(value: number) {
  if (value <= 0) {
    return 10;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function axisTicks(max: number) {
  return [max, Math.round(max * 0.8), Math.round(max * 0.6), Math.round(max * 0.4), Math.round(max * 0.2), 0];
}

function formatCount(value: number) {
  return value.toLocaleString("es-EC");
}

function roundPct(value: number) {
  return Math.round(value * 10) / 10;
}

function uniqueStatuses(current: ElectionStatus, values: ElectionStatus[]) {
  return [current, ...values.filter((status, index) => status !== current && values.indexOf(status) === index)];
}

function formatStamp(value: string | null | undefined) {
  if (!value) {
    return "";
  }
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hours}:${minutes}`;
}

function timelineHeadline(item: ReportTimeline, report: ElectionReport, votingStart: string | null, votingEnd: string | null) {
  if (item.key === "votos") {
    return `${formatCount(report.votes_cast)} votos`;
  }
  if (item.key === "incidencias") {
    return "0 incidencias";
  }
  if (item.key === "apertura") {
    return formatStamp(item.occurred_at || votingStart);
  }
  if (item.key === "cierre") {
    return formatStamp(item.occurred_at || votingEnd);
  }
  return formatStamp(item.occurred_at) || "Pendiente";
}

function chevronLeft() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function barsIcon() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <path d="M4 19h16M7 16V10M12 16V6M17 16v-4" />
    </svg>
  );
}

function usersIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M8 11a3 3 0 100-6 3 3 0 000 6zM16.5 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4 19a4 4 0 018 0M14 19a3.5 3.5 0 016 0" />
    </svg>
  );
}

function bagIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M8 8V7a4 4 0 018 0v1" />
      <rect height="13" rx="2" width="16" x="4" y="8" />
    </svg>
  );
}

function pieIcon() {
  return (
    <svg fill="none" height="20" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="20">
      <path d="M12 4a8 8 0 108 8h-8V4z" />
      <path d="M12 4a8 8 0 018 8" />
    </svg>
  );
}

function docIcon() {
  return (
    <svg fill="none" height="22" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="22">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M14 4v5h5" />
    </svg>
  );
}

function fileIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M14 4v5h5" />
    </svg>
  );
}

function sheetIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <rect height="14" rx="2" width="16" x="4" y="5" />
      <path d="M4 10h16M10 5v14" />
    </svg>
  );
}

function stampIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      <path d="M9 13h6M9 17h4" />
    </svg>
  );
}

function calendarIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <rect height="16" rx="2" width="16" x="4" y="5" />
      <path d="M8 3v4M16 3v4M4 11h16" />
    </svg>
  );
}

function clockIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5l3 2" />
    </svg>
  );
}

function listIcon() {
  return (
    <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
      <path d="M8 6h11M8 12h11M8 18h11M5 6h.01M5 12h.01M5 18h.01" />
    </svg>
  );
}

function infoIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

function checkIcon() {
  return (
    <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12l3 3 5-6" />
    </svg>
  );
}

function docMiniIcon() {
  return (
    <svg fill="none" height="14" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="14">
      <path d="M7 4h7l5 5v11a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
    </svg>
  );
}

function timelineIcon(item: ReportTimeline) {
  if (item.key === "apertura") {
    return (
      <svg fill="currentColor" height="18" viewBox="0 0 24 24" width="18">
        <path d="M8 6l12 6-12 6V6z" />
      </svg>
    );
  }
  if (item.key === "cierre") {
    return (
      <svg fill="currentColor" height="16" viewBox="0 0 24 24" width="16">
        <rect height="12" rx="2" width="12" x="6" y="6" />
      </svg>
    );
  }
  if (item.key === "incidencias") {
    return (
      <svg fill="none" height="18" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" width="18">
        <path d="M12 4l9 16H3L12 4z" />
        <path d="M12 10v4M12 17h.01" />
      </svg>
    );
  }
  if (item.key === "validacion") {
    return checkIcon();
  }
  return docIcon();
}
