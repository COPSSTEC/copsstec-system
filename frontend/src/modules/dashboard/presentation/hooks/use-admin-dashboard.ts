"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import type { AdminDashboardSnapshot, DashboardExportKey } from "@/modules/dashboard/domain/types";
import {
  downloadDashboardExport,
  getAdminDashboard,
} from "@/modules/dashboard/infrastructure/dashboard-api";

export function useAdminDashboard() {
  const token = useMemo(() => getStoredToken(), []);
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<DashboardExportKey | null>(null);

  const reload = useCallback(async () => {
    if (!token) {
      setError("Sesión requerida.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setSnapshot(await getAdminDashboard(token, year));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [token, year]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const download = useCallback(
    async (key: DashboardExportKey) => {
      if (!token) {
        setError("Sesión requerida.");
        return;
      }

      setDownloadingKey(key);
      setError(null);

      try {
        await downloadDashboardExport(token, key, key === "income" ? year : undefined);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo descargar el archivo.");
      } finally {
        setDownloadingKey(null);
      }
    },
    [token, year],
  );

  return {
    snapshot,
    year,
    setYear,
    isLoading,
    error,
    notice,
    setNotice,
    reload,
    download,
    downloadingKey,
  };
}
