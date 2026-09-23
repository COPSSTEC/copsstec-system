export interface AffiliationFieldError {
  message: string;
  step: number;
  field?: string;
}

export function mapAffiliationError(message: string, code?: string | null): AffiliationFieldError {
  if (code === "identifier_taken" || (/cédula/i.test(message) && /existe/i.test(message))) {
    return { message, step: 1, field: "identifier" };
  }
  if (code === "email_taken" || (/correo/i.test(message) && /existe/i.test(message))) {
    return { message, step: 2, field: "email" };
  }
  if (/cédula/i.test(message)) {
    return { message, step: 1, field: "identifier" };
  }
  if (/foto/i.test(message)) {
    return { message, step: 1, field: "photo" };
  }
  if (/correo|email/i.test(message)) {
    return { message, step: 2, field: "email" };
  }
  if (/celular|provincia|ciudad|calle/i.test(message)) {
    return { message, step: 2 };
  }
  if (/senescyt|título|titulo/i.test(message)) {
    return { message, step: 3 };
  }
  if (/cumpleaños|cumpleanos|política|politica|datos/i.test(message)) {
    return { message, step: 4 };
  }
  return { message, step: 1 };
}
