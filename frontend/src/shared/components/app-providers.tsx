"use client";

import type { ReactNode } from "react";

import { ToastProvider } from "@/shared/components/toast-provider";

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
