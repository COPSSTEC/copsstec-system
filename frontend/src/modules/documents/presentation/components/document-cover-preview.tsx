import { documentCoverStyle } from "@/modules/documents/presentation/lib/document-cover";

interface DocumentCoverPreviewProps {
  title: string;
  documentKey: string;
  coverSrc: string | null;
  overlayColor?: string | null;
  overlayOpacity?: number | null;
  href?: string | null;
  compact?: boolean;
}

export function DocumentCoverPreview({
  title,
  documentKey,
  coverSrc,
  overlayColor,
  overlayOpacity,
  href,
  compact = false,
}: DocumentCoverPreviewProps) {
  return (
    <div
      className={`induction-cover induction-cover-${documentKey} ${coverSrc ? "has-image" : ""} ${compact ? "is-preview" : ""}`}
      style={documentCoverStyle(coverSrc, overlayColor, overlayOpacity)}
    >
      <h3>{title}</h3>
      {href ? (
        compact ? (
          <span className="create-button">Descargar</span>
        ) : (
          <a className="create-button button-link" download={`${title}.pdf`} href={href}>
            Descargar
          </a>
        )
      ) : (
        <button className="create-button" disabled type="button">
          Pendiente de publicación
        </button>
      )}
    </div>
  );
}
