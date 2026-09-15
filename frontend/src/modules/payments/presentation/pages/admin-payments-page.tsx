"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  formatUsd,
  paymentTypeLabel,
  type Payment,
} from "@/modules/payments/domain/types";
import { MembershipPaymentsPanel } from "@/modules/payments/presentation/components/membership-payments-panel";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { useAdminPayments } from "@/modules/payments/presentation/hooks/use-admin-payments";
import { ApproveRenewalModal } from "@/modules/payments/presentation/modals/approve-renewal-modal";
import { MemberPaymentsModal } from "@/modules/payments/presentation/modals/member-payments-modal";
import { SelectMemberModal } from "@/modules/payments/presentation/modals/select-member-modal";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { RoleGate } from "@/shared/components/role-gate";

type AdminTab = "all" | "membership";
type PaymentsMember = { user_id: number; names: string; lastname: string };

export function AdminPaymentsPage() {
  const payments = useAdminPayments();
  const [tab, setTab] = useState<AdminTab>("all");
  const [reviewTarget, setReviewTarget] = useState<Payment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [paymentsMember, setPaymentsMember] = useState<PaymentsMember | null>(null);

  useEffect(() => {
    if (tab === "membership") {
      void payments.loadMembership();
    }
  }, [tab, payments.loadMembership]);

  const columns = useMemo<DataTableColumn<Payment>[]>(
    () => [
      {
        id: "member",
        header: "Miembro",
        sortable: true,
        filterable: false,
        cell: (row) => (
          <div>
            <strong>{row.member_name || "—"}</strong>
            <span className="table-subtitle">{row.identifier || ""}</span>
          </div>
        ),
      },
      {
        id: "type",
        header: "Tipo",
        sortable: false,
        filterable: true,
        filterType: "select",
        filterOptions: PAYMENT_TYPES.map((type) => ({
          value: type,
          label: PAYMENT_TYPE_LABELS[type],
        })),
        cell: (row) => paymentTypeLabel(row.type),
      },
      {
        id: "description",
        header: "Descripción",
        sortable: false,
        filterable: false,
        cell: (row) => row.description || "—",
      },
      {
        id: "amount",
        header: "Monto",
        sortable: true,
        filterable: false,
        cell: (row) => formatUsd(row.amount),
      },
      {
        id: "date_register",
        header: "Fecha",
        sortable: true,
        filterable: true,
        filterType: "date-range",
        cell: (row) => row.date_register || "—",
      },
      {
        id: "status",
        header: "Estado",
        sortable: false,
        filterable: true,
        filterType: "select",
        filterOptions: PAYMENT_STATUSES.map((status) => ({
          value: status,
          label: PAYMENT_STATUS_LABELS[status],
        })),
        cell: (row) => <PaymentStatusBadge status={row.status} />,
      },
      {
        id: "actions",
        header: "Acciones",
        sortable: false,
        filterable: false,
        hideable: false,
        width: "160px",
        cell: (row) => (
          <div className="table-actions">
            {row.status === "pending_review" ? (
              <button className="primary-button" onClick={() => setReviewTarget(row)} type="button">
                Revisar
              </button>
            ) : null}
            <button
              className="secondary-button"
              onClick={() =>
                setPaymentsMember({
                  user_id: row.user_id,
                  names: row.member_name || "",
                  lastname: "",
                })
              }
              type="button"
            >
              Pagos
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  function handleFilterChange(columnId: string, value: string) {
    payments.setPage(1);
    payments.setFilters((current) => ({ ...current, [columnId]: value }));
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="page-heading page-heading-actions">
        <div>
          <h1>Pagos</h1>
          <p>Controla los pagos del colegio, vouchers de renovación y el estado de las suscripciones.</p>
        </div>
        <button className="create-button" onClick={() => setPickerOpen(true)} type="button">
          Registrar pago
        </button>
      </section>

      {payments.notice ? (
        <div className="action-alert action-alert-success">
          <strong>Listo</strong>
          <span>{payments.notice}</span>
        </div>
      ) : null}
      {payments.error ? (
        <div className="action-alert action-alert-error">
          <strong>Error</strong>
          <span>{payments.error}</span>
        </div>
      ) : null}

      <div className="payments-tabs" role="tablist">
        <button
          aria-selected={tab === "all"}
          className={tab === "all" ? "is-active" : ""}
          onClick={() => setTab("all")}
          role="tab"
          type="button"
        >
          Todos
        </button>
        <button
          aria-selected={tab === "membership"}
          className={tab === "membership" ? "is-active" : ""}
          onClick={() => setTab("membership")}
          role="tab"
          type="button"
        >
          Membresía
        </button>
      </div>

      {tab === "all" ? (
        <DataTable
          columns={columns}
          data={payments.items}
          emptyMessage="No se encontraron pagos con esos filtros."
          filters={payments.filters}
          isLoading={payments.isLoading}
          onFilterChange={handleFilterChange}
          onPageChange={payments.setPage}
          onPageSizeChange={(size) => {
            payments.setPageSize(size);
            payments.setPage(1);
          }}
          onSortChange={(columnId, direction) => {
            const mapped =
              columnId === "member" ? "names" : columnId === "amount" ? "total" : columnId;
            payments.setSortBy(
              mapped === "names" ||
                mapped === "total" ||
                mapped === "date_register" ||
                mapped === "created_at"
                ? mapped
                : "date_register",
            );
            payments.setSortDir(direction);
            payments.setPage(1);
          }}
          pagination={{ page: payments.page, pageSize: payments.pageSize, total: payments.total }}
          rowKey={(row) => row.id}
          sortBy={
            payments.sortBy === "names"
              ? "member"
              : payments.sortBy === "total"
                ? "amount"
                : payments.sortBy
          }
          sortDir={payments.sortDir}
          toolbar={
            <label className="search-field">
              <span className="sr-only">Buscar por miembro, cédula o descripción</span>
              <input
                onChange={(event) => {
                  payments.setQ(event.target.value);
                  payments.setPage(1);
                }}
                placeholder="Buscar por miembro, cédula o descripción"
                type="search"
                value={payments.q}
              />
            </label>
          }
        />
      ) : (
        <MembershipPaymentsPanel
          data={payments.membership}
          isLoading={payments.isMembershipLoading}
          onPageChange={payments.setMembershipPage}
          onPageSizeChange={payments.setMembershipPageSize}
          onQueryChange={payments.setMembershipQ}
          onRegister={(member) => setPaymentsMember(member)}
          onReview={(voucher) =>
            setReviewTarget({
              id: voucher.id,
              user_id: voucher.user_id,
              member_name: voucher.member_name,
              type: "membresía",
              description: "Renovación de membresía",
              amount: voucher.amount,
              date_register: voucher.date_register,
              last_digits: "any",
              status: voucher.status,
              voucher_url: voucher.voucher_url,
              plan: voucher.plan,
              created_at: voucher.created_at,
            })
          }
          onStatusChange={payments.setSubscriptionStatus}
          page={payments.membershipPage}
          pageSize={payments.membershipPageSize}
          q={payments.membershipQ}
          subscriptionStatus={payments.subscriptionStatus}
        />
      )}

      {reviewTarget ? (
        <ApproveRenewalModal
          error={payments.error}
          isSubmitting={payments.isMutating}
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

      <SelectMemberModal
        onClose={() => setPickerOpen(false)}
        onSelect={(member) => {
          setPickerOpen(false);
          setPaymentsMember(member);
        }}
        open={pickerOpen}
      />

      {paymentsMember ? (
        <MemberPaymentsModal
          member={paymentsMember}
          onClose={() => {
            setPaymentsMember(null);
            void payments.loadPayments();
            if (tab === "membership") {
              void payments.loadMembership();
            }
          }}
          open
        />
      ) : null}
    </RoleGate>
  );
}
