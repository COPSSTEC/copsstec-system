"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import {
  PAYMENT_TYPES,
  formatIsoDate,
  formatUsd,
  isoToRegisterDate,
  registerDateToIso,
  todayRegisterDate,
  type Payment,
  type PaymentType,
  type PaymentWriteInput,
} from "@/modules/payments/domain/types";
import { MemberPaymentKpis } from "@/modules/payments/presentation/components/member-payment-kpis";
import { PaymentListItem } from "@/modules/payments/presentation/components/payment-list-item";
import { PaymentTypeSelect } from "@/modules/payments/presentation/components/payment-type-select";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { useMemberPayments } from "@/modules/payments/presentation/hooks/use-member-payments";
import { ApproveRenewalModal } from "@/modules/payments/presentation/modals/approve-renewal-modal";

export type MemberPaymentsModalMode = "register" | "history";

interface MemberPaymentsModalProps {
  member: {
    user_id: number;
    names: string;
    lastname: string;
  };
  open: boolean;
  mode?: MemberPaymentsModalMode;
  onClose: () => void;
}

const EMPTY_FORM: PaymentWriteInput = {
  type: "membresía",
  description: "",
  amount: "",
  date_register: todayRegisterDate(),
};

function isPaymentType(value: string): value is PaymentType {
  return (PAYMENT_TYPES as readonly string[]).includes(value);
}

