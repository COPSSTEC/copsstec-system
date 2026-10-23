"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  defaultDebitPeriod,
  formatUsd,
  installmentStatusLabel,
  periodLabel,
  type PeriodInstallment,
} from "@/modules/payments/domain/types";
import { confirmPlanInstallments, listPlanInstallments } from "@/modules/payments/infrastructure/payments-api";

interface ConfirmPlanDebitsModalProps {
  onClose: () => void;
  onChanged: (message: string) => void;
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

export function ConfirmPlanDebitsModal({ onClose, onChanged }: ConfirmPlanDebitsModalProps) {
  const [period, setPeriod] = useState(defaultDebitPeriod());
  const [items, setItems] = useState<PeriodInstallment[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (target: string) => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const result = await listPlanInstallments(token, target);
      setItems(result.items);
      setSelected(new Set(result.items.filter((item) => item.status === "pending").map((item) => item.id)));
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "No se pudieron cargar los débitos.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(period);
  }, [load, period]);

  const pending = useMemo(() => items.filter((item) => item.status === "pending"), [items]);
  const selectedTotal = useMemo(
    () => items.filter((item) => selected.has(item.id)).reduce((sum, item) => sum + Number(item.total_amount), 0),
    [items, selected],
  );

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function confirm(status: "debited" | "failed") {
    const token = getStoredToken();
    if (!token || selected.size === 0) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await confirmPlanInstallments(token, [...selected], status);
      const label = status === "debited" ? "debitados" : "fallidos";
      const message = `${result.updated} débito${result.updated === 1 ? "" : "s"} marcado${result.updated === 1 ? "" : "s"} como ${label}.`;
      setNotice(message);
      onChanged(message);
      await load(period);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron confirmar los débitos.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog payment-plan-dialog">
        <h2>Débitos del mes</h2>
        <p className="muted">
          Confirma los débitos de convenios que el banco cobró del 1 al 5 de {periodLabel(period)}. Cada débito
          confirmado registra la cuota (cobertura) y el abono a la deuda.
        </p>
        <div className="admin-payments-toolbar payment-plan-toolbar">
          <label className="field">
            Mes
            <input onChange={(event) => event.target.value && setPeriod(event.target.value)} type="month" value={period} />
          </label>
          <p className="muted">
            {pending.length} pendiente{pending.length === 1 ? "" : "s"} · seleccionado {formatUsd(selectedTotal)}
          </p>
        </div>

        <div className="plan-schedule">
          <table>
            <thead>
              <tr>
                <th>
                  <input
                    aria-label="Seleccionar todos"
                    checked={pending.length > 0 && pending.every((item) => selected.has(item.id))}
                    onChange={(event) =>
                      setSelected(event.target.checked ? new Set(pending.map((item) => item.id)) : new Set())
                    }
                    type="checkbox"
                  />
                </th>
                <th>Miembro</th>
                <th>Cuenta</th>
                <th>Cuota</th>
                <th>Abono</th>
                <th>Débito</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="muted" colSpan={7}>
                    Cargando débitos...
                  </td>
                </tr>
              ) : null}
              {!isLoading &&
                items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <input
                        aria-label={`Seleccionar ${item.member_name}`}
                        checked={selected.has(item.id)}
                        disabled={item.status !== "pending"}
                        onChange={() => toggle(item.id)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <strong>{item.member_name}</strong>
                      <span className="table-subtitle">{item.identifier}</span>
                    </td>
                    <td>
                      {item.bank.bank_name}
                      <span className="table-subtitle">
                        {item.bank.account_type} {item.bank.account_number}
                      </span>
                    </td>
                    <td>{formatUsd(item.fee_amount)}</td>
                    <td>{Number(item.debt_amount) > 0 ? formatUsd(item.debt_amount) : "—"}</td>
                    <td>
                      <strong>{formatUsd(item.total_amount)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge status-badge-${statusVariant(item.status)}`}>
                        {installmentStatusLabel(item.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              {!isLoading && items.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={7}>
                    No hay débitos de convenio para {periodLabel(period)}.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {notice ? <p className="admin-payments-agreement-line">{notice}</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
          <button
            className="danger-button"
            disabled={selected.size === 0 || isSubmitting}
            onClick={() => void confirm("failed")}
            type="button"
          >
            Marcar fallidos
          </button>
          <button
            className="primary-button"
            disabled={selected.size === 0 || isSubmitting}
            onClick={() => void confirm("debited")}
            type="button"
          >
            {isSubmitting ? "Guardando..." : "Confirmar debitados"}
          </button>
        </div>
      </div>
    </div>
  );
}
