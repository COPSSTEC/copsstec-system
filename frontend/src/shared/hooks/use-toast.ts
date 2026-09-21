"use client";

import { useContext } from "react";

import { ToastContext, type ToastApi } from "@/shared/components/toast-provider";

export function useToast(): ToastApi {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider.");
  }

  return context;
}
