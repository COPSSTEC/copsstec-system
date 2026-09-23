"use client";

import { useEffect, useMemo, useState } from "react";

import {
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  PAYMENT_TYPES,
  PAYMENT_TYPE_LABELS,
  formatUsd,
  paymentTypeLabel,
  type MemberSubscriptionRow,
  type Payment,
} from "@/modules/payments/domain/types";
import { AdminMembershipWorkspace } from "@/modules/payments/presentation/components/admin-membership-workspace";
import { AdminPaymentsKpis } from "@/modules/payments/presentation/components/admin-payments-kpis";
import { PaymentStatusBadge } from "@/modules/payments/presentation/components/payment-status-badge";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import { useAdminPayments } from "@/modules/payments/presentation/hooks/use-admin-payments";
import { ApproveRenewalModal } from "@/modules/payments/presentation/modals/approve-renewal-modal";
import { SelectMemberModal } from "@/modules/payments/presentation/modals/select-member-modal";
import { SendAgreementModal } from "@/modules/payments/presentation/modals/send-agreement-modal";
import { DataTable, type DataTableColumn } from "@/shared/components/data-table";
import { RoleGate } from "@/shared/components/role-gate";

type AdminTab = "all" | "membership";

export function AdminPaymentsPage() {
  const payments = useAdminPayments();
  const [tab, setTab] = useState<AdminTab>("membership");
  const [reviewTarget, setReviewTarget] = useState<Payment | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberSubscriptionRow | null>(null);
  const [userClosedDetail, setUserClosedDetail] = useState(false);
  const [agreementMember, setAgreementMember] = useState<MemberSubscriptionRow | null>(null);

  useEffect(() => {
    if (tab === "membership") {
      void payments.loadMembership();
    }
  }, [tab, payments.loadMembership]);

  useEffect(() => {
    const items = payments.membership?.subscriptions.items ?? [];
    if (items.length === 0) {
      return;
    }
    if (selectedMember) {
      const fresh = items.find((item) => item.user_id === selectedMember.user_id);
      if (fresh && fresh !== selectedMember) {
        setSelectedMember(fresh);
      }
      return;
    }
    if (!userClosedDetail) {
      setSelectedMember(items[0]);
    }
  }, [payments.membership, selectedMember, userClosedDetail]);

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
              onClick={() => {
                setTab("membership");
                setUserClosedDetail(false);
                setSelectedMember({
                  user_id: row.user_id,
                  member_name: row.member_name || "",
                  identifier: row.identifier || "",
                  coverage_until: null,
                  credit_balance: "0.00",
                  status: "sin_historial",
                  days_overdue: 0,
                  last_payment_at: null,
                  payments_count: 0,
                  open_payment_status: null,
                });
              }}
              type="button"
            >
              Ver
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

  function handleMemberChanged() {
    void payments.loadPayments();
    void payments.loadMembership();
    void payments.loadStats();
  }

  return (
    <RoleGate requiredAccess="admin">
      <section className="admin-payments">
        <header className="admin-payments-hero">
          <div className="admin-payments-heading">
            <span className="admin-payments-heading-icon">
              <PaymentUiIcon name="wallet" />
            </span>
            <div>
              <h1>Pagos</h1>
              <p>Gestiona los pagos del colegio, renovaciones, membresías y vouchers de suscripción.</p>
            </div>
          </div>
          <button className="create-button" onClick={() => setPickerOpen(true)} type="button">
            <PaymentUiIcon name="plus" />
            Registrar pago
          </button>
        </header>

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

        <AdminPaymentsKpis isLoading={payments.isStatsLoading} stats={payments.stats} />

        <div className="admin-payments-tabs" role="tablist">
          <button
            aria-selected={tab === "all"}
            className={tab === "all" ? "is-active" : ""}
            onClick={() => setTab("all")}
            role="tab"
            type="button"
          >
            <span className="admin-payments-tab-icon">
              <PaymentUiIcon name="invoice" />
            </span>
            <span>
              <strong>
                Todos los pagos
                <em>{payments.stats?.payments_total ?? payments.total}</em>
              </strong>
              <small>Todas las transacciones del colegio</small>
            </span>
          </button>
          <button
            aria-selected={tab === "membership"}
            className={tab === "membership" ? "is-active" : ""}
            onClick={() => setTab("membership")}
            role="tab"
            type="button"
          >
            <span className="admin-payments-tab-icon">
              <PaymentUiIcon name="users" />
            </span>
            <span>
              <strong>Membresías por miembro</strong>
              <small>Estado de membresía y pagos por miembro</small>
            </span>
          </button>
        </div>

        {tab === "all" ? (
          <section className="admin-payments-card">
            <header className="admin-payments-card-head">
              <div>
                <h2>Todos los pagos</h2>
                <p>Filtra y revisa las transacciones registradas en el colegio.</p>
              </div>
            </header>
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
          </section>
        ) : (
          <AdminMembershipWorkspace
            balanceStatus={payments.balanceStatus}
            data={payments.membership}
            isLoading={payments.isMembershipLoading}
            onBalanceStatusChange={payments.setBalanceStatus}
            onChanged={handleMemberChanged}
            onClearFilters={() => {
              payments.setMembershipQ("");
              payments.setSubscriptionStatus("");
              payments.setBalanceStatus("");
              payments.setMembershipPeriod("");
              payments.setAgreementStatus("");
              payments.setMembershipPage(1);
            }}
            onPageChange={payments.setMembershipPage}
            onPageSizeChange={payments.setMembershipPageSize}
            onPeriodChange={payments.setMembershipPeriod}
            onQueryChange={payments.setMembershipQ}
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
            onSelect={(member) => {
              setUserClosedDetail(member == null);
              setSelectedMember(member);
            }}
            onSendAgreement={setAgreementMember}
            onStatusChange={payments.setSubscriptionStatus}
            page={payments.membershipPage}
            pageSize={payments.membershipPageSize}
            period={payments.membershipPeriod}
            q={payments.membershipQ}
            selected={selectedMember}
            subscriptionStatus={payments.subscriptionStatus}
          />
        )}
      </section>

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
          setTab("membership");
          setUserClosedDetail(false);
          setSelectedMember({
            user_id: member.user_id,
            member_name: `${member.names} ${member.lastname}`.trim(),
            identifier: "",
            coverage_until: null,
            credit_balance: "0.00",
            status: "sin_historial",
            days_overdue: 0,
            last_payment_at: null,
            payments_count: 0,
            open_payment_status: null,
          });
        }}
        open={pickerOpen}
      />

      {agreementMember ? (
        <SendAgreementModal
          error={payments.error}
          isSubmitting={payments.isMutating}
          member={{
            user_id: agreementMember.user_id,
            member_name: agreementMember.member_name,
            email: agreementMember.email,
            pending_balance: agreementMember.pending_balance,
          }}
          onClose={() => setAgreementMember(null)}
          onConfirm={async () => {
            await payments.sendAgreement(agreementMember.user_id);
            setAgreementMember(null);
          }}
        />
      ) : null}
    </RoleGate>
  );
}
