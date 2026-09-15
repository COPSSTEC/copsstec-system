"use client";

import { FormEvent } from "react";

import type { AdminBlog, BlogFormInput } from "@/modules/blogs/domain/types";
import { BlogCoverField } from "@/modules/blogs/presentation/components/blog-cover-field";
import { TextEditor } from "@/shared/components/text-editor";

interface BlogFormModalProps {
  blog: AdminBlog | null;
  form: BlogFormInput;
  coverFile: File | null;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (field: keyof BlogFormInput, value: string | number) => void;
  onCoverChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function BlogFormModal({
  blog,
  form,
  coverFile,
  error,
  isSubmitting,
  onClose,
  onChange,
  onCoverChange,
  onSubmit,
}: BlogFormModalProps) {
  return (
    <div className="modal-backdrop blog-sheet-backdrop">
      <form className="blog-form-sheet" onSubmit={onSubmit}>
        <header className="blog-form-sheet-header">
          <h2>{blog ? "Editar blog" : "Crear blog"}</h2>
          <button aria-label="Cerrar" className="blog-form-close" onClick={onClose} type="button">
            ×
          </button>
        </header>

        {error ? <p className="form-error">{error}</p> : null}

        <label className="blog-title-field">
          <span className="sr-only">Título del blog</span>
          <input
            onChange={(event) => onChange("title", event.target.value)}
            placeholder="Título del blog"
            required
            value={form.title}
          />
        </label>

        <TextEditor
          id={blog ? `blog-editor-${blog.id}` : "blog-editor-new"}
          onChange={(value) => onChange("description", value)}
          value={form.description}
        />

        <BlogCoverField
          currentImage={blog?.image ?? ""}
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
