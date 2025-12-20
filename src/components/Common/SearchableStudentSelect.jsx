import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Search, ChevronDown, User } from 'lucide-react'
import './SearchableStudentSelect.css'

function normalize(s) {
  return (s || '').toString().trim().toLowerCase()
}

function startsWithAny(fullName, nombre, apellido, q) {
  if (!q) return false
  return fullName.startsWith(q) || nombre.startsWith(q) || apellido.startsWith(q)
}

export default function SearchableStudentSelect({
  estudiantes = [],
  value = '',
  onChange,
  placeholder = 'Buscar estudiante...',
  minChars = 1
}) {
  const wrapRef = useRef(null)
  const triggerRef = useRef(null)
  const popoverRef = useRef(null)
  const inputRef = useRef(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [popoverStyle, setPopoverStyle] = useState(null)

  const selected = useMemo(() => {
    if (!value) return null
    return estudiantes.find((e) => String(e.id) === String(value)) || null
  }, [value, estudiantes])

  const filtered = useMemo(() => {
    const q = normalize(query)
    if (!open) return []
    if (q.length < minChars) return []

    return estudiantes
      .map((e) => {
        const nombre = normalize(e.nombre)
        const apellido = normalize(e.apellido)
        const full = normalize(`${e.nombre} ${e.apellido}`)
        return { e, nombre, apellido, full }
      })
      .filter((x) => startsWithAny(x.full, x.nombre, x.apellido, q))
      .map((x) => x.e)
      .slice(0, 30)
  }, [estudiantes, query, open, minChars])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()

    setPopoverStyle({
      position: 'fixed',
      top: rect.bottom + 10,
      left: rect.left,
      width: rect.width,
      zIndex: 999999
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()

    const onScroll = () => updatePosition()
    const onResize = () => updatePosition()

    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, updatePosition])

  useEffect(() => {
    const onDocMouseDown = (ev) => {
      if (!open) return
      const t = ev.target

      if (wrapRef.current?.contains(t)) return
      if (popoverRef.current?.contains(t)) return

      setOpen(false)
    }

    const onKeyDown = (ev) => {
      if (!open) return
      if (ev.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const handlePick = (id) => {
    onChange?.(String(id))
    setOpen(false)
  }

  const clearSelection = () => {
    onChange?.('')
    setOpen(false)
    setQuery('')
  }

  const showEmpty = open && normalize(query).length >= minChars && filtered.length === 0

  return (
    <div className="ss-select" ref={wrapRef}>
      <div
        ref={triggerRef}
        className={`ss-trigger ${open ? 'open' : ''}`}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen((v) => !v)
        }}
      >
        <div className="ss-trigger-left">
          <User size={18} />
          <span className={`ss-trigger-text ${selected ? '' : 'muted'}`}>
            {selected ? `${selected.nombre} ${selected.apellido}` : placeholder}
          </span>
        </div>

        <div className="ss-trigger-right">
          {selected && (
            <button
              type="button"
              className="ss-clear"
              onClick={(e) => {
                e.stopPropagation()
                clearSelection()
              }}
              aria-label="Limpiar"
              title="Limpiar"
            >
              ×
            </button>
          )}
          <ChevronDown size={18} />
        </div>
      </div>

      {open &&
        createPortal(
          <div
            ref={popoverRef}
            className="ss-popover"
            style={popoverStyle || undefined}
          >
            <div className="ss-search">
              <Search size={16} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribí para buscar…"
                autoComplete="off"
              />
            </div>

            {normalize(query).length < minChars ? (
              <div className="ss-hint">Empezá a escribir para ver resultados.</div>
            ) : (
              <div className="ss-list">
                {filtered.map((e) => (
                  <button
                    type="button"
                    key={e.id}
                    className="ss-item"
                    onClick={() => handlePick(e.id)}
                  >
                    <div className="ss-item-name">
                      {e.nombre} {e.apellido}
                    </div>

                    {e.grupos?.nombre && (
                      <div
                        className="ss-item-group"
                        style={{
                          backgroundColor: (e.grupos.color || '#7c3aed') + '20',
                          color: e.grupos.color || '#7c3aed'
                        }}
                      >
                        {e.grupos.nombre}
                      </div>
                    )}
                  </button>
                ))}

                {showEmpty && <div className="ss-empty">No se encontraron estudiantes</div>}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
