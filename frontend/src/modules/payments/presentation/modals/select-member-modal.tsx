"use client";

import { useEffect, useMemo, useState } from "react";

import { getStoredToken } from "@/modules/auth/infrastructure/auth-storage";
import { listMembers } from "@/modules/members/infrastructure/members-api";
import type { Member } from "@/modules/members/domain/types";

interface SelectMemberModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (member: { user_id: number; names: string; lastname: string }) => void;
}

export function SelectMemberModal({ open, onClose, onSelect }: SelectMemberModalProps) {
  const token = useMemo(() => getStoredToken(), []);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !token) {
      return;
    }

    const handle = window.setTimeout(() => {
      void (async () => {
        setIsLoading(true);
        setError(null);
        try {
          const result = await listMembers(token, {
            page: 1,
            pageSize: 8,
            q,
            sortBy: "names",
            sortDir: "asc",
            filters: {},
          });
          setItems(result.items);
        } catch (err) {
          setError(err instanceof Error ? err.message : "No se pudieron buscar miembros.");
        } finally {
          setIsLoading(false);
        }
      })();
    }, 250);

    return () => window.clearTimeout(handle);
  }, [open, q, token]);

  useEffect(() => {
    if (!open) {
      setQ("");
      setItems([]);
      setError(null);
    }
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog member-payments-dialog">
        <div className="member-payments-header">
          <div>
            <h2>Registrar pago</h2>
            <p className="muted">Busca al miembro para abrir su historial y cargar un pago.</p>
          </div>
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
        <label className="search-field">
          <span className="sr-only">Buscar miembro</span>
          <input
            autoFocus
            onChange={(event) => setQ(event.target.value)}
            placeholder="Nombre, apellido o cédula"
            type="search"
            value={q}
          />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        {isLoading ? <p className="muted">Buscando miembros...</p> : null}
        <div className="member-picker-list">
          {items.map((member) => (
            <button
              className="member-picker-item"
              key={member.user_id}
              onClick={() =>
                onSelect({
                  user_id: member.user_id,
                  names: member.names,
                  lastname: member.lastname,
                })
              }
              type="button"
            >
              <strong>
                {member.names} {member.lastname}
              </strong>
              <span className="muted">{member.identifier || member.login_email}</span>
            </button>
          ))}
          {!isLoading && items.length === 0 ? (
            <p className="muted">No hay miembros con esa búsqueda.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
