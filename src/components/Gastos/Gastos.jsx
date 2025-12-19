import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Trash2, X, Search, Receipt, Calendar } from 'lucide-react'
import './Gastos.css'

import ConfirmDialog from '../Common/ConfirmDialog'
import { useConfirm } from '../Common/useConfirm'
import CustomSelect from '../Common/CustomSelect'

function Gastos({ profesorId }) {
  const { confirm, dialogProps } = useConfirm()

  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const today = new Date().toISOString().slice(0, 10)

  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Material',
    fecha: today
  })

  const categorias = ['Material', 'Alquiler', 'Servicios', 'Transporte', 'Equipamiento', 'Otro']
  const categoriaOptions = categorias.map(c => ({ value: c, label: c }))

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    setLoading(true)
    setErrorMsg('')
    const { data, error } = await supabase
      .from('gastos')
      .select('*')
      .eq('profesor_id', profesorId)
      .order('fecha', { ascending: false })

    if (error) setErrorMsg('No pude cargar los gastos.')
    else setGastos(data || [])
    setLoading(false)
  }

  const openModal = () => {
    setErrorMsg('')
    setFormData({ descripcion: '', monto: '', categoria: 'Material', fecha: today })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ descripcion: '', monto: '', categoria: 'Material', fecha: today })
  }

  const addGasto = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const montoNum = Number(formData.monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setErrorMsg('El monto debe ser mayor a 0.')
      return
    }

    const { error } = await supabase
      .from('gastos')
      .insert([{
        profesor_id: profesorId,
        descripcion: formData.descripcion,
        monto: montoNum,
        categoria: formData.categoria,
        fecha: formData.fecha
      }])

    if (error) {
      setErrorMsg('Error al crear gasto: ' + error.message)
      return
    }

    await load()
    closeModal()
  }

  const deleteGasto = async (id) => {
    const ok = await confirm({
      title: 'Eliminar gasto',
      message: '¿Seguro? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    })
    if (!ok) return

    const { error } = await supabase.from('gastos').delete().eq('id', id)
    if (!error) await load()
  }

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return gastos
    return gastos.filter(g =>
      (g.descripcion || '').toLowerCase().includes(s) ||
      (g.categoria || '').toLowerCase().includes(s)
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
      <ConfirmDialog {...dialogProps} />

      <div className="expenses-header">
        <div>
          <h1>Gastos</h1>
          <p>Registrá egresos (materiales, alquiler, etc.)</p>
        </div>

        <button className="ph-btn-primary" onClick={openModal}>
          <Plus size={18} /> Nuevo gasto
        </button>
      </div>

      {errorMsg && <div className="ph-alert">{errorMsg}</div>}

      <div className="expenses-top">
        <div className="ph-card ph-search">
          <Search size={18} className="ph-search-icon" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descripción o categoría..."
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
              <div className="expense-concept">
                {g.descripcion}
                <span className="expense-category">{g.categoria}</span>
              </div>
              <div className="expense-date">
                <Calendar size={14} />
                <span>{new Date(g.fecha).toLocaleDateString('es-UY')}</span>
              </div>
            </div>

            <div className="expense-right">
              <div className="expense-amount">${Number(g.monto).toLocaleString('es-UY')}</div>
              <button
                type="button"
                className="expense-delete"
                onClick={() => deleteGasto(g.id)}
                title="Eliminar"
                aria-label="Eliminar gasto"
              >
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
        <div className="ph-modal-bg" onMouseDown={closeModal}>
          <div className="ph-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>Nuevo gasto</h2>
              <button className="ph-icon-btn" onClick={closeModal} type="button" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form className="ph-form" onSubmit={addGasto}>
              <div className="ph-form-group">
                <label>Descripción *</label>
                <input
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Ej: Alquiler del local"
                  required
                />
              </div>

              <div className="ph-form-group">
                <label>Categoría *</label>
                <CustomSelect
                  value={formData.categoria}
                  onChange={(value) => setFormData({ ...formData, categoria: value })}
                  options={categoriaOptions}
                />
              </div>

              <div className="expenses-row">
                <div className="ph-form-group">
                  <label>Monto *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
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
