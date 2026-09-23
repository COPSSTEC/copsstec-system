"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  formatIsoDate,
  formatPaymentMethod,
  formatUsd,
  isoToRegisterDate,
  memberInitials,
  paymentMethodFromDigits,
  registerDateToIso,
  todayRegisterDate,
  type MemberSubscriptionRow,
  type Payment,
  type PaymentMethod,
  type PaymentType,
  type PaymentWriteInput,
} from "@/modules/payments/domain/types";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  downloadAdminAgreementDocument,
  paymentVoucherUrl,
} from "@/modules/payments/infrastructure/payments-api";
import { AgreementDocumentsCell } from "@/modules/payments/presentation/components/agreement-documents-cell";
import { AgreementStatusBadge } from "@/modules/payments/presentation/components/agreement-status-badge";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { PaymentTypeSelect } from "@/modules/payments/presentation/components/payment-type-select";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { useMemberPayments } from "@/modules/payments/presentation/hooks/use-member-payments";
import {
  canSendAgreement,
  hasIdentityDocument,
  hasPendingBalance,
  hasSignedAuthorization,
} from "@/modules/payments/presentation/lib/admin-payments";
import { ApproveRenewalModal } from "@/modules/payments/presentation/modals/approve-renewal-modal";

interface AdminMemberPaymentPanelProps {
  member: MemberSubscriptionRow;
  onClose: () => void;
  onChanged: () => void;
  onSendAgreement: (member: MemberSubscriptionRow) => void;
}

const EMPTY_FORM: PaymentWriteInput = {
  type: "membresía",
  description: "Renovación de membresía",
  amount: "120.00",
  date_register: todayRegisterDate(),
  last_digits: "transferencia",
  trans_id: "",
};

