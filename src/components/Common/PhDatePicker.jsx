import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import './PhDatePicker.css'

function pad2(n) {
  return String(n).padStart(2, '0')
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function isoToDate(iso) {
  if (!iso) return null
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

function formatDisplay(iso) {
  const d = isoToDate(iso)
  if (!d) return ''
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

function isSameDay(a, b) {
  return (
    a?.getFullYear() === b?.getFullYear() &&
    a?.getMonth() === b?.getMonth() &&
    a?.getDate() === b?.getDate()
  )
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function addMonths(d, delta) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1)
}

function monthNameES(mIndex) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ]
  return meses[mIndex] || ''
}

function getCalendarGrid(viewDate) {
  const first = startOfMonth(viewDate)

  // lunes primero
  const startOffset = (first.getDay() + 6) % 7

  const start = new Date(first)
  start.setDate(first.getDate() - startOffset)

  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)

    cells.push({
      date: d,
      inMonth:
        d.getFullYear() === viewDate.getFullYear() &&
        d.getMonth() === viewDate.getMonth()
    })
  }
  return cells
}

/**
 * align:
 * - "center" (default): centra el popover respecto al input
 * - "left": alinea el borde izquierdo del popover con el borde izquierdo del input
 * - "right": alinea el borde derecho del popover con el borde derecho del input (abre más hacia la izquierda)
 */
function PhDatePicker({
  value,
  onChange,
  disabled = false,
  placeholder = 'dd/mm/aaaa',
  align = 'center'
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState(null)

  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const selectedDate = useMemo(() => isoToDate(value), [value])
  const [viewDate, setViewDate] = useState(() => startOfMonth(selectedDate || new Date()))

  useEffect(() => {
    if (selectedDate) setViewDate(startOfMonth(selectedDate))
  }, [selectedDate])

  const close = useCallback(() => setIsOpen(false), [])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()
    const desiredWidth = Math.max(320, rect.width)
    
    // Calcular left basado en align
    let left
    if (align === 'right') {
      left = rect.right - desiredWidth
    } else if (align === 'left') {
      left = rect.left
    } else {
      left = rect.left + rect.width / 2 - desiredWidth / 2
    }
    
    // Clamp horizontal con margen
    left = Math.min(Math.max(12, left), window.innerWidth - desiredWidth - 12)

    // Posición inicial (abajo por defecto)
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left,
      width: desiredWidth,
      zIndex: 2147483647
    })

    // Después del primer render, calcular si necesita abrir arriba
    requestAnimationFrame(() => {
      if (!popoverRef.current) return

      const popRect = popoverRef.current.getBoundingClientRect()
      const popH = popRect.height
      
      const spaceBelow = window.innerHeight - rect.bottom - 16
      const spaceAbove = rect.top - 16
      
      // Solo abre arriba si no cabe abajo Y hay más espacio arriba
      const shouldOpenUp = spaceBelow < popH && spaceAbove > spaceBelow

      // Recalcular left por si cambió el viewport
      let left2
      if (align === 'right') {
        left2 = rect.right - desiredWidth
      } else if (align === 'left') {
        left2 = rect.left
      } else {
        left2 = rect.left + rect.width / 2 - desiredWidth / 2
      }
      left2 = Math.min(Math.max(12, left2), window.innerWidth - desiredWidth - 12)

      setDropdownStyle({
        position: 'fixed',
        left: left2,
        width: desiredWidth,
        zIndex: 2147483647,
        top: shouldOpenUp
          ? Math.max(12, rect.top - popH - 8)
          : rect.bottom + 8
      })
    })
  }, [align])

  useEffect(() => {
    if (isOpen) {
      // Agregar clase al body para deshabilitar clipping del modal
      document.body.classList.add('datepicker-active')
      // También intentar agregar al modal más cercano
      const modal = document.querySelector('.ph-modal')
      if (modal) modal.classList.add('datepicker-open')
    } else {
      document.body.classList.remove('datepicker-active')
      const modal = document.querySelector('.ph-modal')
      if (modal) modal.classList.remove('datepicker-open')
    }
  }, [isOpen])

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
      if (popoverRef.current?.contains(e.target)) return
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

  const grid = useMemo(() => getCalendarGrid(viewDate), [viewDate])
  const today = useMemo(() => new Date(), [])

  const handlePick = (d) => {
    onChange?.(toISODate(d))
    close()
  }

  const handleToday = () => {
    onChange?.(toISODate(new Date()))
    close()
  }

  const handleClear = () => {
    onChange?.('')
    close()
  }

  const handlePickCell = (cell) => {
    const d = cell.date
    if (!cell.inMonth) setViewDate(startOfMonth(d))
    handlePick(d)
  }

  const open = () => {
    if (disabled) return
    setIsOpen((v) => {
      const next = !v
      if (next) requestAnimationFrame(updatePosition)
      return next
    })
  }

  return (
    <div
      ref={containerRef}
      className={`ph-date-container ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="ph-date-trigger"
        onClick={open}
        disabled={disabled}
      >
        <span className={value ? 'ph-date-value' : 'ph-date-placeholder'}>
          {value ? formatDisplay(value) : placeholder}
        </span>

        <span className="ph-date-icon">
          <Calendar size={18} />
        </span>
      </button>

      {isOpen &&
        createPortal(
          <div ref={popoverRef} className="ph-date-popover" style={dropdownStyle || { zIndex: 2147483647 }}>
            <div className="ph-date-card">
              <div className="ph-date-head">
                <button
                  type="button"
                  className="ph-date-nav"
                  onClick={() => setViewDate((d) => addMonths(d, -1))}
                  aria-label="Mes anterior"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="ph-date-title">
                  {monthNameES(viewDate.getMonth())} {viewDate.getFullYear()}
                </div>

                <button
                  type="button"
                  className="ph-date-nav"
                  onClick={() => setViewDate((d) => addMonths(d, 1))}
                  aria-label="Mes siguiente"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="ph-date-week">
                <div>LU</div><div>MA</div><div>MI</div><div>JU</div><div>VI</div><div>SA</div><div>DO</div>
              </div>

              <div className="ph-date-grid">
                {grid.map((cell, idx) => {
                  const d = cell.date
                  const isSelected = selectedDate && isSameDay(d, selectedDate)
                  const isToday = isSameDay(d, today)
                  const isOutside = !cell.inMonth

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={[
                        'ph-date-day',
                        isSelected ? 'selected' : '',
                        isToday ? 'today' : '',
                        isOutside ? 'outside' : ''
                      ].join(' ')}
                      onClick={() => handlePickCell(cell)}
                    >
                      {d.getDate()}
                    </button>
                  )
                })}
              </div>

              <div className="ph-date-actions">
                <button type="button" className="ph-date-btn ghost" onClick={handleToday}>
                  Hoy
                </button>
                <button type="button" className="ph-date-btn danger" onClick={handleClear}>
                  Borrar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

export default PhDatePicker