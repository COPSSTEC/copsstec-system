"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type {
  OpenPayment,
  Payment,
  RenewalPaymentInfo,
  RenewalPlan,
  SubscriptionSummary,
} from "@/modules/payments/domain/types";
import {
  createMyRenewal,
  listMyPayments,
  uploadMyVoucher,
} from "@/modules/payments/infrastructure/payments-api";

export function useMyPayments(enabled = true) {
  const token = useMemo(() => getStoredToken(), []);
  const [items, setItems] = useState<Payment[]>([]);
  const [openPayment, setOpenPayment] = useState<OpenPayment | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<RenewalPaymentInfo | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listMyPayments(token);
      setItems(result.items ?? []);
      setOpenPayment(result.open_payment ?? null);
      setPaymentInfo(result.payment_info ?? null);
      setSubscription(result.subscription ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar tus pagos.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function choosePlan(plan: RenewalPlan): Promise<OpenPayment | null> {
    if (!token) {
      return null;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const created = await createMyRenewal(token, plan);
      setOpenPayment(created);
      await load();
      return created;
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo crear la renovación.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadVoucher(file: File, plan: RenewalPlan = "monthly") {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      let paymentId =
        openPayment && openPayment.status === "pending_review" ? openPayment.id : null;
      if (!paymentId) {
        const created = await createMyRenewal(token, plan);
        paymentId = created.id;
        setOpenPayment(created);
      }
      await uploadMyVoucher(token, paymentId, file);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo subir el comprobante.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  const history = items.filter(
    (item) => item.status === "approved" || item.status === "rejected",
  );

  return {
    items,
    history,
    openPayment,
    paymentInfo,
    subscription,
    isLoading,
    isSubmitting,
    error,
    choosePlan,
    uploadVoucher,
    reload: load,
  };
}
