"use client";

import { createContext, useCallback, useMemo, useState, type ReactNode } from "react";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: number;
  tone: ToastTone;
  title: string;
  message: string;
}

export interface ToastApi {
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_TITLES: Record<ToastTone, string> = {
  success: "Acción completada",
  error: "Revisa la acción",
  info: "Aviso",
};

const TOAST_TTL_MS = 4500;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string, title?: string) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((current) => [
        ...current.slice(-4),
        { id, tone, title: title ?? DEFAULT_TITLES[tone], message },
      ]);
      window.setTimeout(() => dismiss(id), TOAST_TTL_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, title) => push("success", message, title),
      error: (message, title) => push("error", message, title),
      info: (message, title) => push("info", message, title),
      dismiss,
    }),
    [dismiss, push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-viewport" aria-live="polite">
        {toasts.map((toast) => (
          <article className={`toast toast-${toast.tone}`} key={toast.id} role="status">
            <div>
              <strong>{toast.title}</strong>
              <p>{toast.message}</p>
            </div>
            <button
              aria-label="Cerrar aviso"
              className="toast-close"
              onClick={() => dismiss(toast.id)}
              type="button"
            >
              ×
            </button>
          </article>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
