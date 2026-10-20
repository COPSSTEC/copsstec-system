"use client";

import { useCallback, useEffect, useState } from "react";
import type { SstCalculatorAccessResponse } from "../../domain/types";
import { getSstCalculatorAccess } from "../../infrastructure/sst-calculator-api";

export function useSstCalculatorAccess(enabled = true) {
  const [access, setAccess] = useState<SstCalculatorAccessResponse | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true); setError(null);
    try { setAccess(await getSstCalculatorAccess()); }
    catch (cause) { setAccess(null); setError(cause instanceof Error ? cause.message : "No se pudo validar el acceso."); }
    finally { setLoading(false); }
  }, [enabled]);
  useEffect(() => { void refresh(); }, [refresh]);
  return { access, loading, error, refresh };
}
