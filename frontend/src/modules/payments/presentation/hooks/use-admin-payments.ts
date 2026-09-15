"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type {
  AdminPaymentsQuery,
  MembershipPaymentsAdminResponse,
  Payment,
  PaymentStatus,
  SubscriptionStatus,
} from "@/modules/payments/domain/types";
import {
  approvePayment,
  listAdminPayments,
  listMembershipPaymentsAdmin,
  rejectPayment,
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
  const [membershipPageSize, setMembershipPageSize] = useState(15);
  const [membershipQ, setMembershipQ] = useState("");
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | "">("");
  const [isLoading, setIsLoading] = useState(true);
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
      });
      setMembership(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el apartado de membresía.");
    } finally {
      setIsMembershipLoading(false);
    }
  }, [membershipPage, membershipPageSize, membershipQ, subscriptionStatus, token]);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  async function approve(paymentId: number) {
    if (!token) {
      return;
    }
    setIsMutating(true);
    setError(null);
    try {
      await approvePayment(token, paymentId);
      setNotice("El pago fue aprobado y la suscripción se recalculó.");
      await Promise.all([loadPayments(), loadMembership()]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aprobar el pago.";
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
      await Promise.all([loadPayments(), loadMembership()]);
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
    subscriptionStatus,
    isLoading,
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
    setSubscriptionStatus,
    setNotice,
    loadPayments,
    loadMembership,
    approve,
    reject,
  };
}
