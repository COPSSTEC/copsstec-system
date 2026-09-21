interface ConfirmCourseModalProps {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmCourseModal({
  title,
  description,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
}: ConfirmCourseModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="confirm-dialog">
        <h2>{title}</h2>
        <p className="muted">{description}</p>
        <div className="hero-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className={danger ? "primary-button danger-fill" : "primary-button"} onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
