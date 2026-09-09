"use client";

import { useMemo } from "react";

import { memberPhotoSrc } from "@/modules/members/domain/types";

interface MemberPhotoFieldProps {
  currentFotoId: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
}

export function MemberPhotoField({ currentFotoId, file, onFileChange }: MemberPhotoFieldProps) {
  const preview = useMemo(() => {
    if (file) {
      return URL.createObjectURL(file);
    }

    return memberPhotoSrc(currentFotoId);
  }, [currentFotoId, file]);

  return (
    <label
      className="photo-dropzone"
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
        <img alt="Foto de perfil" className="photo-dropzone-preview" src={preview} />
      ) : (
        <span className="photo-dropzone-icon" aria-hidden>
          ↑
        </span>
      )}
      <strong>Foto de perfil</strong>
      <span>Arrastra o presiona sobre el cuadro para subir la imagen</span>
    </label>
  );
}
