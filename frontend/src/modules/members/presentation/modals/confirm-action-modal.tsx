"use client";

interface ConfirmActionModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  isSubmitting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  danger = false,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: ConfirmActionModalProps) {
  return (
    <div className="modal-backdrop">
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <div className="table-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className={danger ? "danger-button" : "primary-button"}
            disabled={isSubmitting}
            onClick={onConfirm}
            type="button"
          >
            {isSubmitting ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
