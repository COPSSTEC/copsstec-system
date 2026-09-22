"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { memberNeedsRenewal, paymentTypeLabel, type Payment } from "@/modules/payments/domain/types";
import { MemberPaymentKpis } from "@/modules/payments/presentation/components/member-payment-kpis";
import { MemberPaymentPanel } from "@/modules/payments/presentation/components/member-payment-panel";
import { MemberPaymentRow } from "@/modules/payments/presentation/components/member-payment-row";
import { PaymentUiIcon } from "@/modules/payments/presentation/components/payment-ui-icon";
import { useMyPayments } from "@/modules/payments/presentation/hooks/use-my-payments";
import {
  MEMBER_PAYMENTS_PAGE_SIZE,
  downloadPaymentReceipt,
  matchesMemberPaymentFilters,
  matchesMemberPaymentTab,
  paymentShareText,
  printPaymentReceipt,
  visiblePaymentTypes,
  type MemberPaymentTab,
} from "@/modules/payments/presentation/lib/member-payments";
import { MemberRenewalModal } from "@/modules/payments/presentation/modals/member-renewal-modal";
import { RoleGate } from "@/shared/components/role-gate";
import { useToast } from "@/shared/hooks/use-toast";

const COMPACT_PAYMENTS_QUERY = "(max-width: 1100px)";

