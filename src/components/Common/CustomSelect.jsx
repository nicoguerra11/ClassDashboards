import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'
import './CustomSelect.css'

function CustomSelect({ value, onChange, options, placeholder = 'Seleccionar...', disabled = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div 
      ref={containerRef} 
      className={`custom-select-container ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
    >
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'selected' : 'placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={18} className={`chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="custom-select-dropdown">
          <div className="custom-select-options">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`custom-select-option ${option.value === value ? 'selected' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomSelect