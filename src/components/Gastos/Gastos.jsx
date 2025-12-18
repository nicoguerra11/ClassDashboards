import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Trash2, X, Search, Receipt, Calendar } from 'lucide-react'
import './Gastos.css'

function Gastos({ profesorId }) {
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)

  const today = new Date().toISOString().slice(0, 10)

  const [formData, setFormData] = useState({
    concepto: '',
    monto: '',
    fecha: today
  })

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('profesor_id', profesorId)
      .order('fecha', { ascending: false })

    if (!error) setGastos(data || [])
    setLoading(false)
  }

  const openModal = () => {
    setFormData({ concepto: '', monto: '', fecha: today })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ concepto: '', monto: '', fecha: today })
  }

  const addGasto = async (e) => {
    e.preventDefault()

    const { error } = await supabase
      .from('gastos')
      .insert([{
        profesor_id: profesorId,
        concepto: formData.concepto,
        monto: Number(formData.monto),
        fecha: formData.fecha
      }])

    if (error) {
      alert('Error al crear gasto: ' + error.message)
      return
    }

    await load()
    closeModal()
  }

  const deleteGasto = async (id) => {
    if (!confirm('¿Eliminar gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (!error) await load()
  }

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return gastos
    return gastos.filter(g =>
      (g.concepto || '').toLowerCase().includes(s)
    )
  }, [gastos, searchTerm])

  const total = useMemo(() => {
    return filtered.reduce((acc, g) => acc + (Number(g.monto) || 0), 0)
  }, [filtered])

  if (loading) {
    return (
      <div className="ph-loading">
        <div className="ph-spinner"></div>
        <p>Cargando gastos...</p>
      </div>
    )
  }

  return (
    <div className="expenses-page">
      <div className="expenses-header">
        <div>
          <h1>Gastos</h1>
          <p>Registrá egresos (materiales, alquiler, etc.)</p>
        </div>

        <button className="ph-btn-primary" onClick={openModal}>
          <Plus size={18} /> Nuevo gasto
        </button>
      </div>

      <div className="expenses-top">
        <div className="ph-card ph-search">
          <Search size={18} className="ph-search-icon" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por concepto..."
          />
        </div>

        <div className="expenses-total">
          <Receipt size={20} />
          <span>Total: </span>
          <strong>${total.toLocaleString('es-UY')}</strong>
        </div>
      </div>

      <div className="expenses-list">
        {filtered.map(g => (
          <div key={g.id} className="expense-row">
            <div className="expense-left">
              <div className="expense-concept">{g.concepto}</div>
              <div className="expense-date">
                <Calendar size={14} />
                <span>{new Date(g.fecha).toLocaleDateString('es-UY')}</span>
              </div>
            </div>

            <div className="expense-right">
              <div className="expense-amount">${Number(g.monto).toLocaleString('es-UY')}</div>
              <button className="expense-delete" onClick={() => deleteGasto(g.id)} title="Eliminar">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="ph-empty">
          <Receipt size={42} />
          <h2>No hay gastos</h2>
          <p>{searchTerm ? 'No coincide ningún gasto.' : 'Agregá tu primer gasto para llevar control.'}</p>
        </div>
      )}

      {showModal && (
        <div className="ph-modal-bg" onClick={closeModal}>
          <div className="ph-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>Nuevo gasto</h2>
              <button className="ph-icon-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="ph-form" onSubmit={addGasto}>
              <div className="ph-form-group">
                <label>Concepto *</label>
                <input
                  value={formData.concepto}
                  onChange={(e) => setFormData({ ...formData, concepto: e.target.value })}
                  placeholder="Ej: Alquiler del local"
                  required
                />
              </div>

              <div className="expenses-row">
                <div className="ph-form-group">
                  <label>Monto *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="Ej: 3000"
                    required
                  />
                </div>

                <div className="ph-form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
              </div>

              <button className="ph-btn-primary" type="submit">
                <Plus size={18} />
                Guardar gasto
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Gastos
