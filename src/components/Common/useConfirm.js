import { useCallback, useState } from 'react'

export function useConfirm() {
  const [state, setState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'danger',
    resolve: null
  })

  const confirm = useCallback(({ title, message, confirmText, cancelText, variant } = {}) => {
    return new Promise((resolve) => {
      setState({
        open: true,
        title: title || 'Confirmar acción',
        message: message || '¿Estás seguro?',
        confirmText: confirmText || 'Confirmar',
        cancelText: cancelText || 'Cancelar',
        variant: variant || 'danger',
        resolve
      })
    })
  }, [])

  const onConfirm = useCallback(() => {
    state.resolve?.(true)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }, [state])

  const onCancel = useCallback(() => {
    state.resolve?.(false)
    setState((s) => ({ ...s, open: false, resolve: null }))
  }, [state])

  return { confirm, dialogProps: { ...state, onConfirm, onCancel } }
}
