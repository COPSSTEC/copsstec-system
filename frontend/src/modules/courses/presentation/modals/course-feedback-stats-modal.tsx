"use client";

import { useEffect, useState } from "react";

import type { FeedbackStats } from "@/modules/courses/domain/types";
import { getFeedbackStats } from "@/modules/courses/infrastructure/courses-api";
import { FeedbackBarChart, FeedbackDonut, scoreCounts } from "@/modules/courses/presentation/components/feedback-charts";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";

const DIMENSIONS = [
  { key: "rating", label: "Calificación general" },
  { key: "content_rating", label: "Contenido" },
  { key: "instructor_rating", label: "Capacitador" },
  { key: "platform_rating", label: "Logística o plataforma" },
] as const;

interface CourseFeedbackStatsModalProps {
  courseId: number;
  courseTitle: string;
  token: string;
  onClose: () => void;
  onDownload: (format: "csv" | "pdf") => void;
}

function donutTone(percent: number): "success" | "warning" | "danger" | "primary" {
  if (percent >= 70) {
    return "success";
  }
  if (percent >= 40) {
    return "warning";
  }
  if (percent > 0) {
    return "danger";
  }
  return "primary";
}

export function CourseFeedbackStatsModal({
  courseId,
  courseTitle,
  token,
  onClose,
  onDownload,
}: CourseFeedbackStatsModalProps) {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        setStats(await getFeedbackStats(token, courseId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar las estadísticas.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadStats();
  }, [courseId, token]);

  const averagePercent = stats?.averages.rating == null ? 0 : (stats.averages.rating / 5) * 100;

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="card feedback-stats-dialog" role="dialog">
        <header className="course-modal-head">
          <div className="course-modal-title">
            <span className="course-modal-icon">
              <CourseUiIcon name="barChart" />
            </span>
            <div>
              <h2>Satisfacción del curso</h2>
              <p className="muted">{courseTitle}. Resultados agregados, sin identificar a quienes calificaron.</p>
            </div>
          </div>
          <button className="icon-ghost-button" onClick={onClose} type="button">
            <CourseUiIcon name="close" />
          </button>
        </header>

        {isLoading ? <p className="muted">Cargando estadísticas...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        {stats && stats.responses === 0 ? (
          <p className="muted">Aún no hay respuestas. Envía la encuesta a los asistentes para ver cómo se recibió el curso.</p>
        ) : null}

        {stats && stats.responses > 0 ? (
          <>
            <section className="feedback-stats-donuts">
              <FeedbackDonut
                center={`${stats.responses}`}
                hint={`${stats.surveys_sent} enviadas`}
                label="Respuestas"
                percent={stats.response_rate}
                tone={donutTone(stats.response_rate)}
              />
              <FeedbackDonut
                center={`${stats.response_rate}%`}
                hint={`${stats.attendees} asistentes`}
                label="Tasa de respuesta"
                percent={stats.response_rate}
                tone={donutTone(stats.response_rate)}
              />
              <FeedbackDonut
                center={`${stats.satisfaction_rate}%`}
                hint="Calificaciones 4 y 5"
                label="Satisfacción"
                percent={stats.satisfaction_rate}
                tone={donutTone(stats.satisfaction_rate)}
              />
              <FeedbackDonut
                center={stats.averages.rating === null ? "—" : stats.averages.rating.toFixed(1)}
                hint="Sobre 5"
                label="Promedio general"
                percent={averagePercent}
                tone="primary"
              />
            </section>

            <section className="feedback-stats-bars">
              {DIMENSIONS.map((dimension) => (
                <FeedbackBarChart
                  average={stats.averages[dimension.key]}
                  counts={scoreCounts(stats.distributions[dimension.key])}
                  key={dimension.key}
                  title={dimension.label}
                />
              ))}
            </section>

            <section className="feedback-stats-comments">
              <h3>Comentarios anónimos</h3>
              {stats.comments.length === 0 ? (
                <p className="muted">No hay comentarios escritos.</p>
              ) : (
                <ul>
                  {stats.comments.map((comment, index) => (
                    <li key={`${index}-${comment.slice(0, 24)}`}>{comment}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}

        <footer className="feedback-stats-actions">
          <button className="secondary-button" disabled={!stats} onClick={() => onDownload("csv")} type="button">
            <CourseUiIcon name="download" />
            Descargar CSV
          </button>
          <button className="secondary-button" disabled={!stats} onClick={() => onDownload("pdf")} type="button">
            <CourseUiIcon name="download" />
            Descargar PDF
          </button>
          <button className="primary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
