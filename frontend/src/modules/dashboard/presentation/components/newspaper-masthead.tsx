interface NewspaperMastheadProps {
  userName: string;
  onOpenDocuments: () => void;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("es-EC", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function NewspaperMasthead({ userName, onOpenDocuments }: NewspaperMastheadProps) {
  return (
    <header className="newspaper-masthead">
      <p className="newspaper-kicker">Colegio Profesional de SST del Ecuador</p>
      <div className="newspaper-masthead-row">
        <div>
          <h1>El Boletín COPSSTEC</h1>
          <p className="newspaper-date">{todayLabel()}</p>
        </div>
        <button className="secondary-button" onClick={onOpenDocuments} type="button">
          Documentos del colegio
        </button>
      </div>
      <p className="newspaper-greeting">
        Bienvenido, <strong>{userName}</strong>. Esta es la edición de hoy para ti.
      </p>
    </header>
  );
}