export function MemberPaymentsPage() {
  const toast = useToast();
  const payments = useMyPayments();
  const [renewalOpen, setRenewalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [compactLayout, setCompactLayout] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tab, setTab] = useState<MemberPaymentTab>("all");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const [isBusy, setIsBusy] = useState(false);
  const didAutoSelect = useRef(false);

  const needsRenewal = memberNeedsRenewal(payments.subscription, payments.openPayment);
  const inReview = payments.openPayment?.status === "pending_review";

  const filtered = useMemo(
    () =>
      payments.items.filter(
        (item) => matchesMemberPaymentTab(item, tab) && matchesMemberPaymentFilters(item, query, type),
      ),
    [payments.items, query, tab, type],
  );
  const types = useMemo(() => visiblePaymentTypes(payments.items), [payments.items]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / MEMBER_PAYMENTS_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice(
    (currentPage - 1) * MEMBER_PAYMENTS_PAGE_SIZE,
    currentPage * MEMBER_PAYMENTS_PAGE_SIZE,
  );
  const selected = payments.items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    const media = window.matchMedia(COMPACT_PAYMENTS_QUERY);
    const sync = () => setCompactLayout(media.matches);
    sync();
    setLayoutReady(true);
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!layoutReady || didAutoSelect.current || payments.isLoading || payments.items.length === 0) {
      return;
    }
    setSelectedId(payments.items[0].id);
    setPanelOpen(!compactLayout);
    didAutoSelect.current = true;
  }, [compactLayout, layoutReady, payments.isLoading, payments.items]);

  useEffect(() => {
    if (!panelOpen || !compactLayout) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setPanelOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [compactLayout, panelOpen]);

  useEffect(() => {
    setPage(1);
  }, [query, tab, type]);

  function selectPayment(payment: Payment) {
    setSelectedId(payment.id);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  async function downloadReceipt(payment: Payment) {
    setIsBusy(true);
    try {
      await downloadPaymentReceipt(payment);
      toast.success("Comprobante descargado correctamente.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar el comprobante.");
    } finally {
      setIsBusy(false);
    }
  }

  function printReceipt(payment: Payment) {
    try {
      printPaymentReceipt(payment, payments.subscription);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo abrir la impresión.");
    }
  }

  async function sharePayment(payment: Payment) {
    const text = paymentShareText(payment);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Comprobante COPSSTEC", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Datos del pago copiados.");
    } catch {
      toast.info(text, "Comprobante de pago");
    }
  }

  return (
    <RoleGate requiredAccess="member">
      <section className="page-heading page-heading-actions member-payments-heading">
        <div>
          <h1>Mis pagos</h1>
          <p>Consulta tu cobertura, revisa tus pagos y mantente al día con tu membresía.</p>
        </div>
        {needsRenewal ? (
          <button className="create-button" onClick={() => setRenewalOpen(true)} type="button">
            {inReview ? "Ver comprobante" : "Pagar cuota"}
          </button>
        ) : null}
      </section>

      {payments.error ? (
        <div className="action-alert action-alert-error">
          <strong>Error</strong>
          <span>{payments.error}</span>
        </div>
      ) : null}

      <MemberPaymentKpis
        isLoading={payments.isLoading}
        items={payments.items}
        subscription={payments.subscription}
      />

      <div className="member-payments-toolbar">
        <div className="member-payments-tabs" role="tablist">
          <FilterTab
            active={tab === "all"}
            count={countByTab(payments.items, "all", query, type)}
            label="Todos"
            onClick={() => setTab("all")}
          />
          <FilterTab
            active={tab === "pending"}
            count={countByTab(payments.items, "pending", query, type)}
            label="Pendientes"
            onClick={() => setTab("pending")}
          />
          <FilterTab
            active={tab === "paid"}
            count={countByTab(payments.items, "paid", query, type)}
            label="Pagados"
            onClick={() => setTab("paid")}
          />
          <FilterTab
            active={tab === "history"}
            count={countByTab(payments.items, "history", query, type)}
            label="Historial"
            onClick={() => setTab("history")}
          />
        </div>
        <div className="member-payments-tools">
          <label className="member-payments-search">
            <PaymentUiIcon name="search" />
            <input
              aria-label="Buscar pagos"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar pagos..."
              type="search"
              value={query}
            />
          </label>
          <select
            aria-label="Filtrar por concepto"
            className="member-payments-select"
            onChange={(event) => setType(event.target.value)}
            value={type}
          >
            <option value="">Todos los conceptos</option>
            {types.map((item) => (
              <option key={item} value={item}>
                {paymentTypeLabel(item)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={`member-payments-workspace ${panelOpen ? "" : "is-collapsed"}`}>
        <section className="member-payments-main">
          {payments.isLoading ? <p className="muted">Cargando tus pagos...</p> : null}
          {!payments.isLoading && visible.length === 0 ? (
            <p className="muted">No hay pagos para mostrar con esos filtros.</p>
          ) : null}
          <div className="member-payments-list">
            {visible.map((payment) => (
              <MemberPaymentRow
                isSelected={panelOpen && selected?.id === payment.id}
                key={payment.id}
                onSelect={() => selectPayment(payment)}
                payment={payment}
              />
            ))}
          </div>
          {filtered.length > 0 ? (
            <footer className="member-payments-pagination">
              <span>
                Mostrando {visible.length} {visible.length === 1 ? "pago" : "pagos"}
              </span>
              <div>
                <button
                  aria-label="Página anterior"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  type="button"
                >
                  ‹
                </button>
                <strong>{currentPage}</strong>
                <button
                  aria-label="Página siguiente"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  type="button"
                >
                  ›
                </button>
              </div>
            </footer>
          ) : null}
        </section>

        {panelOpen ? (
          <div
            className={`member-payments-sheet ${compactLayout ? "is-overlay" : ""}`}
            onClick={(event) => {
              if (compactLayout && event.target === event.currentTarget) {
                closePanel();
              }
            }}
          >
            <MemberPaymentPanel
              isBusy={isBusy || payments.isSubmitting}
              onClose={closePanel}
              onDownload={() => {
                if (selected) {
                  void downloadReceipt(selected);
                }
              }}
              onPay={
                selected && (selected.status === "pending_payment" || selected.status === "pending_review")
                  ? () => setRenewalOpen(true)
                  : undefined
              }
              onPrint={() => {
                if (selected) {
                  printReceipt(selected);
                }
              }}
              onShare={() => {
                if (selected) {
                  void sharePayment(selected);
                }
              }}
              payment={selected}
              subscription={payments.subscription}
            />
          </div>
        ) : null}
      </div>

      <MemberRenewalModal
        error={payments.error}
        isSubmitting={payments.isSubmitting}
        onClose={() => setRenewalOpen(false)}
        onUpload={async (file, plan) => {
          await payments.uploadVoucher(file, plan);
          setRenewalOpen(false);
          toast.success("Comprobante enviado para revisión.");
        }}
        open={renewalOpen}
        openPayment={payments.openPayment}
        paymentInfo={payments.paymentInfo}
      />
    </RoleGate>
  );
}

function FilterTab({
  active,
  count,
  label,
  onClick,
}: {
  active: boolean;
  count: number;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`member-payments-tab ${active ? "is-active" : ""}`} onClick={onClick} type="button">
      {label} ({count})
    </button>
  );
}

function countByTab(items: Payment[], tab: MemberPaymentTab, query: string, type: string): number {
  return items.filter(
    (item) => matchesMemberPaymentTab(item, tab) && matchesMemberPaymentFilters(item, query, type),
  ).length;
}
