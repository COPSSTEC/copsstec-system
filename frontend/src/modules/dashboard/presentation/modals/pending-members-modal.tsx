"use client";

import Link from "next/link";

import type { PendingApproval } from "@/modules/dashboard/domain/types";

interface PendingMembersModalProps {
  items: PendingApproval[];
  onApprove: (item: PendingApproval) => void;
  onClose: () => void;
}

export function PendingMembersModal({ items, onApprove, onClose }: PendingMembersModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-labelledby="pending-members-title"
        className="confirm-dialog admin-dashboard-pending"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2 id="pending-members-title">Afiliaciones pendientes</h2>
        <p className="muted">
          Miembros recién registrados que esperan aprobación para habilitarse en el padrón.
        </p>
        {items.length === 0 ? (
          <p className="admin-dashboard-empty">No hay afiliaciones pendientes de aprobación.</p>
        ) : (
          <ul className="admin-dashboard-pending-list">
            {items.map((item) => (
              <li key={item.user_id}>
                <div>
                  <strong>
                    {item.names} {item.lastname}
                  </strong>
                  <span>Cédula {item.identifier || "—"}</span>
                  <span>{item.email || "Sin correo"}</span>
                  <span>Registro {item.date_register || "—"}</span>
                </div>
                <button className="admin-dashboard-action" onClick={() => onApprove(item)} type="button">
                  Aprobar
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="admin-dashboard-pending-footer">
          <Link className="admin-dashboard-link" href="/admin/miembros">
            Ver padrón completo
          </Link>
          <button className="secondary-button" onClick={onClose} type="button">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