export function AdminMemberPaymentPanel({
  member,
  onClose,
  onChanged,
  onSendAgreement,
}: AdminMemberPaymentPanelProps) {
  const payments = useMemberPayments(member.user_id, true);
  const [form, setForm] = useState<PaymentWriteInput>({
    ...EMPTY_FORM,
    date_register: todayRegisterDate(),
  });
  const [editing, setEditing] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Payment | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [docError, setDocError] = useState("");
  const [downloadingDoc, setDownloadingDoc] = useState<"authorization" | "identity" | null>(null);

  const subscription = payments.subscription ?? member;
  const pending = Number(subscription.pending_balance ?? member.pending_balance ?? 0);
  const status = subscription.status || member.status;
  const identifier = member.identifier || ("identifier" in subscription ? subscription.identifier : "");
  const rowForAgreement: MemberSubscriptionRow = {
    ...member,
    pending_balance: subscription.pending_balance ?? member.pending_balance,
    balance_status: subscription.balance_status ?? member.balance_status,
    status,
    email: member.email,
  };

  const history = useMemo(() => {
    const items = showAllHistory
      ? payments.items
      : payments.items.filter((item) => item.type === "membresía" || item.type === "membresia");
    return items.slice(0, showAllHistory ? items.length : 5);
  }, [payments.items, showAllHistory]);

  useEffect(() => {
    setForm({ ...EMPTY_FORM, date_register: todayRegisterDate() });
    setEditing(null);
    setDeleteTarget(null);
    setReviewTarget(null);
    setShowAllHistory(false);
    setDocError("");
    setDownloadingDoc(null);
  }, [member.user_id]);

  async function downloadAgreement(kind: "authorization" | "identity") {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    setDocError("");
    setDownloadingDoc(kind);
    try {
      await downloadAdminAgreementDocument(token, member.user_id, kind);
    } catch (error) {
      setDocError(
        error instanceof Error
          ? error.message
          : "Este miembro aún no ha subido los documentos del acuerdo",
      );
    } finally {
      setDownloadingDoc(null);
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, date_register: todayRegisterDate() });
  }

  function startEdit(payment: Payment) {
    setEditing(payment);
    setForm({
      type: (payment.type === "membresia" ? "membresía" : payment.type) as PaymentType,
      description: payment.description,
      amount: Number(payment.amount).toFixed(2),
      date_register: payment.date_register,
      last_digits: paymentMethodFromDigits(payment.last_digits),
      trans_id: payment.trans_id && payment.trans_id !== "NA" ? payment.trans_id : "",
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
      last_digits: form.last_digits || "transferencia",
      trans_id: form.trans_id?.trim() || "",
    };

    try {
      if (editing) {
        await payments.update(editing.id, payload);
      } else {
        await payments.save(payload);
      }
      resetForm();
      onChanged();
    } catch {
      return;
    }
  }

  return (
    <aside className="admin-payments-detail">
      <header className="admin-payments-detail-head">
        <div className="admin-payments-member">
          <span className="admin-payments-avatar">{memberInitials(member.member_name)}</span>
          <div>
            <strong>{member.member_name}</strong>
            <p>{identifier || "Sin cédula"}</p>
          </div>
        </div>
        <div className="admin-payments-detail-tools">
          <SubscriptionStatusBadge status={status} />
          <button aria-label="Cerrar detalle" className="admin-payments-icon-button" onClick={onClose} type="button">
            <PaymentUiIcon name="close" />
          </button>
        </div>
      </header>

      <section className="admin-payments-detail-block">
        <h3>Datos del miembro</h3>
        <dl className="admin-payments-facts">
          <div>
            <dt>Cobertura vigente hasta</dt>
            <dd>{formatIsoDate(subscription.coverage_until)}</dd>
          </div>
          <div>
            <dt>Saldo pendiente</dt>
            <dd>{formatUsd(subscription.pending_balance ?? "0.00")}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>
              <SubscriptionStatusBadge status={status} />
            </dd>
          </div>
        </dl>
        {hasPendingBalance(rowForAgreement) ? (
          <div className="admin-payments-banner is-warning">
            <PaymentUiIcon name="warning" />
            <div>
              <strong>La membresía tiene saldo pendiente.</strong>
              <p>Debe {formatUsd(pending)} en cuotas de membresía.</p>
            </div>
            {canSendAgreement(rowForAgreement) ? (
              <button className="primary-button send-agreement-button" onClick={() => onSendAgreement(rowForAgreement)} type="button">
                Enviar acuerdo
              </button>
            ) : null}
          </div>
        ) : (
          <div className="admin-payments-banner is-success">
            <PaymentUiIcon name="check" />
            <div>
              <strong>La membresía se encuentra al día.</strong>
              <p>No tiene saldo pendiente.</p>
            </div>
          </div>
        )}
        {member.agreement_status && member.agreement_status !== "none" ? (
          <p className="admin-payments-agreement-line">
            Acuerdo: <AgreementStatusBadge status={member.agreement_status} />
          </p>
        ) : null}
        <div className="admin-payments-docs-block">
          <AgreementDocumentsCell member={member} />
          <div className="admin-payments-docs-actions">
            <button
              className="secondary-button"
              disabled={!hasSignedAuthorization(member) || downloadingDoc !== null}
              onClick={() => void downloadAgreement("authorization")}
              type="button"
            >
              {downloadingDoc === "authorization" ? "Descargando..." : "Descargar ADV"}
            </button>
            <button
              className="secondary-button"
              disabled={!hasIdentityDocument(member) || downloadingDoc !== null}
              onClick={() => void downloadAgreement("identity")}
              type="button"
            >
              {downloadingDoc === "identity" ? "Descargando..." : "Descargar cédula"}
            </button>
          </div>
          {docError ? <p className="admin-payments-docs-error">{docError}</p> : null}
        </div>
      </section>

      <section className="admin-payments-detail-block">
        <h3>Registrar nuevo pago</h3>
        <form className="admin-payments-form" onSubmit={(event) => void handleSubmit(event)}>
          <div className="admin-payments-form-grid">
            <PaymentTypeSelect
              onChange={(value) =>
                setForm((current) => ({
                  ...current,
                  type: value,
                  description:
                    value === "membresía" && !current.description
                      ? "Renovación de membresía"
                      : current.description,
                }))
              }
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
              Valor de pago (US$)
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
            <label className="field">
              Forma de pago
              <select
                onChange={(event) =>
                  setForm((current) => ({ ...current, last_digits: event.target.value as PaymentMethod }))
                }
                value={form.last_digits || "transferencia"}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Número de comprobante
              <input
                onChange={(event) => setForm((current) => ({ ...current, trans_id: event.target.value }))}
                placeholder="TRX001234"
                value={form.trans_id ?? ""}
              />
            </label>
          </div>
          {payments.error ? <p className="form-error">{payments.error}</p> : null}
          <div className="admin-payments-form-actions">
            <button className="secondary-button" onClick={resetForm} type="button">
              Limpiar
            </button>
            <button className="primary-button" disabled={payments.isSubmitting} type="submit">
              <PaymentUiIcon name="plus" />
              {payments.isSubmitting ? "Guardando..." : editing ? "Actualizar pago" : "Guardar pago"}
            </button>
          </div>
        </form>
      </section>

      <section className="admin-payments-detail-block">
        <div className="admin-payments-history-head">
          <h3>
            Historial de pagos de membresía
            <span>{showAllHistory ? payments.items.length : history.length}</span>
          </h3>
          {payments.items.length > history.length || showAllHistory ? (
            <button className="admin-dashboard-text-link" onClick={() => setShowAllHistory((value) => !value)} type="button">
              {showAllHistory ? "Ver membresía" : "Ver todos"}
            </button>
          ) : null}
        </div>
        {payments.isLoading ? <p className="muted">Cargando pagos...</p> : null}
        <div className="admin-payments-history">
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Fecha</th>
                <th>Forma de pago</th>
                <th>Monto</th>
                <th>Estado</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {history.map((payment) => {
                const voucher = paymentVoucherUrl(payment.voucher_url);
                return (
                  <tr key={payment.id}>
                    <td>{payment.description || "Pago"}</td>
                    <td>{payment.date_register || "—"}</td>
                    <td>{formatPaymentMethod(payment.last_digits)}</td>
                    <td>{formatUsd(payment.amount)}</td>
                    <td>
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td>
                      <div className="admin-payments-row-tools">
                        {voucher ? (
                          <a aria-label="Ver voucher" href={voucher} rel="noreferrer" target="_blank">
                            <PaymentUiIcon name="eye" />
                          </a>
                        ) : null}
                        {payment.status === "pending_review" ? (
                          <button aria-label="Revisar pago" onClick={() => setReviewTarget(payment)} type="button">
                            <PaymentUiIcon name="check" />
                          </button>
                        ) : null}
                        <button aria-label="Editar pago" onClick={() => startEdit(payment)} type="button">
                          <PaymentUiIcon name="pencil" />
                        </button>
                        <button
                          aria-label="Eliminar pago"
                          className="is-danger"
                          onClick={() => setDeleteTarget(payment)}
                          type="button"
                        >
                          <PaymentUiIcon name="trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!payments.isLoading && history.length === 0 ? (
                <tr>
                  <td className="muted" colSpan={6}>
                    Este miembro aún no tiene pagos registrados.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

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
                  void payments.remove(deleteTarget.id).then(() => {
                    setDeleteTarget(null);
                    onChanged();
                  });
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
            onChanged();
          }}
          onClose={() => setReviewTarget(null)}
          onReject={async (id, observation) => {
            await payments.reject(id, observation);
            setReviewTarget(null);
            onChanged();
          }}
          payment={reviewTarget}
        />
      ) : null}
    </aside>
  );
}
