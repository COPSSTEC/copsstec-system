"use client";

import { useMemo } from "react";

import { blogCoverSrc } from "@/modules/blogs/domain/types";

interface BlogCoverFieldProps {
  currentImage: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function BlogCoverField({ currentImage, file, onFileChange }: BlogCoverFieldProps) {
  const preview = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }

    return blogCoverSrc(currentImage);
  }, [currentImage, file]);

  return (
    <section className="blog-files-panel">
      <h3>Archivos</h3>
      <p className="muted">{preview ? "Portada del blog" : "Primero sube una imagen"}</p>
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
          <img alt="Portada del blog" className="photo-dropzone-preview" src={preview} />
        ) : (
          <span className="photo-dropzone-icon" aria-hidden>
            ↑
          </span>
        )}
      </label>
    </section>
  );
}
