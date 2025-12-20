import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, AlertTriangle, Info } from 'lucide-react'
import './ConfirmDialog.css'

function ConfirmDialog({
  open,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  onConfirm,
  onCancel
}) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  if (!open) return null

  const icon =
    variant === 'warning' ? (
      <AlertTriangle size={22} />
    ) : variant === 'info' ? (
      <Info size={22} />
    ) : (
      <AlertTriangle size={22} />
    )

  return createPortal(
    <div className="ph-confirm-bg" onMouseDown={onCancel}>
      <div className="ph-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ph-confirm-header">
          <div className={`ph-confirm-icon ${variant}`}>{icon}</div>

          <div className="ph-confirm-title">
            <h3>{title || 'Confirmar acción'}</h3>
            <p>{message || '¿Estás seguro?'}</p>
          </div>

          <button className="ph-confirm-close" onClick={onCancel} type="button" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="ph-confirm-actions">
          <button className="ph-btn-secondary" type="button" onClick={onCancel}>
            {cancelText}
          </button>

          <button className="ph-btn-danger" type="button" onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default ConfirmDialog
