"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import {
  ACCOUNT_TYPES,
  PLAN_INSTALLMENT_OPTIONS,
  currentPeriod,
  formatUsd,
  periodLabel,
  type CreatePaymentPlanResponse,
  type PaymentPlanPreview,
} from "@/modules/payments/domain/types";
import { createPaymentPlan, previewPaymentPlan } from "@/modules/payments/infrastructure/payments-api";
import { PlanScheduleTable } from "@/modules/payments/presentation/components/plan-schedule-table";
import { planMessageParagraphs, startPeriodOptions } from "@/modules/payments/presentation/lib/payment-plans";

interface CreatePaymentPlanModalProps {
  memberId: number;
  memberName: string;
  onClose: () => void;
  onCreated: (result: CreatePaymentPlanResponse) => void;
}

export function CreatePaymentPlanModal({ memberId, memberName, onClose, onCreated }: CreatePaymentPlanModalProps) {
  const [installment, setInstallment] = useState<string>(PLAN_INSTALLMENT_OPTIONS[0]);
  const [startPeriod, setStartPeriod] = useState(currentPeriod(1));
  const [bankName, setBankName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const bankTouched = useRef(false);
  const [preview, setPreview] = useState<PaymentPlanPreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError("");
    previewPaymentPlan(token, memberId, installment, startPeriod)
      .then((result) => {
        if (cancelled) {
          return;
        }
        setPreview(result);
        if (!bankTouched.current) {
          setBankName(result.bank.bank_name);
          setAccountType(result.bank.account_type);
          setAccountNumber(result.bank.account_number);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setPreview(null);
          setError(err instanceof Error ? err.message : "No se pudo calcular el convenio.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [installment, memberId, startPeriod]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = getStoredToken();
    if (!token || !preview) {
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createPaymentPlan(token, memberId, {
        installment_amount: installment,
        start_period: startPeriod,
        bank_name: bankName.trim(),
        account_type: accountType,
        account_number: accountNumber.trim(),
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el convenio.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const paragraphs = preview ? planMessageParagraphs(preview, preview.schedule) : [];

  return (
    <div className="modal-backdrop">
      <form className="confirm-dialog payment-plan-dialog" onSubmit={(event) => void handleSubmit(event)}>
        <h2>Crear convenio de pago</h2>
        <p className="muted">
          {memberName}: la deuda se congela al mes anterior al inicio y se cobra junto con la cuota mensual,
          del 1 al 5 de cada mes.
        </p>

        <div className="admin-payments-form-grid">
          <label className="field">
            Abono mensual a la deuda
            <select onChange={(event) => setInstallment(event.target.value)} value={installment}>
              {PLAN_INSTALLMENT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {formatUsd(option)} adicionales
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Mes de inicio
            <select onChange={(event) => setStartPeriod(event.target.value)} value={startPeriod}>
              {startPeriodOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Banco o cooperativa
            <input
              onChange={(event) => {
                bankTouched.current = true;
                setBankName(event.target.value);
              }}
              required
              value={bankName}
            />
          </label>
          <label className="field">
            Tipo de cuenta
            <select
              onChange={(event) => {
                bankTouched.current = true;
                setAccountType(event.target.value);
              }}
              required
              value={accountType}
            >
              <option value="">Selecciona</option>
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Número de cuenta
            <input
              inputMode="numeric"
              onChange={(event) => {
                bankTouched.current = true;
                setAccountNumber(event.target.value);
              }}
              required
              value={accountNumber}
            />
          </label>
          <div className="payment-plan-total">
            <span>Deuda congelada</span>
            <strong>{preview ? formatUsd(preview.debt_total) : "—"}</strong>
          </div>
        </div>

        {isLoading ? <p className="muted">Calculando calendario...</p> : null}
        {preview ? (
          <>
            <div className="payment-plan-message">
              {paragraphs.map((paragraph) => (
                <p className={paragraph.startsWith("•") ? "is-bullet" : ""} key={paragraph}>
                  {paragraph}
                </p>
              ))}
            </div>
            <PlanScheduleTable items={preview.schedule} />
            <p className="muted">
              Se enviará este detalle a {preview.email || "su correo (no registrado)"}. Termina en{" "}
              {periodLabel(preview.end_period)}.
            </p>
          </>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}

        <div className="table-actions">
          <button className="secondary-button" onClick={onClose} type="button">
            Cancelar
          </button>
          <button className="primary-button" disabled={!preview || isLoading || isSubmitting} type="submit">
            {isSubmitting ? "Creando..." : "Crear convenio y enviar correo"}
          </button>
        </div>
      </form>
    </div>
  );
}
