"use client";

import {
  MEMBERSHIP_PERIODS,
  MEMBERSHIP_PERIOD_LABELS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  formatIsoDate,
  memberInitials,
  type BalanceStatus,
  type MemberSubscriptionRow,
  type MembershipPaymentsAdminResponse,
  type MembershipPeriod,
  type PendingVoucher,
  type SubscriptionStatus,
} from "@/modules/payments/domain/types";
import { AdminMemberPaymentPanel } from "@/modules/payments/presentation/components/admin-member-payment-panel";
import { BalanceStatusBadge } from "@/modules/payments/presentation/components/balance-status-badge";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { coverageRange, rowBalanceStatus } from "@/modules/payments/presentation/lib/admin-payments";

interface AdminMembershipWorkspaceProps {
  data: MembershipPaymentsAdminResponse | null;
  isLoading: boolean;
  page: number;
  pageSize: number;
  q: string;
  subscriptionStatus: SubscriptionStatus | "";
  balanceStatus: BalanceStatus | "";
  period: MembershipPeriod | "";
  selected: MemberSubscriptionRow | null;
  onSelect: (member: MemberSubscriptionRow | null) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: SubscriptionStatus | "") => void;
  onBalanceStatusChange: (value: BalanceStatus | "") => void;
  onPeriodChange: (value: MembershipPeriod | "") => void;
  onClearFilters: () => void;
  onChanged: () => void;
  onReview: (voucher: PendingVoucher) => void;
  onSendAgreement: (member: MemberSubscriptionRow) => void;
}

export function AdminMembershipWorkspace({
  data,
  isLoading,
  page,
  pageSize,
  q,
  subscriptionStatus,
  balanceStatus,
  period,
  selected,
  onSelect,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onStatusChange,
  onBalanceStatusChange,
  onPeriodChange,
  onClearFilters,
  onChanged,
  onReview,
  onSendAgreement,
}: AdminMembershipWorkspaceProps) {
  const rows = data?.subscriptions.items ?? [];
  const total = data?.subscriptions.total ?? 0;
  const pending = data?.pending_vouchers ?? [];
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="admin-payments-workspace">
      {pending.length > 0 ? (
        <div className="admin-payments-pending-strip">
          <PaymentUiIcon name="clock" />
          <p>
            Hay {pending.length} voucher{pending.length === 1 ? "" : "s"} de renovación en revisión.
          </p>
          <button className="secondary-button" onClick={() => onReview(pending[0])} type="button">
            Revisar
          </button>
        </div>
      ) : null}

      <div className="admin-payments-split">
        <section className="admin-payments-card admin-payments-list">
          <header className="admin-payments-card-head">
            <div>
              <h2>Miembros</h2>
              <p>Cobertura y estado de membresía de cada miembro.</p>
            </div>
          </header>

          <div className="admin-payments-toolbar">
            <label className="search-field admin-payments-search">
              <PaymentUiIcon name="search" />
              <span className="sr-only">Buscar por nombre o cédula</span>
              <input
                onChange={(event) => {
                  onQueryChange(event.target.value);
                  onPageChange(1);
                }}
                placeholder="Buscar por nombre o cédula"
                type="search"
                value={q}
              />
            </label>
            <label className="field">
              <span className="sr-only">Estado</span>
              <select
                onChange={(event) => {
                  onStatusChange(event.target.value as SubscriptionStatus | "");
                  onPageChange(1);
                }}
                value={subscriptionStatus}
              >
                <option value="">Todos los estados</option>
                {SUBSCRIPTION_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {SUBSCRIPTION_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="sr-only">Fechas</span>
              <select
                onChange={(event) => {
                  onPeriodChange(event.target.value as MembershipPeriod | "");
                  onPageChange(1);
                }}
                value={period}
              >
                <option value="">Todas las fechas</option>
                {MEMBERSHIP_PERIODS.map((item) => (
                  <option key={item} value={item}>
                    {MEMBERSHIP_PERIOD_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-payments-toggle">
              <input
                checked={balanceStatus === "saldo_pendiente"}
                onChange={(event) => {
                  onBalanceStatusChange(event.target.checked ? "saldo_pendiente" : "");
                  onPageChange(1);
                }}
                type="checkbox"
              />
              solo saldo
            </label>
            <button className="secondary-button" onClick={onClearFilters} type="button">
              Limpiar
            </button>
          </div>

          <div className="admin-payments-table-wrap">
            <table className="admin-payments-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Cobertura / vigencia</th>
                  <th>Saldo pendiente</th>
                  <th>Estado</th>
                  <th>Mora</th>
                  <th>Último pago</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="muted" colSpan={7}>
                      Cargando miembros...
                    </td>
                  </tr>
                ) : null}
                {!isLoading &&
                  rows.map((row) => (
                    <tr
                      className={row.user_id === selected?.user_id ? "is-selected" : ""}
                      key={row.user_id}
                      onClick={() => onSelect(row)}
                    >
                      <td>
                        <div className="admin-payments-member">
                          <span className="admin-payments-avatar">{memberInitials(row.member_name)}</span>
                          <div>
                            <strong>{row.member_name}</strong>
                            <p>{row.identifier || "Sin cédula"}</p>
                          </div>
                        </div>
                      </td>
                      <td>{coverageRange(row)}</td>
                      <td>
                        <BalanceStatusBadge amount={row.pending_balance} status={rowBalanceStatus(row)} />
                      </td>
                      <td>
                        <SubscriptionStatusBadge status={row.status} />
                      </td>
                      <td>{row.days_overdue > 0 ? `${row.days_overdue} días` : "—"}</td>
                      <td>{formatIsoDate(row.last_payment_at)}</td>
                      <td>
                        <button
                          className="secondary-button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onSelect(row);
                          }}
                          type="button"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td className="muted" colSpan={7}>
                      No hay miembros con esos filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <footer className="admin-payments-pager">
            <p>
              Mostrando {from}–{to} de {total}
            </p>
            <div className="admin-payments-pager-tools">
              <select
                onChange={(event) => {
                  onPageSizeChange(Number(event.target.value));
                  onPageChange(1);
                }}
                value={pageSize}
              >
                {[10, 15, 25, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
              <div className="admin-payments-pages">
                <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} type="button">
                  ‹
                </button>
                <span>
                  {page} / {totalPages}
                </span>
                <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} type="button">
                  ›
                </button>
              </div>
            </div>
          </footer>
        </section>

        {selected ? (
          <AdminMemberPaymentPanel
            key={selected.user_id}
            member={selected}
            onChanged={onChanged}
            onClose={() => onSelect(null)}
            onSendAgreement={onSendAgreement}
          />
        ) : (
          <aside className="admin-payments-detail is-empty">
            <PaymentUiIcon name="users" />
            <h3>Selecciona un miembro</h3>
            <p>Consulta su cobertura, registra un pago y revisa el historial de membresía.</p>
          </aside>
        )}
      </div>
    </div>
  );
}
