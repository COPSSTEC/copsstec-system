import type { User } from "@/modules/auth";

interface ProfileSummaryProps {
  user: User;
}

export function ProfileSummary({ user }: ProfileSummaryProps) {
  if (user.profile === null) {
    return (
      <section className="card card-muted">
        <h2>Perfil pendiente</h2>
        <p className="muted">
          Este usuario aún no tiene un registro asociado en la tabla profiles.
        </p>
      </section>
    );
  }

  return (
    <section className="card card-muted">
      <h2>Resumen de perfil</h2>
      <div className="profile-list">
        <div className="profile-item">
          <span>Nombre completo</span>
          <strong>
            {user.profile.names} {user.profile.lastname}
          </strong>
        </div>
        <div className="profile-item">
          <span>Identificación</span>
          <strong>{user.profile.identifier}</strong>
        </div>
        <div className="profile-item">
          <span>Teléfono</span>
          <strong>{user.profile.mobile_phone}</strong>
        </div>
        <div className="profile-item">
          <span>Nivel académico</span>
          <strong>{user.profile.level_academic}</strong>
        </div>
      </div>
    </section>
  );
}
