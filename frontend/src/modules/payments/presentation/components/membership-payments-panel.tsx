"use client";

import {
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_STATUS_LABELS,
  formatIsoDate,
  formatUsd,
  type AffiliationPaymentRow,
  type MembershipPaymentsAdminResponse,
  type PendingVoucher,
  type SubscriptionStatus,
} from "@/modules/payments/domain/types";
import { paymentVoucherUrl } from "@/modules/payments/infrastructure/payments-api";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { SubscriptionStatusBadge } from "@/modules/payments/presentation/components/subscription-status-badge";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";

interface MembershipPaymentsPanelProps {
  data: MembershipPaymentsAdminResponse | null;
  isLoading: boolean;
  page: number;
  pageSize: number;
  q: string;
  subscriptionStatus: SubscriptionStatus | "";
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: SubscriptionStatus | "") => void;
  onReview: (voucher: PendingVoucher) => void;
  onRegister: (member: { user_id: number; names: string; lastname: string }) => void;
}

export function MembershipPaymentsPanel({
  data,
  isLoading,
  page,
  pageSize,
  q,
  subscriptionStatus,
  onPageChange,
  onPageSizeChange,
  onQueryChange,
  onStatusChange,
  onReview,
  onRegister,
}: MembershipPaymentsPanelProps) {
  const subscriptions = data?.subscriptions.items ?? [];
  const pending = data?.pending_vouchers ?? [];
  const affiliations = data?.affiliations ?? [];

  const columns: DataTableColumn<(typeof subscriptions)[number]>[] = [
    {
      id: "member",
      header: "Miembro",
      sortable: false,
      filterable: false,
      cell: (row) => (
        <div>
          <strong>{row.member_name}</strong>
          <span className="table-subtitle">{row.identifier}</span>
        </div>
      ),
    },
    {
      id: "coverage",
      header: "Cobertura",
      sortable: false,
      filterable: false,
      cell: (row) => formatIsoDate(row.coverage_until),
    },
    {
      id: "credit",
      header: "Saldo",
      sortable: false,
      filterable: false,
      cell: (row) => formatUsd(row.credit_balance),
    },
    {
      id: "status",
      header: "Estado",
      sortable: false,
      filterable: false,
      cell: (row) => <SubscriptionStatusBadge status={row.status} />,
    },
    {
      id: "overdue",
      header: "Mora",
      sortable: false,
      filterable: false,
      cell: (row) => (row.days_overdue > 0 ? `${row.days_overdue} días` : "—"),
    },
    {
      id: "open",
      header: "Pago abierto",
      sortable: false,
      filterable: false,
      cell: (row) =>
        row.open_payment_status ? <PaymentStatusBadge status={row.open_payment_status} /> : "—",
    },
    {
      id: "count",
      header: "Pagos",
      sortable: false,
      filterable: false,
      cell: (row) => row.payments_count,
    },
    {
      id: "actions",
      header: "Acciones",
      sortable: false,
      filterable: false,
      hideable: false,
      width: "140px",
      cell: (row) => (
        <button
          className="secondary-button"
          onClick={() =>
            onRegister({
              user_id: row.user_id,
              names: row.member_name,
              lastname: "",
            })
          }
          type="button"
        >
          Registrar
        </button>
      ),
    },
  ];

  return (
    <div className="membership-payments-panel">
      <section className="card">
        <h2>Vouchers pendientes</h2>
        <p className="muted">Renovaciones en revisión que requieren aprobación del administrador.</p>
        {pending.length === 0 ? (
          <p className="muted">No hay vouchers pendientes de revisión.</p>
        ) : (
          <div className="pending-voucher-list">
            {pending.map((voucher) => (
              <PendingVoucherCard key={voucher.id} onReview={onReview} voucher={voucher} />
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2>Suscripciones</h2>
        <p className="muted">Cobertura, saldo a favor y estado de mora de cada miembro.</p>
        <DataTable
          columns={columns}
          data={subscriptions}
          emptyMessage="No hay suscripciones con esos filtros."
          isLoading={isLoading}
          onPageChange={onPageChange}
          onPageSizeChange={(size) => {
            onPageSizeChange(size);
            onPageChange(1);
          }}
          pagination={{
            page,
            pageSize,
            total: data?.subscriptions.total ?? 0,
          }}
          rowKey={(row) => row.user_id}
          toolbar={
            <div className="membership-toolbar">
              <label className="search-field">
                <span className="sr-only">Buscar miembro</span>
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
                Estado
                <select
                  onChange={(event) => {
                    onStatusChange(event.target.value as SubscriptionStatus | "");
                    onPageChange(1);
                  }}
                  value={subscriptionStatus}
                >
                  <option value="">Todos</option>
                  {SUBSCRIPTION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SUBSCRIPTION_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </section>

      <section className="card">
        <h2>Afiliaciones</h2>
        <p className="muted">Vouchers de afiliación (membership_payments).</p>
        {affiliations.length === 0 ? (
          <p className="muted">No hay afiliaciones registradas.</p>
        ) : (
          <div className="pending-voucher-list">
            {affiliations.map((item) => (
              <AffiliationCard affiliation={item} key={`${item.user_id}-${item.created_at}`} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PendingVoucherCard({
  voucher,
  onReview,
}: {
  voucher: PendingVoucher;
  onReview: (voucher: PendingVoucher) => void;
}) {
  const voucherUrl = paymentVoucherUrl(voucher.voucher_url);

  return (
    <article className="payment-card">
      <div className="payment-card-top">
        <div>
          <strong>{voucher.member_name}</strong>
          <div className="payment-card-meta">
            <PaymentStatusBadge status={voucher.status} />
          </div>
        </div>
        <span className="payment-card-amount">{formatUsd(voucher.amount)}</span>
      </div>
      <p className="payment-card-line">Fecha de pago: {voucher.date_register || "—"}</p>
      {voucher.plan ? (
        <p className="payment-card-line">Plan: {voucher.plan === "yearly" ? "Anual" : "Mensual"}</p>
      ) : null}
      <div className="payment-card-voucher">
        {voucherUrl ? (
          <a href={voucherUrl} rel="noreferrer" target="_blank">
            <img alt={`Voucher de ${voucher.member_name}`} className="voucher-thumb" src={voucherUrl} />
            Ver voucher
          </a>
        ) : (
          <span className="muted">Sin voucher</span>
        )}
        <div className="table-actions">
          <button className="primary-button" onClick={() => onReview(voucher)} type="button">
            Aprobar
          </button>
          <button className="danger-button" onClick={() => onReview(voucher)} type="button">
            Rechazar
          </button>
        </div>
      </div>
    </article>
  );
}

function AffiliationCard({ affiliation }: { affiliation: AffiliationPaymentRow }) {
  const voucherUrl = paymentVoucherUrl(affiliation.voucher_url);

  return (
    <article className="payment-card">
      <div className="payment-card-top">
        <div>
          <strong>{affiliation.member_name}</strong>
          <div className="payment-card-meta">
            <PaymentStatusBadge status={affiliation.status} />
          </div>
        </div>
        <span className="payment-card-amount">{formatUsd(affiliation.amount)}</span>
      </div>
      <p className="payment-card-line">
        Registrado: {affiliation.created_at ? new Date(affiliation.created_at).toLocaleString("es-EC") : "—"}
      </p>
      {voucherUrl ? (
        <a href={voucherUrl} rel="noreferrer" target="_blank">
          Ver voucher de afiliación
        </a>
      ) : (
        <span className="muted">Sin voucher</span>
      )}
    </article>
  );
}
