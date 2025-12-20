import { useCallback, useRef, useState } from 'react'

export function useConfirm() {
  const resolverRef = useRef(null)

  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'danger'
  })

  const confirm = useCallback((opts = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setState({
        open: true,
        title: opts.title || 'Confirmar acción',
        message: opts.message || '¿Estás seguro?',
        confirmText: opts.confirmText || 'Confirmar',
        cancelText: opts.cancelText || 'Cancelar',
        variant: opts.variant || 'danger'
      })
    })
  }, [])

  const close = useCallback(() => {
    setState((s) => ({ ...s, open: false }))
  }, [])

  const onConfirm = useCallback(() => {
    resolverRef.current?.(true)
    resolverRef.current = null
    close()
  }, [close])

  const onCancel = useCallback(() => {
    resolverRef.current?.(false)
    resolverRef.current = null
    close()
  }, [close])

  return {
    confirm,
    dialogProps: {
      ...state,
      onConfirm,
      onCancel
    }
  }
}
