"use client";

import { useEffect, useRef, useState } from "react";

import { ENABLED_STATE_ID, type Member } from "@/modules/members/domain/types";

interface MemberActionsMenuProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDownload: (member: Member) => void;
  onDownloadCertificate: (member: Member) => void;
  onResendCredentials: (member: Member) => void;
  onDelete: (member: Member) => void;
  onToggleState: (member: Member) => void;
}

export function MemberActionsMenu({
  member,
  onEdit,
  onDownload,
  onDownloadCertificate,
  onResendCredentials,
  onDelete,
  onToggleState,
}: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const enabled = member.state_id === ENABLED_STATE_ID;

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function run(action: (member: Member) => void) {
    setOpen(false);
    action(member);
  }

  return (
    <div className="actions-menu" ref={menuRef}>
      <button className="actions-trigger" onClick={() => setOpen((value) => !value)} type="button">
        Acciones
      </button>
      {open ? (
        <div className="actions-dropdown">
          <button onClick={() => run(onEdit)} type="button">
            Editar
          </button>
          <button onClick={() => run(onDownload)} type="button">
            Descargar
          </button>
          <button onClick={() => run(onDownloadCertificate)} type="button">
            Descargar certificado
          </button>
          <button onClick={() => run(onResendCredentials)} type="button">
            Reenviar credenciales
          </button>
          <button className="danger-button" onClick={() => run(onDelete)} type="button">
            Eliminar
          </button>
          <button onClick={() => run(onToggleState)} type="button">
            {enabled ? "Deshabilitar" : "Habilitar"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
