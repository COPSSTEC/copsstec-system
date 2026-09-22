"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { User } from "@/modules/auth";
import { getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { listMyPayments } from "@/modules/payments/infrastructure/payments-api";
import { isMembershipActive } from "@/modules/payments/presentation/lib/member-payments";
import type { SubscriptionSummary } from "@/modules/payments/domain/types";
import {
  downloadMyCarnet,
  downloadMyCertificate,
  updateMyPhoto,
  updateMyProfile,
  type ProfileSelfUpdate,
} from "@/modules/profile/infrastructure/profile-api";
import { MemberCarnetPreview } from "@/modules/profile/presentation/components/member-carnet-preview";
import { ProfileEditDialog } from "@/modules/profile/presentation/components/profile-edit-dialog";
import { ProfileUiIcon } from "@/modules/profile/presentation/components/profile-ui-icon";
import {
  PROFILE_BENEFITS,
  academicTitle,
  coveragePeriod,
  displayValue,
  formatMonthYear,
  membershipHeadline,
  type ProfileSection,
} from "@/modules/profile/presentation/lib/member-profile";
import { UserAvatar } from "@/shared/components/user-avatar";
import { RoleGate } from "@/shared/components/role-gate";
import { useToast } from "@/shared/hooks/use-toast";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="member-profile-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function ProfilePage() {
  const router = useRouter();
  const toast = useToast();
  const token = useMemo(() => getStoredToken(), []);
  const photoInput = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [section, setSection] = useState<ProfileSection | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (token === null) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        const [current, payments] = await Promise.all([
          getCurrentUser(token as string),
          listMyPayments(token as string).catch(() => null),
        ]);
        setUser(current);
        setSubscription(payments?.subscription ?? null);
      } catch {
        router.replace("/login");
      }
    }

    void load();
  }, [router, token]);

  if (user === null) {
    return <p className="muted">Cargando perfil...</p>;
  }

  if (user.profile === null) {
    return (
      <section className="card profile-heading">
        <UserAvatar name={user.name} size="lg" />
        <div>
          <h1>Perfil pendiente</h1>
          <p className="muted">Tu usuario existe, pero todavía no tiene un perfil asociado.</p>
        </div>
      </section>
    );
  }

  const profile = user.profile;
  const active = user.state_id === 1 && isMembershipActive(subscription?.status);

  async function refreshUser(next: User) {
    setUser(next);
  }

  async function saveSection(data: ProfileSelfUpdate) {
    if (!token) {
      return;
    }
    setIsBusy(true);
    try {
      await refreshUser(await updateMyProfile(token, data));
      setSection(null);
      toast.success("Perfil actualizado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar el perfil.");
    } finally {
      setIsBusy(false);
    }
  }

  async function changePhoto(file: File) {
    if (!token) {
      return;
    }
    setIsBusy(true);
    try {
      await refreshUser(await updateMyPhoto(token, file));
      toast.success("Foto actualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo actualizar la foto.");
    } finally {
      setIsBusy(false);
    }
  }

  async function download(kind: "carnet" | "certificate") {
    if (!token) {
      return;
    }
    setIsBusy(true);
    try {
      if (kind === "carnet") {
        await downloadMyCarnet(token);
      } else {
        await downloadMyCertificate(token);
      }
      toast.success(kind === "carnet" ? "Carnet descargado." : "Certificado descargado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo descargar el documento.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <RoleGate requiredAccess="member">
      <section className="member-profile-page">
        <header className="member-profile-heading">
          <div>
            <h1>Mi perfil</h1>
            <p>Gestiona tu información personal y accede a tus documentos como miembro de COPSSTEC.</p>
          </div>
          <blockquote>
            <ProfileUiIcon name="quote" />
            <span>Profesionales comprometidos por un trabajo seguro en el Ecuador.</span>
          </blockquote>
        </header>

        <div className="member-profile-hero">
          <article className="member-profile-card member-profile-identity">
            <div className="member-profile-identity-top">
              <div className="member-profile-photo">
                <UserAvatar fotoId={profile.foto_id} name={`${profile.names} ${profile.lastname}`} size="lg" />
                <button
                  className="member-profile-camera"
                  disabled={isBusy}
                  onClick={() => photoInput.current?.click()}
                  type="button"
                >
                  <ProfileUiIcon name="camera" />
                </button>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void changePhoto(file);
                    }
                    event.target.value = "";
                  }}
                  ref={photoInput}
                  type="file"
                />
              </div>
              <div>
                <h2>
                  {profile.names} {profile.lastname}
                </h2>
                <p>Miembro COPSSTEC</p>
                <span className={`member-profile-status ${active ? "is-active" : "is-muted"}`}>
                  <i />
                  {active ? "Activo" : membershipHeadline(subscription, user.state_id)}
                </span>
              </div>
            </div>
            <dl>
              <div>
                <ProfileUiIcon name="id" />
                <div>
                  <span>N.° de miembro</span>
                  <strong>{profile.identifier}</strong>
                </div>
              </div>
              <div>
                <ProfileUiIcon name="calendar" />
                <div>
                  <span>Fecha de ingreso</span>
                  <strong>{formatMonthYear(profile.date_register)}</strong>
                </div>
              </div>
              <div>
                <ProfileUiIcon name="shield" />
                <div>
                  <span>Estado</span>
                  <strong>{active ? "Al día" : membershipHeadline(subscription, user.state_id)}</strong>
                </div>
              </div>
            </dl>
          </article>

          <article className="member-profile-card member-profile-credential">
            <MemberCarnetPreview active={active} profile={profile} />
          </article>

          <article className="member-profile-card member-profile-docs">
            <header>
              <ProfileUiIcon name="file" />
              <div>
                <h3>Mis documentos</h3>
                <p>Descarga tus documentos oficiales</p>
              </div>
            </header>
            <button className="is-primary" disabled={isBusy} onClick={() => void download("carnet")} type="button">
              <ProfileUiIcon name="download" />
              <span>Descargar carnet de miembro</span>
              <ProfileUiIcon name="arrow" />
            </button>
            <button disabled={isBusy} onClick={() => void download("certificate")} type="button">
              <ProfileUiIcon name="download" />
              <span>Descargar certificado de afiliación</span>
              <ProfileUiIcon name="arrow" />
            </button>
            <small>
              Documentos con firma electrónica.
              <br />
              Válidos y verificados por COPSSTEC.
            </small>
          </article>
        </div>

        <div className="member-profile-sections">
          <SectionCard
            icon="user"
            id="personal"
            onEdit={() => setSection("personal")}
            subtitle="Tus datos de identificación personal"
            title="Información personal"
          >
            <Field label="Nombres" value={displayValue(profile.names)} />
            <Field label="Apellidos" value={displayValue(profile.lastname)} />
            <Field label="Identificación" value={displayValue(profile.identifier)} />
            <Field label="Fecha de nacimiento" value={displayValue(profile.birtday)} />
            <Field label="Tipo de sangre" value={displayValue(profile.blood_type)} />
          </SectionCard>

          <SectionCard
            icon="phone"
            id="contact"
            onEdit={() => setSection("contact")}
            subtitle="Información de contacto"
            title="Contacto"
          >
            <Field label="Correo" value={displayValue(profile.email)} />
            <Field label="Celular" value={displayValue(profile.mobile_phone)} />
            <Field label="Teléfono fijo" value={displayValue(profile.fixed_phone)} />
          </SectionCard>

          <SectionCard
            icon="graduation"
            id="academic"
            onEdit={() => setSection("academic")}
            subtitle="Tu formación profesional"
            title="Información académica"
          >
            <Field label="Título académico" value={academicTitle(profile)} />
            <Field label="Nivel académico" value={displayValue(profile.level_academic)} />
            <Field label="Código Senescyt" value={displayValue(profile.cod_senescyt)} />
          </SectionCard>
        </div>

        <div className="member-profile-footer">
          <article className="member-profile-card">
            <header>
              <ProfileUiIcon name="shield" />
              <div>
                <h3>Estado de membresía</h3>
                <p>Acredita tu afiliación</p>
              </div>
            </header>
            <div className="member-profile-membership-row">
              <div className={`member-profile-banner ${active ? "is-success" : "is-muted"}`}>
                <ProfileUiIcon name="check" />
                <div>
                  <strong>{membershipHeadline(subscription, user.state_id)}</strong>
                  <span>Tu membresía se encuentra {active ? "al día" : "en revisión de cobertura"}.</span>
                </div>
              </div>
              <div className="member-profile-vigencia">
                <ProfileUiIcon name="calendar" />
                <div>
                  <strong>Vigencia</strong>
                  <span>{coveragePeriod(subscription)}</span>
                </div>
              </div>
            </div>
          </article>

          <article className="member-profile-card">
            <header>
              <ProfileUiIcon name="badge" />
              <div>
                <h3>Beneficios de miembro</h3>
                <p>Accede a oportunidades exclusivas</p>
              </div>
              <Link href="/mi-espacio">Ver todos los beneficios</Link>
            </header>
            <div className="member-profile-benefits">
              {PROFILE_BENEFITS.map((item) => (
                <div key={item.id}>
                  <ProfileUiIcon name={item.icon} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <ProfileEditDialog
        isBusy={isBusy}
        onClose={() => setSection(null)}
        onSubmit={saveSection}
        profile={profile}
        section={section}
      />
    </RoleGate>
  );
}

function SectionCard({
  id,
  icon,
  title,
  subtitle,
  onEdit,
  children,
}: {
  id: ProfileSection;
  icon: "user" | "phone" | "graduation";
  title: string;
  subtitle: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <article className="member-profile-card" id={`member-profile-${id}`}>
      <header>
        <ProfileUiIcon name={icon} />
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <button onClick={onEdit} type="button">
          <ProfileUiIcon name="pencil" />
          Editar
        </button>
      </header>
      <div className="member-profile-fields">{children}</div>
    </article>
  );
}
