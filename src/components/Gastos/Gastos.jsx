import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Trash2, Search, Receipt, Calendar, X } from 'lucide-react'
import './Gastos.css'

import ConfirmDialog from '../Common/ConfirmDialog'
import { useConfirm } from '../Common/useConfirm'
import CustomSelect from '../Common/CustomSelect'
import PhDatePicker from '../Common/PhDatePicker'

function Gastos({ profesorId }) {
  const { confirm, dialogProps } = useConfirm()

  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Material',
    fecha: todayISO
  })

  const categorias = ['Material', 'Alquiler', 'Servicios', 'Transporte', 'Equipamiento', 'Otro']
  const categoriaOptions = categorias.map((c) => ({ value: c, label: c }))

  const getMesNombre = (m) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[m - 1] || m
  }

  const monthOptions = [...Array(12)].map((_, i) => ({
    value: i + 1,
    label: getMesNombre(i + 1)
  }))

  const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028].map((y) => ({
    value: y,
    label: y.toString()
  }))

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
    setFormData({ descripcion: '', monto: '', categoria: 'Material', fecha: todayISO })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormData({ descripcion: '', monto: '', categoria: 'Material', fecha: todayISO })
  }

  const addGasto = async (e) => {
    e.preventDefault()
    setErrorMsg('')

    const montoNum = Number(formData.monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setErrorMsg('El monto debe ser mayor a 0.')
      return
    }

    const payload = {
      profesor_id: profesorId,
      descripcion: formData.descripcion,
      monto: montoNum,
      categoria: formData.categoria,
      fecha: (formData.fecha || todayISO)
    }

    const { error } = await supabase.from('gastos').insert([payload])

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

  const gastosDelMes = useMemo(() => {
    return gastos.filter((g) => {
      const d = new Date(`${g.fecha}T00:00:00`)
      if (Number.isNaN(d.getTime())) return false
      return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear
    })
  }, [gastos, selectedMonth, selectedYear])

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return gastosDelMes
    return gastosDelMes.filter((g) =>
      (g.descripcion || '').toLowerCase().includes(s) ||
      (g.categoria || '').toLowerCase().includes(s)
    )
  }, [gastosDelMes, searchTerm])

  const totalMes = useMemo(() => {
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
    <div className="ph-page gastos-page">
      <ConfirmDialog {...dialogProps} />

      <div className="ph-header">
        <div>
          <h1>Gastos</h1>
          <p>Registrá egresos (materiales, alquiler, etc.)</p>
        </div>

        <button className="ph-btn-primary" onClick={openModal} type="button">
          <Plus size={18} /> Nuevo gasto
        </button>
      </div>

      {errorMsg && <div className="ph-alert">{errorMsg}</div>}

      <div className="ph-filters">
        <div className="ph-filter-left">
          <div className="ph-pill">
            <Calendar size={18} />
            <CustomSelect
              value={selectedMonth}
              onChange={(value) => setSelectedMonth(Number(value))}
              options={monthOptions}
            />
            <CustomSelect
              value={selectedYear}
              onChange={(value) => setSelectedYear(Number(value))}
              options={yearOptions}
            />
          </div>
        </div>

        <div className="ph-searchbar">
          <Search size={18} />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por descripción o categoría..."
          />
        </div>

        <div className="ph-total gastos-total">
          <Receipt size={18} />
          <span>Total: </span>
          <strong>${totalMes.toLocaleString('es-UY')}</strong>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="ph-empty">
          <Receipt size={42} />
          <h2>No hay gastos</h2>
          <p>
            {searchTerm
              ? 'No coincide ningún gasto.'
              : 'Agregá tu primer gasto para llevar control.'}
          </p>
        </div>
      ) : (
        <div className="ph-list">
          {filtered.map((g) => (
            <div key={g.id} className="ph-row">
              <div className="ph-row-left">
                <div className="ph-row-icon ph-row-icon-purple">
                  <Receipt size={20} />
                </div>

                <div className="ph-row-info">
                  <div className="ph-row-title">
                    {g.descripcion}
                    <span className="ph-badge purple">{g.categoria}</span>
                  </div>

                  <div className="gasto-date">
                    <Calendar size={14} />
                    <span>{new Date(`${g.fecha}T00:00:00`).toLocaleDateString('es-UY')}</span>
                  </div>
                </div>
              </div>

              <div className="ph-row-right">
                <div className="ph-row-amount">
                  ${Number(g.monto).toLocaleString('es-UY')}
                </div>

                <button
                  type="button"
                  className="ph-icon-delete"
                  onClick={() => deleteGasto(g.id)}
                  title="Eliminar"
                  aria-label="Eliminar gasto"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
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

              <div className="ph-grid-2">
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
                  <PhDatePicker
                    value={formData.fecha}
                    onChange={(iso) => setFormData((s) => ({ ...s, fecha: iso || todayISO }))}
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
