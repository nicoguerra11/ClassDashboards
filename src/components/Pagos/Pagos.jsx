import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../supabaseClient'
import { Search, Calendar, DollarSign, Plus, Trash2, X } from 'lucide-react'

import SearchableStudentSelect from '../Common/SearchableStudentSelect'
import CustomSelect from '../Common/CustomSelect'
import ConfirmDialog from '../Common/ConfirmDialog'
import { useConfirm } from '../Common/useConfirm'
import PhDatePicker from '../Common/PhDatePicker'

import './Pagos.css'

function Pagos({ profesorId }) {
  const { confirm, dialogProps } = useConfirm()

  const [pagos, setPagos] = useState([])
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear())

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), [])

  const [formData, setFormData] = useState({
    tipo: 'mensual', // 'mensual' | 'unico'
    estudiante_id: '',
    monto: '',
    mes: selectedMonth,
    anio: selectedYear,
    fecha_pago: todayISO
  })

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setFormData((s) => ({ ...s, mes: selectedMonth, anio: selectedYear }))
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    setLoading(true)
    await Promise.all([loadPagos(), loadEstudiantes()])
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
      .order('created_at', { ascending: false })

    if (!error && data) setPagos(data)
  }

  const loadEstudiantes = async () => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido, grupo_id, grupos (nombre, color)')
      .eq('profesor_id', profesorId)
      .order('apellido', { ascending: true })

    if (!error && data) setEstudiantes(data)
  }

  const filteredPagos = useMemo(() => {
    let filtered = pagos.filter((p) => p.mes === selectedMonth && p.anio === selectedYear)

    const s = searchTerm.trim().toLowerCase()
    if (s) {
      filtered = filtered.filter((p) => {
        const e = p.estudiantes
        return (
          (e?.nombre || '').toLowerCase().includes(s) ||
          (e?.apellido || '').toLowerCase().includes(s) ||
          (e?.grupos?.nombre || '').toLowerCase().includes(s)
        )
      })
    }
    return filtered
  }, [pagos, selectedMonth, selectedYear, searchTerm])

  const totalMes = useMemo(() => {
    return filteredPagos.reduce((sum, p) => sum + (Number(p.monto) || 0), 0)
  }, [filteredPagos])

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

  const tipoOptions = [
    { value: 'mensual', label: 'Pago mensual' },
    { value: 'unico', label: 'Pago único (por clase/consulta)' }
  ]

  const openModal = () => {
    setFormError('')
    setSaving(false)
    setFormData({
      tipo: 'mensual',
      estudiante_id: '',
      monto: '',
      mes: selectedMonth,
      anio: selectedYear,
      fecha_pago: todayISO
    })
    setShowModal(true)
  }

  const closeModal = () => {
    if (saving) return
    setShowModal(false)
    setFormError('')
    setSaving(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (saving) return

    setFormError('')

    if (!formData.estudiante_id) {
      setFormError('Elegí un estudiante.')
      return
    }

    const montoNum = Number(formData.monto)
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setFormError('Ingresá un monto válido (mayor a 0).')
      return
    }

    const tipo = formData.tipo

    const fechaPago = (formData.fecha_pago || '').trim()
    const fechaFinal = fechaPago || todayISO

    let mesFinal = Number(formData.mes)
    let anioFinal = Number(formData.anio)

    if (tipo === 'unico') {
      const d = new Date(`${fechaFinal}T00:00:00`)
      if (Number.isNaN(d.getTime())) {
        setFormError('La fecha de pago no es válida.')
        return
      }
      mesFinal = d.getMonth() + 1
      anioFinal = d.getFullYear()
    } else {
      if (!mesFinal || !anioFinal) {
        setFormError('Elegí mes y año.')
        return
      }
    }

    setSaving(true)

    try {
      const { data: existingPago, error: exErr } = await supabase
        .from('pagos')
        .select('id')
        .eq('estudiante_id', formData.estudiante_id)
        .eq('mes', mesFinal)
        .eq('anio', anioFinal)
        .maybeSingle()

      if (!exErr && existingPago) {
        const ok = await confirm({
          title: 'Pago duplicado',
          message: 'Ya existe un pago para este estudiante en ese mes/año. ¿Querés registrarlo igual?',
          confirmText: 'Registrar igual',
          cancelText: 'Cancelar',
          variant: 'warning'
        })
        if (!ok) {
          setSaving(false)
          return
        }
      }

      const payload = {
        profesor_id: profesorId,
        estudiante_id: formData.estudiante_id,
        monto: montoNum,
        mes: mesFinal,
        anio: anioFinal,
        fecha_pago: fechaFinal,
        metodo_pago: null,
        notas: null
      }

      const { error } = await supabase.from('pagos').insert([payload])

      if (error) {
        const msg = (error.message || '').toLowerCase()
        if (error.code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
          setFormError('Ya existe un pago para este estudiante en ese mes/año.')
        } else {
          setFormError(error.message || 'Error al registrar el pago.')
        }
        setSaving(false)
        return
      }

      await loadPagos()
      closeModal()
    } catch (err) {
      console.error(err)
      setFormError('Error inesperado al registrar el pago.')
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar pago',
      message: '¿Seguro? Este pago se borrará definitivamente.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    })
    if (!ok) return

    const { error } = await supabase.from('pagos').delete().eq('id', id)
    if (!error) await loadPagos()
  }

  if (loading) {
    return (
      <div className="ph-loading">
        <div className="ph-spinner"></div>
        <p>Cargando pagos...</p>
      </div>
    )
  }

  return (
    <div className="ph-page pagos-page">
      <ConfirmDialog {...dialogProps} />

      <div className="ph-header">
        <div>
          <h1>Pagos</h1>
          <p>Registrá pagos manualmente (mes actual: {selectedMonth}/{selectedYear})</p>
        </div>

        <button className="ph-btn-primary" onClick={openModal} type="button">
          <Plus size={18} />
          Registrar Pago
        </button>
      </div>

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
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre o grupo..."
          />
        </div>

        <div className="ph-total">
          <DollarSign size={18} />
          <span>Total: </span>
          <strong>${totalMes.toLocaleString('es-UY')}</strong>
        </div>
      </div>

      {filteredPagos.length === 0 ? (
        <div className="ph-empty">
          <DollarSign size={42} />
          <h2>No hay resultados</h2>
          <p>
            {searchTerm
              ? 'No se encontraron pagos con ese criterio de búsqueda.'
              : 'Todavía no hay pagos registrados para este mes.'}
          </p>
        </div>
      ) : (
        <div className="ph-list">
          {filteredPagos.map((pago) => {
            const estudiante = pago.estudiantes

            return (
              <div key={pago.id} className="ph-row">
                <div className="ph-row-left">
                  <div className="ph-row-icon ph-row-icon-green">
                    <DollarSign size={20} />
                  </div>

                  <div className="ph-row-info">
                    <div className="ph-row-title">
                      {estudiante?.nombre} {estudiante?.apellido}
                      {estudiante?.grupos && (
                        <span
                          className="ph-badge"
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
                </div>

                <div className="ph-row-right">
                  <div className="ph-row-amount green">
                    ${Number(pago.monto).toLocaleString('es-UY')}
                  </div>

                  <button
                    className="ph-icon-delete"
                    onClick={() => handleDelete(pago.id)}
                    aria-label="Eliminar pago"
                    title="Eliminar pago"
                    type="button"
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
        <div className="ph-modal-bg" onMouseDown={closeModal}>
          <div className="ph-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>Registrar Pago</h2>
              <button
                className="ph-icon-btn"
                onClick={closeModal}
                type="button"
                aria-label="Cerrar"
                disabled={saving}
              >
                <X size={20} />
              </button>
            </div>

            <form className="ph-form" onSubmit={handleSubmit}>
              <div className="ph-form-group">
                <label>Tipo *</label>
                <CustomSelect
                  value={formData.tipo}
                  onChange={(value) => {
                    const next = String(value)
                    setFormData((s) => ({
                      ...s,
                      tipo: next,
                      mes: next === 'mensual' ? selectedMonth : s.mes,
                      anio: next === 'mensual' ? selectedYear : s.anio
                    }))
                  }}
                  options={tipoOptions}
                />
              </div>

              <div className="ph-form-group">
                <label>Estudiante *</label>
                <SearchableStudentSelect
                  estudiantes={estudiantes}
                  value={formData.estudiante_id}
                  onChange={(value) => setFormData((s) => ({ ...s, estudiante_id: value }))}
                />
              </div>

              <div className="ph-form-group">
                <label>Monto *</label>
                <div className="ph-input-with-icon green">
                  <DollarSign size={18} />
                  <input
                    type="number"
                    value={formData.monto}
                    onChange={(e) => setFormData((s) => ({ ...s, monto: e.target.value }))}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                    disabled={saving}
                  />
                </div>
              </div>

              {formData.tipo === 'unico' && (
                <div className="ph-form-group">
                  <label>Fecha de pago *</label>
                  <PhDatePicker
                    value={formData.fecha_pago}
                    onChange={(iso) => setFormData((s) => ({ ...s, fecha_pago: iso || todayISO }))}
                    disabled={saving}
                  />
                </div>
              )}

              {formData.tipo === 'mensual' && (
                <div className="ph-grid-2">
                  <div className="ph-form-group">
                    <label>Mes *</label>
                    <CustomSelect
                      value={formData.mes}
                      onChange={(value) => setFormData((s) => ({ ...s, mes: Number(value) }))}
                      options={monthOptions}
                    />
                  </div>

                  <div className="ph-form-group">
                    <label>Año *</label>
                    <CustomSelect
                      value={formData.anio}
                      onChange={(value) => setFormData((s) => ({ ...s, anio: Number(value) }))}
                      options={yearOptions}
                    />
                  </div>
                </div>
              )}

              {formError && <div className="ph-form-error">{formError}</div>}

              <div className="ph-actions">
                <button type="button" className="ph-btn-secondary" onClick={closeModal} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="ph-btn-primary" disabled={saving}>
                  {saving ? 'Registrando...' : 'Registrar Pago'}
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
