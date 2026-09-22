"use client";

import { useCallback, useEffect, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { MemberDashboardSnapshot } from "@/modules/dashboard/domain/types";
import { getMemberDashboard } from "@/modules/dashboard/infrastructure/dashboard-api";
import { listMyPayments } from "@/modules/payments/infrastructure/payments-api";
import type { SubscriptionSummary } from "@/modules/payments/domain/types";

export function useMemberNewspaper() {
  const [snapshot, setSnapshot] = useState<MemberDashboardSnapshot | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setError("Sesión requerida.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [feed, payments] = await Promise.all([
        getMemberDashboard(token),
        listMyPayments(token).catch(() => null),
      ]);
      setSnapshot(feed);
      setSubscription(payments?.subscription ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el boletín.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { snapshot, subscription, isLoading, error, reload };
}
