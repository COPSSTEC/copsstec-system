"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { AccessLevel } from "@/modules/auth/domain/types";
import { getCurrentUser } from "@/modules/auth/infrastructure/auth-api";
import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";

interface RoleGateProps {
  requiredAccess: AccessLevel;
  children: React.ReactNode;
}

function canAccess(current: AccessLevel, required: AccessLevel): boolean {
  if (current === "admin") {
    return true;
  }

  return current === required;
}

export function RoleGate({ requiredAccess, children }: RoleGateProps) {
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const token = getStoredToken();

    if (token === null) {
      setStatus("denied");
      return;
    }

    const sessionToken = token;

    async function loadAccess() {
      try {
        const user = await getCurrentUser(sessionToken);
        setStatus(canAccess(user.access_level, requiredAccess) ? "allowed" : "denied");
      } catch {
        setStatus("denied");
      }
    }

    void loadAccess();
  }, [requiredAccess]);

  if (status === "loading") {
    return <p className="muted">Validando acceso...</p>;
  }

  if (status === "denied") {
    return (
      <section className="card">
        <h1>Acceso restringido</h1>
        <p className="muted">Tu rol actual no tiene acceso a esta sección.</p>
        <Link className="primary-button" href="/dashboard">
          Volver al dashboard
        </Link>
      </section>
    );
  }

  return children;
}
