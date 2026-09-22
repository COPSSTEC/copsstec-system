interface RouteLoaderProps {
  label?: string;
}

export function RouteLoader({ label = "Cargando módulo" }: RouteLoaderProps) {
  return (
    <div className="app-route-loader" role="status" aria-live="polite">
      <span className="app-route-spinner" aria-hidden="true" />
      <strong>{label}</strong>
      <small>Preparando el contenido…</small>
    </div>
  );
}
