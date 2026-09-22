"use client";

import { useMemo } from "react";

import { noticeCoverSrc } from "@/modules/notices/domain/types";

interface NoticeCoverFieldProps {
  currentImage: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function NoticeCoverField({ currentImage, file, onFileChange }: NoticeCoverFieldProps) {
  const preview = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }
    return noticeCoverSrc(currentImage);
  }, [currentImage, file]);

  return (
    <section className="blog-files-panel">
      <h3>Archivos</h3>
      <p className="muted">{preview ? "Portada del aviso" : "Primero sube una imagen"}</p>
      <label
        className="photo-dropzone blog-cover-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onFileChange(event.dataTransfer.files[0] ?? null);
        }}
      >
        <input
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
          type="file"
        />
        {preview ? (
          <img alt="Portada del aviso" className="photo-dropzone-preview" src={preview} />
        ) : (
          <span className="photo-dropzone-icon" aria-hidden>
            ↑
          </span>
        )}
      </label>
    </section>
  );
}
