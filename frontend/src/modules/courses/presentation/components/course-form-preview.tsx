import { BRAND_MEDIA } from "@/config/brand-media";
import type { CourseFormInput } from "@/modules/courses/domain/types";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";
import { formatCoursePrice } from "@/modules/courses/presentation/lib/course-admin";
import { BrandImage } from "@/shared/components/brand-image";
import { resolveMediaSrc } from "@/shared/lib/media";

interface CourseFormPreviewProps {
  form: CourseFormInput;
}

export function CourseFormPreview({ form }: CourseFormPreviewProps) {
  const imageSrc = resolveMediaSrc(form.image);
  const visible = form.state_id === 4;

  return (
    <aside className="course-form-preview">
      <header>
        <strong>
          <CourseUiIcon name="eye" />
          Vista previa
        </strong>
        <p className="muted">Así se verá el curso en el listado.</p>
      </header>

      <article className="course-form-preview-card">
        <div className="course-form-preview-cover">
          {imageSrc ? (
            <img alt="" src={imageSrc} />
          ) : (
            <BrandImage
              alt="COPSSTEC"
              className="course-form-preview-logo"
              fallback={<span className="course-form-preview-fallback">CS</span>}
              sources={[BRAND_MEDIA.logoLong, BRAND_MEDIA.logoLongFallback, BRAND_MEDIA.iconShort]}
            />
          )}
          <span className={`course-status-badge is-${visible ? "visible" : "hidden"}`}>
            <i />
            {visible ? "Visible" : "Oculto"}
          </span>
        </div>

        <p className="course-form-preview-modality">
          <CourseUiIcon name="monitor" />
          <span>{form.type_modality?.trim() || "Online"}</span>
        </p>
        <h3>{form.title.trim() || "Título del curso"}</h3>

        <ul className="course-form-preview-meta">
          <li>
            <CourseUiIcon name="user" />
            <span>{form.capacitator.trim() || "Capacitador (opcional)"}</span>
          </li>
          <li>
            <CourseUiIcon name="dollar" />
            <span>{formatCoursePrice(form.value || "0")}</span>
          </li>
          <li>
            <CourseUiIcon name="calendar" />
            <span>Inicio: {form.date_course.trim() || "dd/mm/aaaa"}</span>
          </li>
          <li>
            <CourseUiIcon name="clock" />
            <span>
              {form.hour_init.trim() || "08:00"}–{form.hour_final.trim() || "17:00"}
            </span>
          </li>
          <li>
            <CourseUiIcon name="pin" />
            <span>{form.location.trim() || "Virtual / Presencial"}</span>
          </li>
        </ul>

        <p className="muted">{form.about.trim() || "Descripción del curso, objetivos, contenido, etc..."}</p>
      </article>
    </aside>
  );
}
