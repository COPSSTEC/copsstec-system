"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type {
  MemberPaymentsAdminResponse,
  Payment,
  PaymentWriteInput,
} from "@/modules/payments/domain/types";
import {
  approvePayment,
  createMemberPayment,
  deletePayment,
  listMemberPaymentsAdmin,
  rejectPayment,
  updatePayment,
} from "@/modules/payments/infrastructure/payments-api";

export function useMemberPayments(memberId: number, enabled: boolean) {
  const token = useMemo(() => getStoredToken(), []);
  const [items, setItems] = useState<Payment[]>([]);
  const [subscription, setSubscription] = useState<MemberPaymentsAdminResponse["subscription"]>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !enabled) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await listMemberPaymentsAdmin(token, memberId);
      setItems(result.items ?? []);
      setSubscription(result.subscription ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los pagos del miembro.");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, memberId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const openPayment =
    items.find(
      (item) =>
        item.type === "membresía" &&
        (item.status === "pending_payment" || item.status === "pending_review"),
    ) ?? null;

  async function save(input: PaymentWriteInput) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await createMemberPayment(token, memberId, input);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo guardar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function update(paymentId: number, input: PaymentWriteInput) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await updatePayment(token, paymentId, input);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo actualizar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function remove(paymentId: number) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await deletePayment(token, paymentId);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function approve(paymentId: number) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await approvePayment(token, paymentId);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo aprobar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function reject(paymentId: number, observation: string) {
    if (!token) {
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await rejectPayment(token, paymentId, observation);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo rechazar el pago.";
      setError(message);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }

  return {
    items,
    openPayment,
    subscription,
    isLoading,
    isSubmitting,
    error,
    save,
    update,
    remove,
    approve,
    reject,
    reload: load,
  };
}
