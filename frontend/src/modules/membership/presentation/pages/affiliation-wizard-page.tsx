"use client";

import { FormEvent, useEffect, useMemo, useState, type InputHTMLAttributes } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ECUADOR_PROVINCES } from "@/modules/membership/domain/ecuador";
import {
  BLOOD_TYPES,
  DATA_POLICY_BODY,
  DATA_POLICY_TITLE,
  EMPTY_AFFILIATION_FORM,
  GENDERS,
  type AffiliationForm,
} from "@/modules/membership/domain/types";
import { MembershipApiError, registerAffiliation } from "@/modules/membership/infrastructure/membership-api";
import { mapAffiliationError, type AffiliationFieldError } from "@/modules/membership/presentation/lib/affiliation-errors";
import { CEDULA_INVALID_MESSAGE, isValidEcuadorianCedula } from "@/modules/membership/presentation/lib/cedula";
import { storeSession } from "@/modules/auth/infrastructure/auth-storage";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";
import { trackEvent } from "@/shared/lib/analytics";

const STEPS = [
  { id: 1, label: "Datos Personales" },
  { id: 2, label: "Contacto y Ubicación" },
  { id: 3, label: "Información Académica" },
  { id: 4, label: "Finalizar" },
];

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  inputMode,
  maxLength,
}: {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  maxLength?: number;
}) {
  return (
    <label className="field" htmlFor={id}>
      {label}
      <input
        id={id}
        inputMode={inputMode}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        type={type}
        value={value}
      />
    </label>
  );
}

