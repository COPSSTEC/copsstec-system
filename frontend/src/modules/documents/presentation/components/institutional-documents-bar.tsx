import {
  documentDownloadName,
  documentFileSrc,
  type MemberDocument,
} from "@/modules/documents/domain/types";

interface InstitutionalDocumentsBarProps {
  documents: MemberDocument[];
  onOpenModal: () => void;
}

export function InstitutionalDocumentsBar({
  documents,
  onOpenModal,
}: InstitutionalDocumentsBarProps) {
  return (
    <section className="newspaper-documents">
      <div>
        <p className="eyebrow">Archivo del colegio</p>
        <h2>Documentos oficiales</h2>
      </div>
      <div className="newspaper-documents-actions">
        {documents.map((document) => {
          const href = documentFileSrc(document.file_path);
          if (!href) {
            return (
              <button className="secondary-button" disabled key={document.document_key} type="button">
                {document.title}
              </button>
            );
          }
          return (
            <a
              className="secondary-button button-link"
              download={documentDownloadName(document)}
              href={href}
              key={document.document_key}
            >
              {document.title}
            </a>
          );
        })}
        <button className="create-button" onClick={onOpenModal} type="button">
          Documentos del colegio
        </button>
      </div>
    </section>
  );
}
