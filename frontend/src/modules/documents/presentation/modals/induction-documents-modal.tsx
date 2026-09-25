"use client";

import { useState } from "react";

import { documentFileSrc } from "@/modules/documents/domain/types";
import { DocumentCoverPreview } from "@/modules/documents/presentation/components/document-cover-preview";

interface InductionDocument {
  document_key: string;
  title: string;
  file_path: string | null;
  available?: boolean;
  original_filename?: string | null;
  cover_path?: string | null;
  overlay_color?: string | null;
  overlay_opacity?: number | null;
}

interface InductionDocumentsModalProps {
  documents: InductionDocument[];
  onClose: () => void;
}

export function InductionDocumentsModal({ documents, onClose }: InductionDocumentsModalProps) {
  const [index, setIndex] = useState(0);
  const current = documents[index];
  const href = current ? documentFileSrc(current.file_path) : null;
  const coverSrc = current ? documentFileSrc(current.cover_path) : null;

  function go(delta: number) {
    if (documents.length === 0) {
      return;
    }
    setIndex((value) => (value + delta + documents.length) % documents.length);
  }

  return (
    <div className="modal-backdrop induction-modal-backdrop" onClick={onClose} role="presentation">
      <section className="induction-modal" onClick={(event) => event.stopPropagation()}>
        <header className="induction-modal-header">
          <div>
            <h2>Bienvenido a COPSSTEC</h2>
            <p className="muted">Conoce más de nuestro colegio y descarga los documentos oficiales.</p>
          </div>
          <button aria-label="Cerrar" className="blog-form-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {current ? (
          <article className="induction-slide">
            <DocumentCoverPreview
              coverSrc={coverSrc}
              documentKey={current.document_key}
              href={href}
              overlayColor={current.overlay_color}
              overlayOpacity={current.overlay_opacity}
              title={current.title}
            />
          </article>
        ) : (
          <p className="muted">Los documentos institucionales se publicarán pronto.</p>
        )}

        <footer className="induction-modal-nav">
          <button aria-label="Anterior" className="induction-nav-button" onClick={() => go(-1)} type="button">
            ←
          </button>
          <div className="induction-dots">
            {documents.map((item, itemIndex) => (
              <button
                aria-label={item.title}
                className={`induction-dot ${itemIndex === index ? "is-active" : ""}`}
                key={item.document_key}
                onClick={() => setIndex(itemIndex)}
                type="button"
              />
            ))}
          </div>
          <button aria-label="Siguiente" className="induction-nav-button" onClick={() => go(1)} type="button">
            →
          </button>
        </footer>
      </section>
    </div>
  );
}
