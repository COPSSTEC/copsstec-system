"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { CourseInscription } from "@/modules/courses/domain/types";
import { CourseUiIcon } from "@/modules/courses/presentation/components/course-ui-icon";

interface InscriptionActionsMenuProps {
  inscription: CourseInscription;
  onToggleAttendance: (inscription: CourseInscription) => void;
  onGenerateCertificate: (inscription: CourseInscription) => void;
  onDownloadCertificate: (inscription: CourseInscription) => void;
  onFeedback: (inscription: CourseInscription) => void;
  onApprovePayment: (inscription: CourseInscription) => void;
  onRejectPayment: (inscription: CourseInscription) => void;
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

export function InscriptionActionsMenu({
  inscription,
  onToggleAttendance,
  onGenerateCertificate,
  onDownloadCertificate,
  onFeedback,
  onApprovePayment,
  onRejectPayment,
}: InscriptionActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pendingPayment = inscription.payment_state_id === 8;

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

  function run(action: (inscription: CourseInscription) => void) {
    setOpen(false);
    action(inscription);
  }

  const dropdown =
    open && mounted
      ? createPortal(
          <div className="actions-dropdown" ref={dropdownRef}>
            {pendingPayment ? (
              <>
                <button onClick={() => run(onApprovePayment)} type="button">
                  Aprobar pago
                </button>
                <button onClick={() => run(onRejectPayment)} type="button">
                  Rechazar pago
                </button>
              </>
            ) : null}
            {inscription.certificate_id ? (
              <button onClick={() => run(onDownloadCertificate)} type="button">
                Descargar certificado
              </button>
            ) : null}
            <button onClick={() => run(onFeedback)} type="button">
              {inscription.feedback_sent_at ? "Reenviar encuesta" : "Enviar / copiar encuesta"}
            </button>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="inscription-actions" ref={menuRef}>
      <button
        className="icon-action-button"
        onClick={() => onToggleAttendance(inscription)}
        title={inscription.attended_at ? "Quitar asistencia" : "Marcar asistencia"}
        type="button"
      >
        <CourseUiIcon name="check" />
        <span>{inscription.attended_at ? "Quitar" : "Asistió"}</span>
      </button>
      <button
        className="icon-action-button"
        onClick={() => onGenerateCertificate(inscription)}
        title={inscription.certificate_id ? "Regenerar certificado" : "Generar certificado"}
        type="button"
      >
        <CourseUiIcon name="certificate" />
        <span>{inscription.certificate_id ? "Reenviar" : "Certificar"}</span>
      </button>
      <button
        className="icon-action-button"
        onClick={() => setOpen((value) => !value)}
        ref={triggerRef}
        title="Más acciones"
        type="button"
      >
        <CourseUiIcon name="more" />
      </button>
      {dropdown}
    </div>
  );
}