export function AffiliationWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<AffiliationForm>(EMPTY_AFFILIATION_FORM);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [errors, setErrors] = useState<AffiliationFieldError[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cities = useMemo(
    () => ECUADOR_PROVINCES.find((item) => item.name === form.province)?.cities ?? [],
    [form.province],
  );

  useEffect(() => {
    trackEvent("form_start", { form_name: "afiliacion", page_type: "signup" });
  }, []);

  function update<K extends keyof AffiliationForm>(field: K, value: AffiliationForm[K]) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === "province") {
        next.city = "";
      }
      if (field === "fourth_title" && typeof value === "string" && value.trim() === "") {
        next.codigo_senescyt_cuarto = "";
      }
      return next;
    });
  }

  function validateStep(): AffiliationFieldError | null {
    if (step === 1) {
      if (!form.names.trim() || !form.lastname.trim() || !form.identifier.trim() || !form.birtday) {
        return { message: "Completa nombres, apellidos, cédula y fecha de nacimiento.", step: 1 };
      }
      if (!isValidEcuadorianCedula(form.identifier)) {
        return { message: CEDULA_INVALID_MESSAGE, step: 1, field: "identifier" };
      }
      if (!form.blood_type || !form.gender) {
        return { message: "Selecciona tipo de sangre y género.", step: 1 };
      }
      if (!photo) {
        return { message: "La foto de perfil es obligatoria.", step: 1, field: "photo" };
      }
    }
    if (step === 2) {
      if (!form.email.trim() || !form.mobile_phone.trim() || !form.province || !form.city || !form.street_principal.trim()) {
        return {
          message: "Completa correo, celular, provincia, ciudad y calle principal.",
          step: 2,
          field: "email",
        };
      }
    }
    if (step === 3) {
      if (!form.title_academic.trim() || !form.cod_senescyt.trim()) {
        return {
          message: "El título de tercer nivel y su código Senescyt son obligatorios.",
          step: 3,
          field: "title_academic",
        };
      }
      if (form.fourth_title.trim() && !form.codigo_senescyt_cuarto.trim()) {
        return {
          message: "Si tienes título de cuarto nivel, el código Senescyt es obligatorio.",
          step: 3,
          field: "codigo_senescyt_cuarto",
        };
      }
    }
    return null;
  }

  function goToError(error: AffiliationFieldError) {
    setStep(error.step);
    window.setTimeout(() => {
      if (!error.field) {
        return;
      }
      document.getElementById(`affiliation-${error.field}`)?.focus();
    }, 50);
  }

  function goNext() {
    const issue = validateStep();
    if (issue) {
      setErrors([issue]);
      return;
    }
    setErrors([]);
    setStep((current) => Math.min(current + 1, 4));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 4) {
      goNext();
      return;
    }

    if (!form.accept_birthday_notifications || !form.accept_data_policy) {
      setErrors([
        {
          message: "Debe aceptar las notificaciones de cumpleaños y la política de tratamiento de datos.",
          step: 4,
        },
      ]);
      return;
    }
    if (!isValidEcuadorianCedula(form.identifier)) {
      const issue = { message: CEDULA_INVALID_MESSAGE, step: 1, field: "identifier" };
      setErrors([issue]);
      goToError(issue);
      return;
    }
    if (!photo) {
      setErrors([{ message: "La foto de perfil es obligatoria.", step: 1, field: "photo" }]);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);
    try {
      const result = await registerAffiliation(form, photo);
      trackEvent("generate_lead", { form_name: "afiliacion", method: "signup" });
      trackEvent("form_submit", { form_name: "afiliacion", success: true });
      storeSession({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
      });
      router.replace("/afiliacion/pago");
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo completar el registro.";
      const code = err instanceof MembershipApiError ? err.code : undefined;
      const issue = mapAffiliationError(message, code);
      setErrors([issue]);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handlePhoto(file: File | null) {
    setPhoto(file);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview(file ? URL.createObjectURL(file) : null);
  }

  return (
    <main className="affiliation-page">
      <div className="affiliation-top">
        <Link className="secondary-button button-link" href="/">
          Volver al inicio
        </Link>
      </div>

      <header className="affiliation-hero">
        <AppLogo />
        <h1>Registro de Miembro</h1>
        <p>Complete el formulario para unirse al COPSSTEC</p>
      </header>

      <ol className="affiliation-stepper">
        {STEPS.map((item) => (
          <li
            className={item.id < step ? "is-done" : item.id === step ? "is-current" : ""}
            key={item.id}
          >
            <span>{item.id < step ? "✓" : item.id}</span>
            {item.label}
          </li>
        ))}
      </ol>

      <form className="affiliation-card" onSubmit={handleSubmit}>
        {step === 1 ? (
          <>
            <h2>Datos Personales</h2>
            <Field id="affiliation-names" label="Nombres" onChange={(value) => update("names", value)} required value={form.names} />
            <Field id="affiliation-lastname" label="Apellidos" onChange={(value) => update("lastname", value)} required value={form.lastname} />
            <Field
              id="affiliation-identifier"
              inputMode="numeric"
              label="Cédula"
              maxLength={10}
              onChange={(value) => update("identifier", value.replace(/\D/g, "").slice(0, 10))}
              required
              value={form.identifier}
            />
            <Field
              label="Fecha de nacimiento"
              onChange={(value) => update("birtday", value)}
              required
              type="date"
              value={form.birtday}
            />
            <label className="field">
              Selecciona tu tipo de sangre
              <select onChange={(event) => update("blood_type", event.target.value)} required value={form.blood_type}>
                <option value="">Selecciona tu tipo de sangre</option>
                {BLOOD_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Selecciona tu género
              <select onChange={(event) => update("gender", event.target.value)} required value={form.gender}>
                <option value="">Selecciona tu género</option>
                {GENDERS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div className="photo-drop">
              <strong>Foto de Perfil *</strong>
              <p>Queremos verte. Arrastra o presiona el recuadro para subir tu foto de perfil.</p>
              <label className="photo-drop-box">
                {photoPreview ? <img alt="Vista previa" src={photoPreview} /> : <span>+</span>}
                <input
                  accept="image/png,image/jpeg,image/webp"
                  hidden
                  id="affiliation-photo"
                  onChange={(event) => handlePhoto(event.target.files?.[0] ?? null)}
                  type="file"
                />
              </label>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <h2>Contacto y Ubicación</h2>
            <Field id="affiliation-email" label="Correo" onChange={(value) => update("email", value)} required type="email" value={form.email} />
            <Field
              label="Teléfono fijo (opcional)"
              onChange={(value) => update("fixed_phone", value)}
              value={form.fixed_phone}
            />
            <Field
              label="Teléfono móvil"
              onChange={(value) => update("mobile_phone", value)}
              required
              value={form.mobile_phone}
            />
            <label className="field">
              País
              <input disabled value="Ecuador" />
            </label>
            <label className="field">
              Provincia
              <select onChange={(event) => update("province", event.target.value)} required value={form.province}>
                <option value="">Seleccione la provincia</option>
                {ECUADOR_PROVINCES.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Ciudad
              <select disabled={!form.province} onChange={(event) => update("city", event.target.value)} required value={form.city}>
                <option value="">Seleccione la ciudad</option>
                {cities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Calle principal y número de casa"
              onChange={(value) => update("street_principal", value)}
              required
              value={form.street_principal}
            />
            <Field
              label="Calle secundaria"
              onChange={(value) => update("street_secondary", value)}
              value={form.street_secondary}
            />
          </>
        ) : null}

        {step === 3 ? (
          <>
            <h2>Información Académica</h2>
            <Field
              id="affiliation-title_academic"
              label="Título de tercer nivel"
              onChange={(value) => update("title_academic", value)}
              required
              value={form.title_academic}
            />
            <Field
              id="affiliation-cod_senescyt"
              label="Código Senescyt"
              onChange={(value) => update("cod_senescyt", value)}
              required
              value={form.cod_senescyt}
            />
            <Field
              label="Título de cuarto nivel (opcional)"
              onChange={(value) => update("fourth_title", value)}
              value={form.fourth_title}
            />
            <Field
              id="affiliation-codigo_senescyt_cuarto"
              label="Código Senescyt (opcional, requerido si tiene título de cuarto nivel)"
              onChange={(value) => update("codigo_senescyt_cuarto", value)}
              value={form.codigo_senescyt_cuarto}
            />
          </>
        ) : null}

        {step === 4 ? (
          <>
            <h2>Confirmación y Términos</h2>
            <label className="check-row">
              <input
                checked={form.accept_birthday_notifications}
                onChange={(event) => update("accept_birthday_notifications", event.target.checked)}
                type="checkbox"
              />
              Acepto recibir notificaciones por mi cumpleaños
            </label>
            <label className="check-row check-row-card">
              <input
                checked={form.accept_data_policy}
                onChange={(event) => update("accept_data_policy", event.target.checked)}
                type="checkbox"
              />
              <span>
                Acepto y autorizo el tratamiento de mis datos personales.{" "}
                <button className="link-button" onClick={() => setPolicyOpen(true)} type="button">
                  Lee nuestra política de tratamiento de datos
                </button>{" "}
                antes de registrarte.
              </span>
            </label>
            <p className="muted">
              Al afiliarte continuarás al pago. Cuando el administrador apruebe tu comprobante
              recibirás en tu correo personal el usuario corporativo @copsstec.com y una contraseña
              temporal para ingresar al sistema.
            </p>
          </>
        ) : null}

        {errors.length ? (
          <div className="form-error-list">
            {errors.map((item) => (
              <button
                className="form-error form-error-link"
                key={`${item.step}-${item.message}`}
                onClick={() => goToError(item)}
                type="button"
              >
                {item.message}
              </button>
            ))}
          </div>
        ) : null}

        <div className="affiliation-actions">
          <button
            className="secondary-button"
            disabled={step === 1 || isSubmitting}
            onClick={() => setStep((current) => Math.max(1, current - 1))}
            type="button"
          >
            Anterior
          </button>
          <span className="muted">Paso {step} de 4</span>
          <button className="create-button" disabled={isSubmitting} type="submit">
            {step === 4 ? (isSubmitting ? "Enviando..." : "Afiliarme") : "Siguiente"}
          </button>
        </div>
      </form>

      {policyOpen ? (
        <div className="modal-backdrop">
          <div className="confirm-dialog policy-dialog">
            <h2>{DATA_POLICY_TITLE}</h2>
            <pre className="policy-body">{DATA_POLICY_BODY}</pre>
            <button className="secondary-button" onClick={() => setPolicyOpen(false)} type="button">
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
      <PublicFooter />
    </main>
  );
}
