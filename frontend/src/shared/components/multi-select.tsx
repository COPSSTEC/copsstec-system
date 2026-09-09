"use client";

import { useEffect, useRef, useState } from "react";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  label: string;
  values: string[];
  options: readonly MultiSelectOption[];
  onChange: (values: string[]) => void;
  exclusiveValue?: string;
}

export function MultiSelect({
  label,
  values,
  options,
  onChange,
  exclusiveValue,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(value: string) {
    if (exclusiveValue && value === exclusiveValue) {
      onChange([exclusiveValue]);
      return;
    }

    const withoutExclusive = values.filter((item) => item !== exclusiveValue);
    if (withoutExclusive.includes(value)) {
      const next = withoutExclusive.filter((item) => item !== value);
      onChange(next.length > 0 ? next : exclusiveValue ? [exclusiveValue] : []);
      return;
    }

    onChange([...withoutExclusive, value]);
  }

  const selectedLabels = options.filter((option) => values.includes(option.value));

  return (
    <div className="field multi-select" ref={rootRef}>
      <span>{label}</span>
      <button className="multi-select-control" onClick={() => setOpen((value) => !value)} type="button">
        <span className="multi-select-chips">
          {selectedLabels.length === 0 ? (
            <span className="muted">Selecciona una o más opciones</span>
          ) : (
            selectedLabels.map((option) => (
              <span className="multi-select-chip" key={option.value}>
                {option.label}
              </span>
            ))
          )}
        </span>
      </button>
      {open ? (
        <div className="multi-select-menu">
          {options.map((option) => (
            <label key={option.value}>
              <input
                checked={values.includes(option.value)}
                onChange={() => toggle(option.value)}
                type="checkbox"
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
