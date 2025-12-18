import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, DollarSign, CheckCircle, XCircle, X, Calendar } from 'lucide-react'
import './Pagos.css'

function Pagos({ profesorId }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [selected, setSelected] = useState(null)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const [formData, setFormData] = useState({
    mes: currentMonth,
    anio: currentYear,
    monto: ''
  })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('estudiantes')
      .select(`
        id,
        nombre,
        apellido,
        email,
        grupos (nombre, color),
        pagos (mes, anio, monto)
      `)
      .eq('profesor_id', profesorId)
      .order('created_at', { ascending: false })

    if (!error) setEstudiantes(data || [])
    setLoading(false)
  }

  const pagoExiste = (pagos, mes, anio) =>
    pagos?.some(p => p.mes === mes && p.anio === anio)

  const openModal = (estudiante) => {
    setSelected(estudiante)
    setFormData({ mes: currentMonth, anio: currentYear, monto: '' })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelected(null)
    setFormData({ mes: currentMonth, anio: currentYear, monto: '' })
  }

  const registrarPago = async (e) => {
    e.preventDefault()
    if (!selected) return

    const mes = Number(formData.mes)
    const anio = Number(formData.anio)

    if (pagoExiste(selected.pagos, mes, anio)) {
      alert('Ese pago ya está registrado para ese mes/año.')
      return
    }

    const { error } = await supabase
      .from('pagos')
      .insert([{
        profesor_id: profesorId,
        estudiante_id: selected.id,
        mes,
        anio,
        monto: Number(formData.monto)
      }])

    if (error) {
      alert('Error al registrar pago: ' + error.message)
      return
    }

    await load()
    closeModal()
  }

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return estudiantes
    return estudiantes.filter(e =>
      `${e.nombre} ${e.apellido}`.toLowerCase().includes(s) ||
      (e.email || '').toLowerCase().includes(s) ||
      (e.grupos?.nombre || '').toLowerCase().includes(s)
    )
  }, [estudiantes, searchTerm])

  if (loading) {
    return (
      <div className="ph-loading">
        <div className="ph-spinner"></div>
        <p>Cargando pagos...</p>
      </div>
    )
  }

  return (
    <div className="payments-page">
      <div className="payments-header">
        <div>
          <h1>Pagos</h1>
          <p>Registrá pagos manualmente (mes actual: {currentMonth}/{currentYear})</p>
        </div>

        <div className="payments-month-pill">
          <Calendar size={18} />
          <span>{currentMonth}/{currentYear}</span>
        </div>
      </div>

      <div className="ph-card ph-search">
        <Search size={18} className="ph-search-icon" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre, email o grupo..."
        />
      </div>

      <div className="payments-grid">
        {filtered.map((e) => {
          const pagado = pagoExiste(e.pagos, currentMonth, currentYear)

          return (
            <div key={e.id} className="payments-card">
              <div className="payments-card-top">
                <div>
                  <h3>{e.nombre} {e.apellido}</h3>
                  {e.grupos?.nombre && (
                    <span
                      className="payments-group"
                      style={{ background: `${e.grupos.color}20`, color: e.grupos.color }}
                    >
                      {e.grupos.nombre}
                    </span>
                  )}
                </div>

                <div className={`payments-status ${pagado ? 'ok' : 'pending'}`}>
                  {pagado ? <CheckCircle size={18} /> : <XCircle size={18} />}
                  <span>{pagado ? 'Pagado' : 'Pendiente'}</span>
                </div>
              </div>

              <div className="payments-actions">
                {pagado ? (
                  <button className="ph-btn-soft" disabled>
                    <CheckCircle size={16} />
                    Ya registrado
                  </button>
                ) : (
                  <button className="ph-btn-primary" onClick={() => openModal(e)}>
                    <DollarSign size={16} />
                    Registrar pago
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="ph-empty">
          <DollarSign size={42} />
          <h2>No hay resultados</h2>
          <p>{searchTerm ? 'No coincide ningún estudiante.' : 'Primero agregá estudiantes para registrar pagos.'}</p>
        </div>
      )}

      {showModal && (
        <div className="ph-modal-bg" onClick={closeModal}>
          <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>Registrar pago</h2>
              <button className="ph-icon-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="ph-form" onSubmit={registrarPago}>
              <div className="payments-student">
                <strong>{selected?.nombre} {selected?.apellido}</strong>
                <span>Este pago lo registra el profesor (o sea vos 😄)</span>
              </div>

              <div className="payments-row">
                <div className="ph-form-group">
                  <label>Mes</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.mes}
                    onChange={(e) => setFormData({ ...formData, mes: e.target.value })}
                    required
                  />
                </div>

                <div className="ph-form-group">
                  <label>Año</label>
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="ph-form-group">
                <label>Monto *</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.monto}
                  onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                  placeholder="Ej: 1500"
                  required
                />
              </div>

              <button className="ph-btn-primary" type="submit">
                <DollarSign size={18} />
                Guardar pago
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Pagos
