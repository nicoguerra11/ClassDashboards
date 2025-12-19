import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown, User, Users as UsersIcon } from 'lucide-react'
import './SearchableStudentSelect.css'

function SearchableStudentSelect({ 
  estudiantes = [], 
  value, 
  onChange, 
  placeholder = 'Buscar estudiante...', 
  disabled = false 
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    if (disabled) return
    setIsOpen(true)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const handleSelect = (estudianteId) => {
    onChange(estudianteId)
    setIsOpen(false)
    setSearchTerm('')
  }

  const filteredEstudiantes = estudiantes.filter(e => {
    const fullName = `${e.nombre} ${e.apellido}`.toLowerCase()
    const search = searchTerm.toLowerCase()
    return fullName.includes(search)
  })

  const selectedEstudiante = estudiantes.find(e => e.id === value)

  return (
    <div 
      ref={containerRef} 
      className={`searchable-student-select ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <button
        type="button"
        className="student-select-trigger"
        onClick={handleOpen}
        disabled={disabled}
      >
        <div className="trigger-content">
          <User size={18} className="trigger-icon" />
          <span className={selectedEstudiante ? 'selected' : 'placeholder'}>
            {selectedEstudiante 
              ? `${selectedEstudiante.nombre} ${selectedEstudiante.apellido}${selectedEstudiante.grupos ? ` - ${selectedEstudiante.grupos.nombre}` : ''}`
              : placeholder
            }
          </span>
        </div>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="student-select-dropdown">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder="Escribí el nombre del estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="student-options">
            {filteredEstudiantes.length === 0 ? (
              <div className="no-results">
                <UsersIcon size={32} />
                <p>No se encontraron estudiantes</p>
              </div>
            ) : (
              filteredEstudiantes.map((estudiante) => (
                <button
                  key={estudiante.id}
                  type="button"
                  className={`student-option ${estudiante.id === value ? 'selected' : ''}`}
                  onClick={() => handleSelect(estudiante.id)}
                >
                  <div className="student-info">
                    <div className="student-avatar">
                      {estudiante.nombre.charAt(0)}{estudiante.apellido.charAt(0)}
                    </div>
                    <div className="student-details">
                      <span className="student-name">
                        {estudiante.nombre} {estudiante.apellido}
                      </span>
                      {estudiante.grupos && (
                        <span 
                          className="student-group"
                          style={{
                            backgroundColor: estudiante.grupos.color + '20',
                            color: estudiante.grupos.color
                          }}
                        >
                          {estudiante.grupos.nombre}
                        </span>
                      )}
                    </div>
                  </div>
                  {estudiante.id === value && (
                    <span className="check-mark">✓</span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchableStudentSelect