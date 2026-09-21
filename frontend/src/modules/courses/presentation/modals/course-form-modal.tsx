import { FormEvent, useRef, type Dispatch, type SetStateAction } from "react";

import type { CourseFormInput } from "@/modules/courses/domain/types";
import { CourseFormPreview } from "@/modules/courses/presentation/components/course-form-preview";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";

const LOCATION_OPTIONS = ["Virtual / Presencial", "Virtual", "Presencial"];
const MODALITY_OPTIONS = ["Online", "Presencial", "Híbrido", "Virtual"];

interface CourseFormModalProps {
  form: CourseFormInput;
  editing: boolean;
  onChange: Dispatch<SetStateAction<CourseFormInput>>;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function CourseFormModal({ form, editing, onChange, onClose, onSubmit }: CourseFormModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function setField<K extends keyof CourseFormInput>(name: K, value: CourseFormInput[K]) {
    onChange((current) => ({ ...current, [name]: value }));
  }

  function handleImageFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setField("image", reader.result);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="confirm-dialog course-form-dialog" onSubmit={onSubmit}>
        <header className="course-modal-head">
          <div className="course-modal-title">
            <span className="course-modal-icon">
              <CourseUiIcon name="book" />
            </span>
            <div>
              <h2>{editing ? "Editar curso" : "Nuevo curso"}</h2>
              <p className="muted">Completa la información del curso y revisa la vista previa.</p>
            </div>
          </div>
          <button aria-label="Cerrar" className="icon-ghost-button" onClick={onClose} type="button">
            <CourseUiIcon name="close" />
          </button>
        </header>

        <div className="course-form-split">
          <section className="course-form-fields">
            <h3>
              <CourseUiIcon name="clipboard" />
              Información del curso
            </h3>

            <CourseField
              label="Título"
              name="title"
              onChange={onChange}
              placeholder="Ej. Manejo de sustancias peligrosas"
              required
              value={form.title}
            />
            <div className="grid">
              <CourseField label="Valor (USD)" name="value" onChange={onChange} required value={form.value} />
              <div className="field">
                <label htmlFor="location">Lugar</label>
                <input
                  id="location"
                  list="course-location-options"
                  onChange={(event) => setField("location", event.target.value)}
                  placeholder="Virtual / Presencial"
                  required
                  value={form.location}
                />
                <datalist id="course-location-options">
                  {LOCATION_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid">
              <CourseField label="Fecha inicio" name="date_course" onChange={onChange} placeholder="dd/mm/aaaa" required value={form.date_course} />
              <CourseField label="Fecha fin" name="date_course_final" onChange={onChange} placeholder="dd/mm/aaaa" required value={form.date_course_final} />
            </div>
            <div className="grid">
              <CourseField label="Hora inicio" name="hour_init" onChange={onChange} placeholder="08:00" required value={form.hour_init} />
              <CourseField label="Hora fin" name="hour_final" onChange={onChange} placeholder="17:00" required value={form.hour_final} />
            </div>
            <div className="grid">
              <div className="field">
                <label htmlFor="state_id">Estado</label>
                <select
                  id="state_id"
                  onChange={(event) => setField("state_id", Number(event.target.value))}
                  value={form.state_id}
                >
                  <option value={4}>Visible</option>
                  <option value={5}>Oculto</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="type_modality">Modalidad</label>
                <select
                  id="type_modality"
                  onChange={(event) => setField("type_modality", event.target.value)}
                  value={form.type_modality ?? "Online"}
                >
                  {MODALITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <span>Imagen del curso</span>
              <button
                className={`course-image-drop${form.image ? " has-image" : ""}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleImageFile(event.dataTransfer.files[0]);
                }}
                type="button"
              >
                <CourseUiIcon name="cloud" />
                <strong>Arrastra y suelta una imagen aquí</strong>
                <span>o haz clic para seleccionar</span>
                <em>Formatos permitidos: JPG, PNG, WEBP. Tamaño recomendado 1200 x 600 px.</em>
              </button>
              <input
                accept="image/jpeg,image/png,image/webp"
                hidden
                onChange={(event) => {
                  handleImageFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
                ref={fileRef}
                type="file"
              />
              <input
                onChange={(event) => setField("image", event.target.value)}
                placeholder="O pega una URL / ruta de imagen"
                type="text"
                value={form.image.startsWith("data:") ? "" : form.image}
              />
            </div>

            <CourseField label="Link (opcional)" name="link" onChange={onChange} placeholder="https://" required={false} value={form.link ?? ""} />
            <div className="grid">
              <CourseField
                label="Capacitador (opcional)"
                name="capacitator"
                onChange={onChange}
                placeholder="Nombre del capacitador"
                required={false}
                value={form.capacitator}
              />
              <CourseField
                label="Sobre el capacitador (opcional)"
                name="capacitator_about"
                onChange={onChange}
                placeholder="Breve descripción del capacitador..."
                required={false}
                value={form.capacitator_about}
              />
            </div>
            <CourseTextarea
              label="Descripción"
              name="about"
              onChange={onChange}
              placeholder="Descripción del curso, objetivos, contenido..."
              value={form.about}
            />
          </section>

          <CourseFormPreview form={form} />
        </div>

        <div className="hero-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            {editing ? "Guardar cambios" : "Crear curso"}
          </button>
        </div>
      </form>
    </div>
  );
}

interface CourseFieldProps {
  label: string;
  name: keyof CourseFormInput;
  onChange: Dispatch<SetStateAction<CourseFormInput>>;
  placeholder?: string;
  required?: boolean;
  value: string;
}

function CourseField({ label, name, onChange, placeholder, required = true, value }: CourseFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>
        {label}
        {required ? " *" : ""}
      </label>
      <input
        id={name}
        onChange={(event) =>
          onChange((current) => ({
            ...current,
            [name]: name === "state_id" ? Number(event.target.value) : event.target.value,
          }))
        }
        placeholder={placeholder}
        required={required}
        type="text"
        value={value}
      />
    </div>
  );
}

function CourseTextarea({
  label,
  name,
  onChange,
  placeholder,
  value,
}: CourseFieldProps) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <textarea
        id={name}
        onChange={(event) => onChange((current) => ({ ...current, [name]: event.target.value }))}
        placeholder={placeholder}
        rows={3}
        value={value}
      />
    </div>
  );
}
