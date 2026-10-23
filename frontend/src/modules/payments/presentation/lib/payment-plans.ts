import {
  currentPeriod,
  periodLabel,
  type PaymentPlan,
  type PaymentPlanPreview,
  type PlanScheduleItem,
} from "@/modules/payments/domain/types";

export const PLAN_START_OFFSETS = [0, 1, 2, 3] as const;

type PlanMessageSource = Pick<
  PaymentPlan | PaymentPlanPreview,
  | "debt_total"
  | "debt_from_period"
  | "debt_to_period"
  | "start_period"
  | "monthly_fee"
  | "installment_amount"
  | "monthly_total"
  | "regular_from_period"
>;

export function messageUsd(amount: string | number): string {
  const value = Number(amount);
  if (Number.isNaN(value)) {
    return `$${amount}`;
  }
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

export function startPeriodOptions(): { value: string; label: string }[] {
  return PLAN_START_OFFSETS.map((offset) => {
    const value = currentPeriod(offset);
    return { value, label: periodLabel(value) };
  });
}

export function planMessageParagraphs(source: PlanMessageSource, schedule: PlanScheduleItem[]): string[] {
  const debtItems = schedule.filter((item) => Number(item.debt_amount) > 0);
  const last = debtItems[debtItems.length - 1];
  const partialLast = Boolean(last) && Number(last.debt_amount) < Number(source.installment_amount);
  const fullItems = partialLast ? debtItems.slice(0, -1) : debtItems;
  const fee = messageUsd(source.monthly_fee);
  const range =
    source.debt_from_period && source.debt_to_period
      ? `, correspondiente al período de ${periodLabel(source.debt_from_period)} a ${periodLabel(source.debt_to_period)},`
      : ",";

  const paragraphs = [
    `De acuerdo con el saldo pendiente de su membresía${range} la deuda acumulada es de ${messageUsd(source.debt_total)}.`,
  ];
  if (fullItems.length > 0) {
    paragraphs.push(
      `A partir de ${periodLabel(source.start_period)}, se realizará un débito mensual de ${messageUsd(source.monthly_total)} durante los primeros cinco días de cada mes, distribuido de la siguiente manera:`,
      `• ${fee}: aporte correspondiente al mes en curso.`,
      `• ${messageUsd(source.installment_amount)}: abono a la deuda pendiente.`,
      `Este esquema se mantendrá hasta ${periodLabel(fullItems[fullItems.length - 1].period)}.`,
    );
    if (partialLast && last) {
      paragraphs.push(
        `En ${periodLabel(last.period)} se debitarán ${messageUsd(last.total_amount)}, correspondientes a los últimos ${messageUsd(last.debt_amount)} de deuda y los ${fee} del aporte mensual.`,
      );
    }
  } else if (last) {
    paragraphs.push(
      `En ${periodLabel(last.period)} se debitarán ${messageUsd(last.total_amount)} durante los primeros cinco días del mes, correspondientes a los ${messageUsd(last.debt_amount)} de deuda y los ${fee} del aporte mensual.`,
    );
  }
  paragraphs.push(
    `A partir de ${periodLabel(source.regular_from_period)}, el débito será únicamente de ${fee} mensuales, correspondientes a su membresía regular.`,
  );
  return paragraphs;
}
