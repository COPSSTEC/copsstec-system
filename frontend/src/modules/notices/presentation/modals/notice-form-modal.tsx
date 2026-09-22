"use client";

import { FormEvent } from "react";

import type { AdminNotice, NoticeFormInput, NoticeImportance } from "@/modules/notices/domain/types";
import { NoticeCoverField } from "@/modules/notices/presentation/components/notice-cover-field";
import { TextEditor } from "@/shared/components/text-editor";

interface NoticeFormModalProps {
  notice: AdminNotice | null;
  form: NoticeFormInput;
  coverFile: File | null;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (field: keyof NoticeFormInput, value: string | number) => void;
  onCoverChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function NoticeFormModal({
  notice,
  form,
  coverFile,
  error,
  isSubmitting,
  onClose,
  onChange,
  onCoverChange,
  onSubmit,
}: NoticeFormModalProps) {
  return (
    <div className="modal-backdrop blog-sheet-backdrop">
      <form className="blog-form-sheet" onSubmit={onSubmit}>
        <header className="blog-form-sheet-header">
          <h2>{notice ? "Editar aviso" : "Crear aviso"}</h2>
          <button aria-label="Cerrar" className="blog-form-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {error ? <p className="form-error">{error}</p> : null}

        <label className="blog-title-field">
          <span className="sr-only">Título del aviso</span>
          <input
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Título del aviso"
            required
            value={form.title}
          />
        </label>

        <div className="notice-form-meta">
          <label>
            Importancia
            <select
              onChange={(event) => onChange("importance", event.target.value as NoticeImportance)}
              value={form.importance}
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </label>
          <label>
            Publicar el
            <input
              onChange={(event) => onChange("published_at", event.target.value)}
              type="datetime-local"
              value={form.published_at}
            />
          </label>
        </div>
        <p className="muted notice-form-hint">
          Si dejas la fecha vacía, el aviso se publica de inmediato al quedar visible.
        </p>

        <TextEditor
          id={notice ? `notice-editor-${notice.id}` : "notice-editor-new"}
          onChange={(value) => onChange("description", value)}
          value={form.description}
        />

        <NoticeCoverField
          currentImage={notice?.image ?? ""}
          file={coverFile}
          onFileChange={onCoverChange}
        />

        <div className="blog-form-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="create-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
