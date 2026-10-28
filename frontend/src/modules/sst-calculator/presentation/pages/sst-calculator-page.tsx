"use client";

import { useCallback, useEffect, useState } from "react";

import type { CiiuActivity, SstCalculatorAccessResponse } from "../../domain/types";
import { getCiiuCatalog, SstCalculatorApiError } from "../../infrastructure/sst-calculator-api";
import { SstAccessGate } from "../components/sst-access-gate";
import { SstCalculatorWizard } from "../components/sst-calculator-wizard";
import { useSstCalculatorAccess } from "../hooks/use-sst-calculator-access";

export function SstCalculatorPage() {
  const { access, loading: accessLoading, error: accessError, refresh } = useSstCalculatorAccess();
  const [catalog, setCatalog] = useState<CiiuActivity[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [revokedAccess, setRevokedAccess] = useState<SstCalculatorAccessResponse | null>(null);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const activities = await getCiiuCatalog();
      setCatalog(activities);
      setRevokedAccess(null);
    } catch (cause) {
      setCatalog(null);
      if (cause instanceof SstCalculatorApiError && cause.status === 403) {
        setRevokedAccess({
          allowed: false,
          balance_status: "saldo_pendiente",
          pending_balance: "0.00",
          reason: cause.message,
        });
      } else {
        setCatalogError(cause instanceof Error ? cause.message : "No se pudo cargar el catálogo CIIU.");
      }
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => {
    if (access?.allowed) {
      void loadCatalog();
    } else {
      setCatalog(null);
    }
  }, [access?.allowed, loadCatalog]);

  const gateAccess = revokedAccess ?? access;
  const loading = accessLoading || (Boolean(access?.allowed) && catalogLoading);
  const error = accessError ?? catalogError;

  return (
    <div className="sst-calculator">
      <SstAccessGate access={gateAccess} error={error} loading={loading}>
        {catalog ? (
          <SstCalculatorWizard catalog={catalog} />
        ) : (
          <section className="sst-state" role="alert">
            <div className="sst-state-icon">!</div>
            <h1>No se pudo abrir Cotiza SST</h1>
            <p>{catalogError ?? "El catálogo CIIU no está disponible en este momento."}</p>
            <button className="sst-button" onClick={() => void loadCatalog()} type="button">
              Reintentar
            </button>
            <button className="sst-button secondary" onClick={() => void refresh()} type="button">
              Volver a validar acceso
            </button>
          </section>
        )}
      </SstAccessGate>
    </div>
  );
}
