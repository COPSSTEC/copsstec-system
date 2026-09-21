"use client";

import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";

const LEVELS = [
  { value: 1, label: "Muy mala", hint: "Nada satisfecho", icon: "faceBad" as const, tone: "bad" },
  { value: 2, label: "Mala", hint: "Poco satisfecho", icon: "facePoor" as const, tone: "poor" },
  { value: 3, label: "Regular", hint: "Neutral", icon: "faceOk" as const, tone: "ok" },
  { value: 4, label: "Buena", hint: "Satisfecho", icon: "faceGood" as const, tone: "good" },
  { value: 5, label: "Excelente", hint: "Muy satisfecho", icon: "faceGreat" as const, tone: "great" },
];

interface FeedbackRatingScaleProps {
  name: string;
  label: string;
  value: number | null;
  onChange: (value: number) => void;
}

export function FeedbackRatingScale({ name, label, value, onChange }: FeedbackRatingScaleProps) {
  const selected = LEVELS.find((level) => level.value === value);

  return (
    <fieldset className="feedback-scale">
      <legend>{label}</legend>
      <input name={name} required type="hidden" value={value ?? ""} />
      <div className="feedback-scale-options">
        {LEVELS.map((level) => (
          <button
            aria-pressed={value === level.value}
            className={`feedback-scale-option is-${level.tone}${value === level.value ? " is-selected" : ""}`}
            key={level.value}
            onClick={() => onChange(level.value)}
            type="button"
          >
            <CourseUiIcon name={level.icon} />
            <strong>{level.value}</strong>
            <span>{level.label}</span>
          </button>
        ))}
      </div>
      <p className="muted">
        1 es la más baja y 5 la más alta.
        {selected ? ` Seleccionaste: ${selected.label} (${selected.hint}).` : " Elige un nivel de satisfacción."}
      </p>
    </fieldset>
  );
}
