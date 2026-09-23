export const CEDULA_INVALID_MESSAGE = "La cédula ecuatoriana no es válida.";

export function normalizeCedula(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function isValidEcuadorianCedula(value: string): boolean {
  const digits = normalizeCedula(value);
  if (digits.length !== 10) {
    return false;
  }

  const province = Number(digits.slice(0, 2));
  if (province < 1 || (province > 24 && province !== 30)) {
    return false;
  }
  if (Number(digits[2]) >= 6) {
    return false;
  }

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let total = 0;
  for (let index = 0; index < coefficients.length; index += 1) {
    let product = Number(digits[index]) * coefficients[index];
    if (product >= 10) {
      product -= 9;
    }
    total += product;
  }

  const check = (10 - (total % 10)) % 10;
  return check === Number(digits[9]);
}
