"use client";

import { useEffect, useState } from "react";

import {
  getCommitmentVerification,
  type CommitmentVerification,
} from "@/modules/membership/infrastructure/membership-api";
import { AppLogo } from "@/shared/components/app-logo";
import { PublicFooter } from "@/shared/components/public-footer";

interface CommitmentVerificationPageProps {
  digest: string;
}

export function CommitmentVerificationPage({ digest }: CommitmentVerificationPageProps) {
  const [record, setRecord] = useState<CommitmentVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await getCommitmentVerification(digest);
        if (!cancelled) {
          setRecord(data);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Este compromiso no consta en el registro de COPSSTEC.",
          );
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [digest]);

  return (
    <main className="affiliation-page commitment-verify-page">
      <div className="affiliation-top">
        <AppLogo />
      </div>
      <section className="affiliation-card pending-card">
        {error ? (
          <>
            <p className="eyebrow">Verificación de documento</p>
            <h1>Documento no válido</h1>
            <p className="form-error">{error}</p>
            <p className="muted">
              El código QR no coincide con un compromiso emitido por el sistema de afiliación COPSSTEC.
            </p>
          </>
        ) : record === null ? (
          <p>Verificando autenticidad del documento...</p>
        ) : (
          <>
            <p className="eyebrow">Verificación de documento</p>
            <p className="commitment-verify-badge">Documento auténtico</p>
            <h1>Compromiso de afiliación COPSSTEC</h1>
            <p>
              Este archivo fue emitido por el sistema de afiliación. Los datos coinciden con el
              registro institucional.
            </p>
            <dl className="commitment-verify-list">
              <div>
                <dt>Socio / solicitante</dt>
                <dd>{record.names}</dd>
              </div>
              <div>
                <dt>Cédula / pasaporte</dt>
                <dd>{record.identifier}</dd>
              </div>
              <div>
                <dt>Correo de registro</dt>
                <dd>{record.email || "—"}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{record.phone || "—"}</dd>
              </div>
              <div>
                <dt>Número de socio</dt>
                <dd>{record.member_number}</dd>
              </div>
              <div>
                <dt>Código de documento</dt>
                <dd>{record.document_code}</dd>
              </div>
              <div>
                <dt>Fecha y hora de emisión</dt>
                <dd>{record.issued_at_label || record.issued_at}</dd>
              </div>
              <div>
                <dt>Período de compromiso</dt>
                <dd>
                  {record.period_start} a {record.period_end}
                </dd>
              </div>
              <div>
                <dt>Modalidad de aportación</dt>
                <dd>{record.debit_plan_label}</dd>
              </div>
              <div>
                <dt>Versión del documento</dt>
                <dd>{record.document_version}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{record.status}</dd>
              </div>
              <div>
                <dt>Hash SHA-256</dt>
                <dd className="commitment-verify-hash">{record.hash}</dd>
              </div>
            </dl>
          </>
        )}
      </section>
      <PublicFooter />
    </main>
  );
}