export function MemberPaymentsModal({
  member,
  open,
  mode = "register",
  onClose,
}: MemberPaymentsModalProps) {
  const payments = useMemberPayments(member.user_id, open);
  const [form, setForm] = useState<PaymentWriteInput>({
    ...EMPTY_FORM,
    date_register: todayRegisterDate(),
  });
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Payment | null>(null);
  const [formVisible, setFormVisible] = useState(mode === "register");
  const typeSelectRef = useRef<HTMLSelectElement | null>(null);
  const isHistory = mode === "history";

  useEffect(() => {
    if (!open) {
      return;
    }
    setForm({ ...EMPTY_FORM, date_register: todayRegisterDate() });
    setEditing(null);
    setDeleteTarget(null);
    setReviewTarget(null);
    setFormVisible(mode === "register");
  }, [open, member.user_id, mode]);

  if (!open) {
    return null;
  }

  function resetForm(options?: { collapse?: boolean }) {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date_register: todayRegisterDate() });
    if (options?.collapse && isHistory) {
      setFormVisible(false);
    }
  }

  function focusForm() {
    resetForm();
    setFormVisible(true);
    window.requestAnimationFrame(() => {
      typeSelectRef.current?.focus();
    });
  }

  function startEdit(payment: Payment) {
    setEditing(payment);
    setFormVisible(true);
    setForm({
      type: isPaymentType(payment.type) ? payment.type : "membresía",
      description: payment.description,
      amount: Number(payment.amount).toFixed(2),
      date_register: payment.date_register,
    });
    window.requestAnimationFrame(() => {
      typeSelectRef.current?.focus();
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.type || !form.description.trim() || !(amount > 0) || !form.date_register) {
      return;
    }

    const payload: PaymentWriteInput = {
      type: form.type,
      description: form.description.trim(),
      amount: amount.toFixed(2),
      date_register: form.date_register,
    };

    try {
      if (editing) {
        await payments.update(editing.id, payload);
      } else {
        await payments.save(payload);
      }
      resetForm({ collapse: isHistory });
    } catch {
      return;
    }
  }

  const subscriptionSummary = payments.subscription
    ? {
        coverage_until: payments.subscription.coverage_until,
        credit_balance: payments.subscription.credit_balance,
        status: payments.subscription.status,
        days_overdue: "days_overdue" in payments.subscription ? payments.subscription.days_overdue : 0,
        pending_balance:
          "pending_balance" in payments.subscription ? payments.subscription.pending_balance : undefined,
        balance_status:
          "balance_status" in payments.subscription ? payments.subscription.balance_status : undefined,
      }
    : null;

  return (
    <div className="modal-backdrop">
      <div className={`confirm-dialog member-payments-dialog${isHistory ? " is-history" : ""}`}>
        <div className="member-payments-header">
          <div>
            <h2>{isHistory ? "Historial de pagos" : "Pagos"}</h2>
            <p className="muted">
              {member.names} {member.lastname}
            </p>
          </div>
          <div className="table-actions">
            <button aria-label="Nuevo pago" className="create-button" onClick={focusForm} type="button">
              +
            </button>
            <button className="secondary-button" onClick={onClose} type="button">
              Cerrar
            </button>
          </div>
        </div>
        <p>
          {isHistory
            ? "Consulta los pagos registrados y el estado de la membresía."
            : "Aquí encontrarás los pagos realizados y en proceso."}
        </p>
        {isHistory ? (
          <MemberPaymentKpis
            isLoading={payments.isLoading}
            items={payments.items}
            subscription={subscriptionSummary}
          />
        ) : payments.subscription ? (
          <p className="muted">
            Cobertura: {formatIsoDate(payments.subscription.coverage_until)} · Saldo{" "}
            {formatUsd(payments.subscription.credit_balance)} ·{" "}
            <SubscriptionStatusBadge status={payments.subscription.status} />
          </p>
        ) : null}

        {isHistory && !formVisible ? (
          <div className="member-payments-history-actions">
            <button className="secondary-button" onClick={focusForm} type="button">
              Registrar pago
            </button>
          </div>
        ) : null}

        {formVisible ? (
        <form className="form-stack member-payment-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="member-form-grid">
            <PaymentTypeSelect
              onChange={(value) => setForm((current) => ({ ...current, type: value }))}
              selectRef={typeSelectRef}
              value={form.type}
            />
            <label className="field">
              Descripción
              <input
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                required
                value={form.description}
              />
            </label>
            <label className="field">
              Valor de pago
              <input
                min="0.01"
                onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
                required
                step="0.01"
                type="number"
                value={form.amount}
              />
            </label>
            <label className="field">
              Fecha de pago
              <input
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    date_register: isoToRegisterDate(event.target.value),
                  }))
                }
                required
                type="date"
                value={registerDateToIso(form.date_register)}
              />
            </label>
          </div>
          {payments.error ? <p className="form-error">{payments.error}</p> : null}
          <div className="table-actions">
            <button
              className="secondary-button"
              onClick={() => {
                if (editing) {
                  resetForm();
                  return;
                }
                if (isHistory) {
                  resetForm({ collapse: true });
                  return;
                }
                onClose();
              }}
              type="button"
            >
              Cancelar
            </button>
            <button className="primary-button" disabled={payments.isSubmitting} type="submit">
              {payments.isSubmitting ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
        ) : null}

        {payments.isLoading ? <p className="muted">Cargando pagos...</p> : null}
        <div className="payment-card-list">
          {payments.items.map((payment) => (
            <PaymentListItem
              key={payment.id}
              onDelete={setDeleteTarget}
              onEdit={startEdit}
              onReview={setReviewTarget}
              payment={payment}
            />
          ))}
          {!payments.isLoading && payments.items.length === 0 ? (
            <p className="muted">Este miembro aún no tiene pagos registrados.</p>
          ) : null}
        </div>
      </div>

      {deleteTarget ? (
        <div className="modal-backdrop">
          <div className="confirm-dialog">
            <h2>Eliminar pago</h2>
            <p className="muted">
              Se eliminará “{deleteTarget.description}” por {formatUsd(deleteTarget.amount)}. Si es
              membresía aprobada, la cobertura se recalculará.
            </p>
            <div className="table-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)} type="button">
                Cancelar
              </button>
              <button
                className="danger-button"
                disabled={payments.isSubmitting}
                onClick={() => {
                  void payments.remove(deleteTarget.id).then(() => setDeleteTarget(null));
                }}
                type="button"
              >
                {payments.isSubmitting ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewTarget ? (
        <ApproveRenewalModal
          error={payments.error}
          isSubmitting={payments.isSubmitting}
          onApprove={async (id) => {
            await payments.approve(id);
            setReviewTarget(null);
          }}
          onClose={() => setReviewTarget(null)}
          onReject={async (id, observation) => {
            await payments.reject(id, observation);
            setReviewTarget(null);
          }}
          payment={reviewTarget}
        />
      ) : null}
    </div>
  );
}
