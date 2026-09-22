"use client";

import { useState } from "react";

import {
  documentDownloadName,
  documentFileSrc,
  type MemberDocument,
} from "@/modules/documents/domain/types";

interface InductionDocumentsModalProps {
  documents: MemberDocument[];
  onClose: () => void;
}

export function InductionDocumentsModal({ documents, onClose }: InductionDocumentsModalProps) {
  const [index, setIndex] = useState(0);
  const current = documents[index];
  const href = current ? documentFileSrc(current.file_path) : null;

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
            <div className={`induction-cover induction-cover-${current.document_key}`}>
              <p className="eyebrow">Documento institucional</p>
              <h3>{current.title}</h3>
              {href ? (
                <a
                  className="create-button button-link"
                  download={documentDownloadName(current)}
                  href={href}
                >
                  Descargar
                </a>
              ) : (
                <button className="create-button" disabled type="button">
                  Pendiente de publicación
                </button>
              )}
            </div>
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
