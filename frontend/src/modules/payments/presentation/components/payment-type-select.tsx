"use client";

import type { Ref } from "react";

import { PAYMENT_TYPES, PAYMENT_TYPE_LABELS, type PaymentType } from "@/modules/payments/domain/types";

interface PaymentTypeSelectProps {
  value: PaymentType | "";
  onChange: (value: PaymentType) => void;
  id?: string;
  required?: boolean;
  selectRef?: Ref<HTMLSelectElement>;
}

export function PaymentTypeSelect({
  value,
  onChange,
  id,
  required = true,
  selectRef,
}: PaymentTypeSelectProps) {
  return (
    <label className="field">
      Tipo
      <select
        id={id}
        onChange={(event) => onChange(event.target.value as PaymentType)}
        ref={selectRef}
        required={required}
        value={value}
      >
        <option value="">Selecciona un tipo</option>
        {PAYMENT_TYPES.map((type) => (
          <option key={type} value={type}>
            {PAYMENT_TYPE_LABELS[type]}
          </option>
        ))}
      </select>
    </label>
  );
}
