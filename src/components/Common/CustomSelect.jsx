import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import './CustomSelect.css'

function CustomSelect({ value, onChange, options = [], placeholder = 'Seleccionar...', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState(null)

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const dropdownRef = useRef(null)

  const safeOptions = Array.isArray(options) ? options : []

  const selectedOption = useMemo(
    () => safeOptions.find((opt) => opt.value === value),
    [safeOptions, value]
  )

  const close = useCallback(() => setIsOpen(false), [])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()

    // Ajustes
    const GAP = 8
    const MAX_DROPDOWN_HEIGHT = 280 // mismo que tu CSS max-height original
    const PADDING_SAFE = 12 // para no pegarse a los bordes del viewport

    const viewportH = window.innerHeight

    const spaceBelow = viewportH - rect.bottom - PADDING_SAFE
    const spaceAbove = rect.top - PADDING_SAFE

    // Altura estimada (mínimo razonable para que no quede enano)
    const desiredHeight = Math.min(
      MAX_DROPDOWN_HEIGHT,
      Math.max(160, safeOptions.length * 44)
    )

    // Si no entra abajo y arriba hay más lugar => abrimos arriba
    const shouldOpenUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow

    const maxH = Math.min(desiredHeight, shouldOpenUp ? spaceAbove : spaceBelow)

    const top = shouldOpenUp
      ? Math.max(PADDING_SAFE, rect.top - GAP - maxH)
      : rect.bottom + GAP

    setDropdownStyle({
      position: 'fixed',
      top,
      left: rect.left,
      width: rect.width,
      zIndex: 999999,
      maxHeight: maxH,
      overflow: 'hidden'
    })
  }, [safeOptions.length])

  useEffect(() => {
    if (!isOpen) return
    updatePosition()

    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, updatePosition])

  useEffect(() => {
    const handleDocMouseDown = (e) => {
      if (!isOpen) return
      if (containerRef.current?.contains(e.target)) return
      if (dropdownRef.current?.contains(e.target)) return
      close()
    }

    const handleKeyDown = (e) => {
      if (!isOpen) return
      if (e.key === 'Escape') close()
    }

    document.addEventListener('mousedown', handleDocMouseDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handleDocMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, close])

  const handleSelect = (val) => {
    onChange?.(val)
    close()
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen((v) => !v)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'selected' : 'placeholder'}>
          {selectedOption?.label ?? placeholder}
        </span>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen &&
        createPortal(
          <div ref={dropdownRef} className="custom-select-dropdown" style={dropdownStyle || undefined}>
            <div className="custom-select-options">
              {safeOptions.length === 0 ? (
                <div className="custom-select-empty">Sin opciones</div>
              ) : (
                safeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default CustomSelect
