"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { ENABLED_STATE_ID, PENDING_ENABLE_STATE_ID, type Member } from "@/modules/members/domain/types";

interface MemberActionsMenuProps {
  member: Member;
  onEdit: (member: Member) => void;
  onDownload: (member: Member) => void;
  onDownloadCertificate: (member: Member) => void;
  onResendCredentials: (member: Member) => void;
  onDelete: (member: Member) => void;
  onToggleState: (member: Member) => void;
  onApprove: (member: Member) => void;
}

function placeDropdown(trigger: HTMLElement, dropdown: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const menu = dropdown.getBoundingClientRect();
  const gap = 6;
  const padding = 8;

  let top = rect.bottom + gap;
  if (top + menu.height > window.innerHeight - padding) {
    top = Math.max(padding, rect.top - menu.height - gap);
  }

  let left = rect.right - menu.width;
  left = Math.min(left, window.innerWidth - menu.width - padding);
  left = Math.max(padding, left);

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
}

export function MemberActionsMenu({
  member,
  onEdit,
  onDownload,
  onDownloadCertificate,
  onResendCredentials,
  onDelete,
  onToggleState,
  onApprove,
}: MemberActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const enabled = member.state_id === ENABLED_STATE_ID;
  const pending = member.state_id === PENDING_ENABLE_STATE_ID;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target) || dropdownRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function update() {
      if (triggerRef.current && dropdownRef.current) {
        placeDropdown(triggerRef.current, dropdownRef.current);
      }
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  function run(action: (member: Member) => void) {
    setOpen(false);
    action(member);
  }

  const dropdown =
    open && mounted
      ? createPortal(
          <div className="actions-dropdown" ref={dropdownRef}>
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
            {pending ? (
              <button onClick={() => run(onApprove)} type="button">
                Aprobar
              </button>
            ) : (
              <button onClick={() => run(onToggleState)} type="button">
                {enabled ? "Deshabilitar" : "Habilitar"}
              </button>
            )}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="actions-menu" ref={menuRef}>
      <button
        className="actions-trigger"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        type="button"
      >
        Acciones
      </button>
      {dropdown}
    </div>
  );
}
