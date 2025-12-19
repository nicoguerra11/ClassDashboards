import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Users,
  History,
  Calendar,
  DollarSign
} from 'lucide-react'
import './Estudiantes.css'

function Estudiantes({ profesorId }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentHistory, setStudentHistory] = useState([])
  const [editingEstudiante, setEditingEstudiante] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('todos') // 'todos', 'pagaron', 'pendientes'
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
    grupo_id: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([loadEstudiantes(), loadGrupos()])
    setLoading(false)
  }

  const loadEstudiantes = async () => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select(`
        *,
        grupos (nombre, color),
        pagos (mes, anio)
      `)
      .eq('profesor_id', profesorId)
      .order('created_at', { ascending: false })

    if (!error && data) setEstudiantes(data)
  }

  const loadGrupos = async () => {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('profesor_id', profesorId)

    if (!error && data) setGrupos(data)
  }

  const loadStudentHistory = async (estudianteId) => {
    const { data, error } = await supabase
      .from('pagos')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('anio', { ascending: false })
      .order('mes', { ascending: false })

    if (!error && data) {
      setStudentHistory(data)
    }
  }

  const hasPagadoEsteMes = (pagos) => {
    if (!pagos || pagos.length === 0) return false
    const ahora = new Date()
    const mesActual = ahora.getMonth() + 1
    const anioActual = ahora.getFullYear()
    return pagos.some(p => p.mes === mesActual && p.anio === anioActual)
  }

  const getFilteredEstudiantes = () => {
    let filtered = estudiantes.filter(e => {
      const s = searchTerm.toLowerCase()
      return (
        e.nombre.toLowerCase().includes(s) ||
        e.apellido.toLowerCase().includes(s) ||
        (e.email && e.email.toLowerCase().includes(s)) ||
        (e.grupos && e.grupos.nombre.toLowerCase().includes(s))
      )
    })

    if (filterTab === 'pagaron') {
      filtered = filtered.filter(e => hasPagadoEsteMes(e.pagos))
    } else if (filterTab === 'pendientes') {
      filtered = filtered.filter(e => !hasPagadoEsteMes(e.pagos))
    }

    return filtered
  }

  const filteredEstudiantes = getFilteredEstudiantes()

  const openModal = (estudiante = null) => {
    if (estudiante) {
      setEditingEstudiante(estudiante)
      setFormData({
        nombre: estudiante.nombre,
        apellido: estudiante.apellido,
        email: estudiante.email || '',
        telefono: estudiante.telefono || '',
        grupo_id: estudiante.grupo_id || ''
      })
    } else {
      setEditingEstudiante(null)
      setFormData({
        nombre: '',
        apellido: '',
        email: '',
        telefono: '',
        grupo_id: ''
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingEstudiante(null)
    setFormData({
      nombre: '',
      apellido: '',
      email: '',
      telefono: '',
      grupo_id: ''
    })
  }

  const openHistoryModal = async (estudiante) => {
    setSelectedStudent(estudiante)
    await loadStudentHistory(estudiante.id)
    setShowHistoryModal(true)
  }

  const closeHistoryModal = () => {
    setShowHistoryModal(false)
    setSelectedStudent(null)
    setStudentHistory([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (editingEstudiante) {
      const { error } = await supabase
        .from('estudiantes')
        .update({
          nombre: formData.nombre,
          apellido: formData.apellido,
          email: formData.email || null,
          telefono: formData.telefono || null,
          grupo_id: formData.grupo_id || null
        })
        .eq('id', editingEstudiante.id)

      if (!error) {
        await loadEstudiantes()
        closeModal()
      }
      return
    }

    const { error } = await supabase
      .from('estudiantes')
      .insert([{
        profesor_id: profesorId,
        nombre: formData.nombre,
        apellido: formData.apellido,
        email: formData.email || null,
        telefono: formData.telefono || null,
        grupo_id: formData.grupo_id || null
      }])

    if (!error) {
      await loadEstudiantes()
      closeModal()
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este estudiante?')) {
      const { error } = await supabase
        .from('estudiantes')
        .delete()
        .eq('id', id)

      if (!error) await loadEstudiantes()
    }
  }

  const getMesNombre = (mes) => {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    return meses[mes - 1] || mes
  }

  if (loading) {
    return (
      <div className="students-loading">
        <div className="students-loading-inner">
          <div className="students-spinner" />
          <p>Cargando estudiantes...</p>
        </div>
      </div>
    )
  }

  const pagaron = estudiantes.filter(e => hasPagadoEsteMes(e.pagos)).length
  const pendientes = estudiantes.length - pagaron

  return (
    <div className="students">
      {/* Header */}
      <div className="students-header">
        <div>
          <h1>Estudiantes</h1>
          <p>Gestiona tu lista de estudiantes ({filteredEstudiantes.length})</p>
        </div>

        <button className="students-primary-btn" onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo Estudiante
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="students-filter-tabs">
        <button
          className={`filter-tab ${filterTab === 'todos' ? 'active' : ''}`}
          onClick={() => setFilterTab('todos')}
        >
          <Users size={18} />
          Todos
          <span className="tab-badge">{estudiantes.length}</span>
        </button>
        <button
          className={`filter-tab ${filterTab === 'pagaron' ? 'active' : ''}`}
          onClick={() => setFilterTab('pagaron')}
        >
          <CheckCircle size={18} />
          Pagaron
          <span className="tab-badge success">{pagaron}</span>
        </button>
        <button
          className={`filter-tab ${filterTab === 'pendientes' ? 'active' : ''}`}
          onClick={() => setFilterTab('pendientes')}
        >
          <XCircle size={18} />
          Pendientes
          <span className="tab-badge danger">{pendientes}</span>
        </button>
      </div>

      {/* Search */}
      <div className="students-search-card">
        <div className="students-search">
          <Search size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o grupo..."
          />
        </div>
      </div>

      {/* Grid */}
      <div className="students-grid">
        {filteredEstudiantes.map((estudiante) => {
          const pagado = hasPagadoEsteMes(estudiante.pagos)

          return (
            <div key={estudiante.id} className="student-card">
              <div className="student-top">
                <div className="student-title">
                  <h3>{estudiante.nombre} {estudiante.apellido}</h3>

                  {estudiante.grupos && (
                    <div className="student-group">
                      <Users size={16} />
                      <span
                        className="student-group-badge"
                        style={{
                          backgroundColor: estudiante.grupos.color + '20',
                          color: estudiante.grupos.color
                        }}
                      >
                        {estudiante.grupos.nombre}
                      </span>
                    </div>
                  )}
                </div>

                <div className={`student-pay ${pagado ? 'ok' : 'bad'}`} title={pagado ? 'Pagado este mes' : 'Pago pendiente'}>
                  {pagado ? <CheckCircle size={20} /> : <XCircle size={20} />}
                </div>
              </div>

              <div className="student-contact">
                {estudiante.email && (
                  <div className="student-contact-item">
                    <Mail size={16} />
                    <span title={estudiante.email}>{estudiante.email}</span>
                  </div>
                )}
                {estudiante.telefono && (
                  <div className="student-contact-item">
                    <Phone size={16} />
                    <span>{estudiante.telefono}</span>
                  </div>
                )}
              </div>

              <div className={`student-status ${pagado ? 'ok' : 'bad'}`}>
                {pagado ? '✓ Pagado este mes' : '✗ Pago pendiente'}
              </div>

              <div className="student-actions">
                <button className="student-btn history" onClick={() => openHistoryModal(estudiante)} title="Ver historial">
                  <History size={16} />
                  Historial
                </button>
                <button className="student-btn edit" onClick={() => openModal(estudiante)}>
                  <Edit2 size={16} />
                  Editar
                </button>
                <button className="student-btn delete" onClick={() => handleDelete(estudiante.id)}>
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredEstudiantes.length === 0 && (
        <div className="students-empty">
          <p>
            {searchTerm
              ? 'No se encontraron estudiantes con ese criterio de búsqueda.'
              : filterTab === 'todos'
              ? 'Aún no tienes estudiantes. ¡Agrega tu primer estudiante!'
              : filterTab === 'pagaron'
              ? 'Ningún estudiante ha pagado este mes aún.'
              : 'No hay estudiantes con pagos pendientes.'}
          </p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="students-modal-overlay" onMouseDown={closeModal}>
          <div className="students-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="students-modal-header">
              <h2>{editingEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}</h2>
              <button className="students-icon-btn" onClick={closeModal} aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>

            <form className="students-form" onSubmit={handleSubmit}>
              <div className="students-form-row">
                <div className="students-field">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    required
                  />
                </div>

                <div className="students-field">
                  <label>Apellido *</label>
                  <input
                    type="text"
                    value={formData.apellido}
                    onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="students-field">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="students-field">
                <label>Teléfono</label>
                <input
                  type="tel"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                />
              </div>

              <div className="students-field">
                <label>Grupo</label>
                <div className="custom-select-wrapper">
                  <select
                    value={formData.grupo_id}
                    onChange={(e) => setFormData({ ...formData, grupo_id: e.target.value })}
                    className="custom-select"
                  >
                    <option value="">Sin grupo</option>
                    {grupos.map((g) => (
                      <option key={g.id} value={g.id}>{g.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="students-form-actions">
                <button type="button" className="students-secondary-btn" onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className="students-primary-btn">
                  {editingEstudiante ? 'Guardar Cambios' : 'Crear Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Historial */}
      {showHistoryModal && selectedStudent && (
        <div className="students-modal-overlay" onMouseDown={closeHistoryModal}>
          <div className="students-modal history-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="students-modal-header">
              <h2>
                <History size={24} />
                Historial de {selectedStudent.nombre} {selectedStudent.apellido}
              </h2>
              <button className="students-icon-btn" onClick={closeHistoryModal} aria-label="Cerrar">
                <X size={22} />
              </button>
            </div>

            <div className="history-content">
              {studentHistory.length === 0 ? (
                <div className="history-empty">
                  <Calendar size={48} />
                  <p>Este estudiante no tiene pagos registrados aún.</p>
                </div>
              ) : (
                <div className="history-list">
                  {studentHistory.map((pago) => (
                    <div key={pago.id} className="history-item">
                      <div className="history-date">
                        <Calendar size={20} />
                        <span className="history-month">{getMesNombre(pago.mes)} {pago.anio}</span>
                      </div>
                      <div className="history-amount">
                        <DollarSign size={18} />
                        <span>${Number(pago.monto).toLocaleString('es-UY')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Estudiantes