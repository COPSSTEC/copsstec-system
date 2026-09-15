"use client";

import { Editor } from "@tinymce/tinymce-react";
import { useEffect, useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_TINYMCE_API_KEY ?? "";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function TextEditor({ value, onChange, disabled = false, id }: TextEditorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!API_KEY) {
    return (
      <div className="text-editor-fallback">
        <p className="form-error">
          Falta configurar NEXT_PUBLIC_TINYMCE_API_KEY en el entorno del frontend.
        </p>
        <textarea
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          rows={12}
          value={value}
        />
      </div>
    );
  }

  if (!mounted) {
    return <div className="text-editor-placeholder">Cargando editor...</div>;
  }

  return (
    <div className="text-editor" onClick={(event) => event.stopPropagation()}>
      <Editor
        apiKey={API_KEY}
        disabled={disabled}
        id={id}
        init={{
          height: 360,
          menubar: true,
          branding: false,
          plugins: [
            "preview",
            "importcss",
            "autosave",
            "save",
            "autolink",
            "lists",
            "table",
            "link",
            "charmap",
            "wordcount",
          ],
          toolbar:
            "undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | alignleft aligncenter alignright | bullist numlist outdent indent",
          content_style: `
            body {
              font-family: Arial, Helvetica, sans-serif;
              font-size: 16px;
              line-height: 1.6;
              pointer-events: auto !important;
            }
          `,
        }}
        onEditorChange={(content) => onChange(content)}
        value={value}
      />
    </div>
  );
}
