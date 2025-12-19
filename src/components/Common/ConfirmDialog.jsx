import { X, AlertTriangle } from 'lucide-react'
import './ConfirmDialog.css'

function ConfirmDialog({
  open,
  title = 'Confirmar acción',
  message = '¿Estás seguro?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false,
  onConfirm,
  onCancel
}) {
  if (!open) return null

  return (
    <div className="ph-confirm-bg" onMouseDown={onCancel}>
      <div className="ph-confirm" onMouseDown={(e) => e.stopPropagation()}>
        <div className="ph-confirm-header">
          <div className={`ph-confirm-icon ${variant}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="ph-confirm-title">
            <h3>{title}</h3>
            <p>{message}</p>
          </div>

          <button className="ph-confirm-close" onClick={onCancel} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="ph-confirm-actions">
          <button className="ph-btn-secondary" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button className={`ph-btn-danger`} onClick={onConfirm} disabled={loading}>
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmDialog
