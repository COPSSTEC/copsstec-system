import {
  formatUsd,
  installmentStatusLabel,
  periodLabel,
  type PlanInstallment,
  type PlanScheduleItem,
} from "@/modules/payments/domain/types";

interface PlanScheduleTableProps {
  items: (PlanScheduleItem | PlanInstallment)[];
  highlightPeriod?: string | null;
}

function statusVariant(status: string): string {
  if (status === "debited") {
    return "success";
  }
  if (status === "failed") {
    return "danger";
  }
  return "muted";
}

export function PlanScheduleTable({ items, highlightPeriod }: PlanScheduleTableProps) {
  const withStatus = items.some((item) => "status" in item);
  return (
    <div className="plan-schedule">
      <table>
        <thead>
          <tr>
            <th>Mes</th>
            <th>Cuota</th>
            <th>Abono</th>
            <th>Débito</th>
            {withStatus ? <th>Estado</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              className={item.period === highlightPeriod ? "is-highlighted" : ""}
              key={"id" in item ? item.id : item.period}
            >
              <td>{periodLabel(item.period)}</td>
              <td>{formatUsd(item.fee_amount)}</td>
              <td>{Number(item.debt_amount) > 0 ? formatUsd(item.debt_amount) : "—"}</td>
              <td>
                <strong>{formatUsd(item.total_amount)}</strong>
              </td>
              {withStatus ? (
                <td>
                  {"status" in item ? (
                    <span className={`status-badge status-badge-${statusVariant(item.status)}`}>
                      {installmentStatusLabel(item.status)}
                    </span>
                  ) : null}
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
