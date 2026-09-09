interface AppLogoProps {
  compact?: boolean;
}

export function AppLogo({ compact = false }: AppLogoProps) {
  return (
    <div className="app-logo">
      <div className="app-logo-mark">CS</div>
      {!compact && (
        <div>
          <span className="app-logo-title">COPSSTEC</span>
          <span className="app-logo-subtitle">Sistema administrativo</span>
        </div>
      )}
    </div>
  );
}
