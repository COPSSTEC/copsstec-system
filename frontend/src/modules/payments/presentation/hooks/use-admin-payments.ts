"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type {
  AdminPaymentStats,
  AdminPaymentsQuery,
  AgreementStatus,
  BalanceStatus,
  MembershipPaymentsAdminResponse,
  MembershipPeriod,
  Payment,
  PaymentStatus,
  SubscriptionStatus,
} from "@/modules/payments/domain/types";
import {
  approvePayment,
  getAdminPaymentStats,
  listAdminPayments,
  listMembershipPaymentsAdmin,
  rejectPayment,
  sendDebitAgreement,
} from "@/modules/payments/infrastructure/payments-api";

export function useAdminPayments() {
  const token = useMemo(() => getStoredToken(), []);
  const [items, setItems] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sortBy, setSortBy] = useState<AdminPaymentsQuery["sortBy"]>("date_register");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [membership, setMembership] = useState<MembershipPaymentsAdminResponse | null>(null);
  const [membershipPage, setMembershipPage] = useState(1);
  const [membershipPageSize, setMembershipPageSize] = useState(10);
  const [membershipQ, setMembershipQ] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | "">("");
  const [balanceStatus, setBalanceStatus] = useState<BalanceStatus | "">("");
  const [agreementStatus, setAgreementStatus] = useState<AgreementStatus | "">("");
  const [membershipPeriod, setMembershipPeriod] = useState<MembershipPeriod | "">("");
  const [stats, setStats] = useState<AdminPaymentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPayments = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listAdminPayments(token, {
        page,
        pageSize,
        q,
        type: filters.type,
        status: filters.status as PaymentStatus | undefined,
        dateFrom: filters.date_register_from,
        dateTo: filters.date_register_to,
        sortBy,
        sortDir,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pagos.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, pageSize, q, sortBy, sortDir, token]);

  const loadMembership = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsMembershipLoading(true);
    setError(null);

    try {
      const result = await listMembershipPaymentsAdmin(token, {
        page: membershipPage,
        pageSize: membershipPageSize,
        q: membershipQ,
        subscriptionStatus,
        balanceStatus,
        agreementStatus,
        period: membershipPeriod,
      });
      setMembership(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el apartado de membresía.");
    } finally {
      setIsMembershipLoading(false);
    }
  }, [
    agreementStatus,
    balanceStatus,
    membershipPage,
    membershipPageSize,
    membershipPeriod,
    membershipQ,
    subscriptionStatus,
    token,
  ]);

  const loadStats = useCallback(async () => {
    if (!token) {
      return;
    }
    setIsStatsLoading(true);
    try {
      setStats(await getAdminPaymentStats(token));
    } catch {
      setStats(null);
    } finally {
      setIsStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  async function approve(paymentId: number) {
    if (!token) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      await approvePayment(token, paymentId);
      setNotice("El pago fue aprobado y la suscripción se recalculó.");
      await Promise.all([loadPayments(), loadMembership(), loadStats()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aprobar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }

  async function sendAgreement(memberId: number) {
    if (!token) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      const result = await sendDebitAgreement(token, memberId);
      setNotice(result.message || "Acuerdo enviado al correo del miembro.");
      await Promise.all([loadMembership(), loadStats()]);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo enviar el acuerdo.";
      setError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }

  async function reject(paymentId: number, observation: string) {
    if (!token) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      await rejectPayment(token, paymentId, observation);
      setNotice("El voucher fue rechazado. El miembro puede volver a subir el comprobante.");
      await Promise.all([loadPayments(), loadMembership(), loadStats()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo rechazar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }

  return {
    token,
    items,
    total,
    page,
    pageSize,
    sortBy,
    sortDir,
    q,
    filters,
    membership,
    membershipPage,
    membershipPageSize,
    membershipQ,
    membershipPeriod,
    subscriptionStatus,
    balanceStatus,
    agreementStatus,
    stats,
    isLoading,
    isStatsLoading,
    isMembershipLoading,
    isMutating,
    error,
    notice,
    setPage,
    setPageSize,
    setSortBy,
    setSortDir,
    setQ,
    setFilters,
    setMembershipPage,
    setMembershipPageSize,
    setMembershipQ,
    setMembershipPeriod,
    setSubscriptionStatus,
    setBalanceStatus,
    setAgreementStatus,
    setNotice,
    loadPayments,
    loadMembership,
    loadStats,
    approve,
    reject,
    sendAgreement,
  };
}
