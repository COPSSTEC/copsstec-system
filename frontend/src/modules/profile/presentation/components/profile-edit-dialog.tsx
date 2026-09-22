"use client";

import { useEffect, useState } from "react";

import type { Profile } from "@/modules/auth/domain/types";
import type { ProfileSelfUpdate } from "@/modules/profile/infrastructure/profile-api";
import { ProfileUiIcon } from "@/modules/profile/presentation/components/profile-ui-icon";
import type { ProfileSection } from "@/modules/profile/presentation/lib/member-profile";

interface ProfileEditDialogProps {
  profile: Profile;
  section: ProfileSection | null;
  isBusy: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileSelfUpdate) => Promise<void>;
}

const TITLES: Record<ProfileSection, string> = {
  personal: "Editar información personal",
  contact: "Editar contacto",
  academic: "Editar información académica",
};

export function ProfileEditDialog({
  profile,
  section,
  isBusy,
  onClose,
  onSubmit,
}: ProfileEditDialogProps) {
  const [form, setForm] = useState<ProfileSelfUpdate>({});

  useEffect(() => {
    if (!section) {
      return;
    }
    setForm({
      names: profile.names,
      lastname: profile.lastname,
      identifier: profile.identifier,
      birtday: profile.birtday,
      blood_type: profile.blood_type,
      email: profile.email,
      mobile_phone: profile.mobile_phone,
      fixed_phone: profile.fixed_phone,
      province: profile.province ?? "",
      city: profile.city ?? "",
      title_academic: profile.title_academic,
      level_academic: profile.level_academic,
      cod_senescyt: profile.cod_senescyt,
    });
  }, [profile, section]);

  if (section === null) {
    return null;
  }

  function setField(name: keyof ProfileSelfUpdate, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  return (
    <div className="member-profile-dialog" onClick={onClose} role="presentation">
      <form
        className="member-profile-dialog-card"
        onClick={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(form);
        }}
      >
        <header>
          <div>
            <h2>{TITLES[section]}</h2>
            <p>Los cambios se guardan en tu ficha de miembro.</p>
          </div>
          <button className="member-profile-icon-btn" onClick={onClose} type="button">
            <ProfileUiIcon name="close" />
          </button>
        </header>

        <div className="member-profile-form-grid">
          {section === "personal" ? (
            <>
              <label>
                Nombres
                <input onChange={(event) => setField("names", event.target.value)} value={form.names ?? ""} />
              </label>
              <label>
                Apellidos
                <input onChange={(event) => setField("lastname", event.target.value)} value={form.lastname ?? ""} />
              </label>
              <label>
                Identificación
                <input onChange={(event) => setField("identifier", event.target.value)} value={form.identifier ?? ""} />
              </label>
              <label>
                Fecha de nacimiento
                <input onChange={(event) => setField("birtday", event.target.value)} value={form.birtday ?? ""} />
              </label>
              <label>
                Tipo de sangre
                <input onChange={(event) => setField("blood_type", event.target.value)} value={form.blood_type ?? ""} />
              </label>
            </>
          ) : null}

          {section === "contact" ? (
            <>
              <label>
                Correo
                <input onChange={(event) => setField("email", event.target.value)} type="email" value={form.email ?? ""} />
              </label>
              <label>
                Celular
                <input onChange={(event) => setField("mobile_phone", event.target.value)} value={form.mobile_phone ?? ""} />
              </label>
              <label>
                Teléfono fijo
                <input onChange={(event) => setField("fixed_phone", event.target.value)} value={form.fixed_phone ?? ""} />
              </label>
              <label>
                Provincia
                <input onChange={(event) => setField("province", event.target.value)} value={form.province ?? ""} />
              </label>
              <label>
                Ciudad
                <input onChange={(event) => setField("city", event.target.value)} value={form.city ?? ""} />
              </label>
            </>
          ) : null}

          {section === "academic" ? (
            <>
              <label>
                Título académico
                <input
                  onChange={(event) => setField("title_academic", event.target.value)}
                  value={form.title_academic ?? ""}
                />
              </label>
              <label>
                Nivel académico
                <input
                  onChange={(event) => setField("level_academic", event.target.value)}
                  value={form.level_academic ?? ""}
                />
              </label>
              <label>
                Código Senescyt
                <input
                  onChange={(event) => setField("cod_senescyt", event.target.value)}
                  value={form.cod_senescyt ?? ""}
                />
              </label>
            </>
          ) : null}
        </div>

        <footer>
          <button className="member-profile-ghost-btn" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="primary-button" disabled={isBusy} type="submit">
            {isBusy ? "Guardando..." : "Guardar cambios"}
          </button>
        </footer>
      </form>
    </div>
  );
}
