"use client";

import { FormEvent } from "react";

import {
  COMMISSION_OPTIONS,
  PROFILE_TYPE_OPTIONS,
  type Member,
  type MemberWriteInput,
} from "@/modules/members/domain/types";
import { MemberPhotoField } from "@/modules/members/presentation/components/member-photo-field";
import { MultiSelect } from "@/shared/components/multi-select";

interface MemberFormModalProps {
  member: Member | null;
  form: MemberWriteInput;
  photoFile: File | null;
  error: string | null;
  isSubmitting: boolean;
  onClose: () => void;
  onChange: (field: keyof MemberWriteInput, value: string | boolean | string[]) => void;
  onPhotoChange: (file: File | null) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  name: keyof MemberWriteInput;
  value: string;
  onChange: (field: keyof MemberWriteInput, value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      {label}
      <input
        inputMode={name === "identifier" ? "numeric" : undefined}
        maxLength={name === "identifier" ? 10 : undefined}
        onChange={(event) => {
          const next = name === "identifier" ? event.target.value.replace(/\D/g, "").slice(0, 10) : event.target.value;
          onChange(name, next);
        }}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

export function MemberFormModal({
  member,
  form,
  photoFile,
  error,
  isSubmitting,
  onClose,
  onChange,
  onPhotoChange,
  onSubmit,
}: MemberFormModalProps) {
  const hasFourthTitle = form.fourth_title.trim().length > 0;

  return (
    <div className="modal-backdrop">
      <form className="confirm-dialog member-form-dialog" onSubmit={onSubmit}>
        <h2>{member ? "Editar miembro" : "Crear miembro"}</h2>
        <p className="muted">
          Cada miembro crea o actualiza su usuario de acceso y el profile asociado.
        </p>
        {error ? <p className="form-error">{error}</p> : null}

        <div className="member-form-grid">
          <Field label="Nombres" name="names" onChange={onChange} required value={form.names} />
          <Field label="Apellidos" name="lastname" onChange={onChange} required value={form.lastname} />
          <Field label="Cédula" name="identifier" onChange={onChange} required value={form.identifier} />
          <Field label="Celular" name="mobile_phone" onChange={onChange} required value={form.mobile_phone} />
          <Field
            label="Correo de contacto"
            name="email"
            onChange={onChange}
            required
            type="email"
            value={form.email}
          />
          <Field
            label="Correo de acceso"
            name="login_email"
            onChange={onChange}
            type="email"
            value={form.login_email}
          />
          <Field
            label="Fecha de cumpleaños"
            name="birtday"
            onChange={onChange}
            required
            value={form.birtday}
          />
          <Field
            label="Fecha de registro / Fecha miembro"
            name="date_register"
            onChange={onChange}
            required
            value={form.date_register}
          />
          <Field label="Teléfono fijo" name="fixed_phone" onChange={onChange} value={form.fixed_phone} />
          <Field label="Tipo de sangre" name="blood_type" onChange={onChange} value={form.blood_type} />
          <Field label="Género" name="gender" onChange={onChange} value={form.gender} />
          <Field
            label="Título de tercer nivel"
            name="title_academic"
            onChange={onChange}
            value={form.title_academic}
          />
          <Field
            label="Código Senescyt de tercer nivel"
            name="cod_senescyt"
            onChange={onChange}
            value={form.cod_senescyt}
          />
          <Field
            label="Título de cuarto nivel"
            name="fourth_title"
            onChange={onChange}
            value={form.fourth_title}
          />
          {hasFourthTitle ? (
            <Field
              label="Código Senescyt de cuarto nivel"
              name="codigo_senescyt_cuarto"
              onChange={onChange}
              value={form.codigo_senescyt_cuarto}
            />
          ) : null}
          <Field label="Nivel académico" name="level_academic" onChange={onChange} value={form.level_academic} />
          <Field label="Provincia" name="province" onChange={onChange} value={form.province} />
          <Field label="Ciudad" name="city" onChange={onChange} value={form.city} />
          <Field
            label="Calle principal"
            name="street_principal"
            onChange={onChange}
            value={form.street_principal}
          />
          <Field
            label="Calle secundaria y número de casa"
            name="street_secondary"
            onChange={onChange}
            value={form.street_secondary}
          />
          <Field label="LinkedIn" name="linkdink" onChange={onChange} value={form.linkdink} />
        </div>

        <div className="member-form-grid">
          <MultiSelect
            label="Selecciona el tipo de perfil"
            onChange={(values) => onChange("type_profiles", values)}
            options={PROFILE_TYPE_OPTIONS}
            values={form.type_profiles}
          />
          <MultiSelect
            exclusiveValue="NA"
            label="Pertenece a una comisión"
            onChange={(values) => onChange("commissions", values)}
            options={COMMISSION_OPTIONS}
            values={form.commissions}
          />
        </div>

        <MemberPhotoField
          currentFotoId={form.foto_id}
          file={photoFile}
          onFileChange={onPhotoChange}
        />

        <div className="member-form-checks">
          <label>
            <input
              checked={form.want_notifications}
              onChange={(event) => onChange("want_notifications", event.target.checked)}
              type="checkbox"
            />
            Quiere notificaciones
          </label>
          <label>
            <input
              checked={form.is_work}
              onChange={(event) => onChange("is_work", event.target.checked)}
              type="checkbox"
            />
            Se encuentra trabajando
          </label>
        </div>

        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="create-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Guardando..." : member ? "Guardar" : "Crear miembro"}
          </button>
        </div>
      </form>
    </div>
  );
}
