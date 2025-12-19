import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, Calendar, DollarSign, Plus, Trash2, X } from 'lucide-react'
import './Pagos.css'

function Pagos({ profesorId }) {
  const [pagos, setPagos] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  const [formData, setFormData] = useState({
    estudiante_id: '',
    monto: '',
    mes: selectedMonth,
    anio: selectedYear
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadPagos(), loadEstudiantes(), loadGrupos()])
    setLoading(false)
  }

  const loadPagos = async () => {
    const { data, error } = await supabase
      .from('pagos')
      .select(`
        *,
        estudiantes (nombre, apellido, grupos (nombre, color))
      `)
      .eq('profesor_id', profesorId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (!error && data) setPagos(data)
  }

  const loadEstudiantes = async () => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*, grupos (nombre, color)')
      .eq('profesor_id', profesorId)

    if (!error && data) setEstudiantes(data)
  }

  const loadGrupos = async () => {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('profesor_id', profesorId)

    if (!error && data) setGrupos(data)
  }

  const filteredPagos = useMemo(() => {
    let filtered = pagos.filter(p => p.mes === selectedMonth && p.anio === selectedYear)

    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      filtered = filtered.filter(p => {
        const estudiante = p.estudiantes
        return (
          estudiante?.nombre.toLowerCase().includes(s) ||
          estudiante?.apellido.toLowerCase().includes(s) ||
          estudiante?.grupos?.nombre.toLowerCase().includes(s)
        )
      })
    }

    return filtered
  }, [pagos, selectedMonth, selectedYear, searchTerm])

  const totalMes = useMemo(() => {
    return filteredPagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0)
  }, [filteredPagos])

  const openModal = () => {
    setFormData({
      estudiante_id: '',
      monto: '',
      mes: selectedMonth,
      anio: selectedYear
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({
      estudiante_id: '',
      monto: '',
      mes: selectedMonth,
      anio: selectedYear
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Verificar si ya existe un pago para este estudiante en este mes/año
    const { data: existingPago } = await supabase
      .from('pagos')
      .select('id')
      .eq('estudiante_id', formData.estudiante_id)
      .eq('mes', formData.mes)
      .eq('anio', formData.anio)
      .single()

    if (existingPago) {
      alert('Ya existe un pago registrado para este estudiante en este mes.')
      return
    }

    const { error } = await supabase
      .from('pagos')
      .insert([{
        profesor_id: profesorId,
        estudiante_id: formData.estudiante_id,
        monto: Number(formData.monto),
        mes: Number(formData.mes),
        anio: Number(formData.anio)
      }])

    if (!error) {
      await loadPagos()
      closeModal()
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este pago?')) {
      const { error } = await supabase
        .from('pagos')
        .delete()
        .eq('id', id)

      if (!error) await loadPagos()
    }
  }

  const getMesNombre = (mes) => {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1] || mes
  }

  if (loading) {
    return (
      <div className="pagos-loading">
        <div className="pagos-spinner" />
        <p>Cargando pagos...</p>
      </div>
    )
  }

  return (
    <div className="pagos">
      <div className="pagos-header">
        <div>
          <h1>Pagos</h1>
          <p>Registrá pagos manualmente (mes actual: {selectedMonth}/{selectedYear})</p>
        </div>

        <button className="pagos-btn-primary" onClick={openModal}>
          <Plus size={18} />
          Registrar Pago
        </button>
      </div>

      <div className="pagos-filters">
        <div className="pagos-date-picker">
          <Calendar size={20} />
          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
            >
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMesNombre(i + 1)}
                </option>
              ))}
            </select>
          </div>

          <div className="custom-select-wrapper">
            <select
              className="custom-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pagos-search">
          <Search size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o grupo..."
          />
        </div>

        <div className="pagos-total">
          <DollarSign size={20} />
          <span>Total: ${totalMes.toLocaleString('es-UY')}</span>
        </div>
      </div>

      {filteredPagos.length === 0 ? (
        <div className="pagos-empty">
          <DollarSign size={48} />
          <h2>No hay resultados</h2>
          <p>
            {searchTerm
              ? 'No se encontraron pagos con ese criterio de búsqueda.'
              : 'Primero agregá estudiantes para registrar pagos.'}
          </p>
        </div>
      ) : (
        <div className="pagos-list">
          {filteredPagos.map((pago) => {
            const estudiante = pago.estudiantes

            return (
              <div key={pago.id} className="pago-item">
                <div className="pago-left">
                  <div className="pago-icon">
                    <DollarSign size={20} />
                  </div>
                  <div className="pago-info">
                    <h3>{estudiante?.nombre} {estudiante?.apellido}</h3>
                    {estudiante?.grupos && (
                      <span
                        className="pago-group"
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

                <div className="pago-right">
                  <span className="pago-amount">${Number(pago.monto).toLocaleString('es-UY')}</span>
                  <button
                    className="pago-delete"
                    onClick={() => handleDelete(pago.id)}
                    aria-label="Eliminar pago"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div className="pagos-modal-overlay" onMouseDown={closeModal}>
          <div className="pagos-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="pagos-modal-header">
              <h2>Registrar Pago</h2>
              <button className="pagos-icon-btn" onClick={closeModal}>
                <X size={22} />
              </button>
            </div>

            <form className="pagos-form" onSubmit={handleSubmit}>
              <div className="pagos-field">
                <label>Estudiante *</label>
                <div className="custom-select-wrapper">
                  <select
                    className="custom-select"
                    value={formData.estudiante_id}
                    onChange={(e) => setFormData({ ...formData, estudiante_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccioná un estudiante</option>
                    {estudiantes.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nombre} {e.apellido}
                        {e.grupos ? ` - ${e.grupos.nombre}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pagos-field">
                <label>Monto *</label>
                <div className="input-with-icon">
                  <DollarSign size={18} />
                  <input
                    type="number"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="pagos-form-row">
                <div className="pagos-field">
                  <label>Mes *</label>
                  <div className="custom-select-wrapper">
                    <select
                      className="custom-select"
                      value={formData.mes}
                      onChange={(e) => setFormData({ ...formData, mes: Number(e.target.value) })}
                      required
                    >
                      {[...Array(12)].map((_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {getMesNombre(i + 1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pagos-field">
                  <label>Año *</label>
                  <div className="custom-select-wrapper">
                    <select
                      className="custom-select"
                      value={formData.anio}
                      onChange={(e) => setFormData({ ...formData, anio: Number(e.target.value) })}
                      required
                    >
                      {[2023, 2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pagos-form-actions">
                <button type="button" className="pagos-btn-secondary" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="pagos-btn-primary">
                  Registrar Pago
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pagos