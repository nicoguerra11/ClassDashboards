import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Plus, Trash2, Edit2, Users, X, Search, Palette, Eye, UserCheck } from 'lucide-react'
import './Grupos.css'

import ConfirmDialog from '../Common/ConfirmDialog'
import { useConfirm } from '../Common/useConfirm'

function Grupos({ profesorId }) {
  const { confirm, dialogProps } = useConfirm()

  const [grupos, setGrupos] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [showModal, setShowModal] = useState(false)
  const [showStudentsModal, setShowStudentsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupStudents, setGroupStudents] = useState([])
  const [editing, setEditing] = useState(null)

  const [formData, setFormData] = useState({
    nombre: '',
    color: '#667eea'
  })

  useEffect(() => {
    loadGrupos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadGrupos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('profesor_id', profesorId)
      .order('created_at', { ascending: false })

    if (!error) setGrupos(data || [])
    setLoading(false)
  }

  const loadGroupStudents = async (grupoId) => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido, telefono')
      .eq('grupo_id', grupoId)
      .order('apellido', { ascending: true })

    if (!error) setGroupStudents(data || [])
  }

  const openModal = (grupo = null) => {
    if (grupo) {
      setEditing(grupo)
      setFormData({
        nombre: grupo.nombre || '',
        color: grupo.color || '#667eea'
      })
    } else {
      setEditing(null)
      setFormData({ nombre: '', color: '#667eea' })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setFormData({ nombre: '', color: '#667eea' })
  }

  const openStudentsModal = async (grupo) => {
    setSelectedGroup(grupo)
    await loadGroupStudents(grupo.id)
    setShowStudentsModal(true)
  }

  const closeStudentsModal = () => {
    setShowStudentsModal(false)
    setSelectedGroup(null)
    setGroupStudents([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (editing) {
      const { error } = await supabase
        .from('grupos')
        .update({
          nombre: formData.nombre,
          color: formData.color
        })
        .eq('id', editing.id)

      if (!error) {
        await loadGrupos()
        closeModal()
      }
      return
    }

    const { error } = await supabase
      .from('grupos')
      .insert([{
        profesor_id: profesorId,
        nombre: formData.nombre,
        color: formData.color
      }])

    if (!error) {
      await loadGrupos()
      closeModal()
    }
  }

  const handleDelete = async (grupoId) => {
    const ok = await confirm({
      title: 'Eliminar grupo',
      message: '¿Seguro? El grupo se eliminará. Los estudiantes quedarán "sin grupo".',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger'
    })
    if (!ok) return

    const { error } = await supabase
      .from('grupos')
      .delete()
      .eq('id', grupoId)

    if (!error) await loadGrupos()
  }

  const filtered = useMemo(() => {
    const s = searchTerm.trim().toLowerCase()
    if (!s) return grupos
    return grupos.filter(g => (g.nombre || '').toLowerCase().includes(s))
  }, [grupos, searchTerm])

  if (loading) {
    return (
      <div className="ph-loading">
        <div className="ph-spinner"></div>
        <p>Cargando grupos...</p>
      </div>
    )
  }

  return (
    <div className="ph-page">
      <ConfirmDialog {...dialogProps} />

      <div className="ph-page-header">
        <div>
          <h1>Grupos</h1>
          <p>Organizá a tus estudiantes por grupo ({filtered.length})</p>
        </div>

        <button className="ph-btn-primary" onClick={() => openModal()}>
          <Plus size={18} />
          Nuevo grupo
        </button>
      </div>

      <div className="ph-card ph-search">
        <Search size={18} className="ph-search-icon" />
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nombre..."
        />
      </div>

      <div className="groups-grid">
        {filtered.map((g) => (
          <div key={g.id} className="group-card">
            <div className="group-card-top">
              <div className="group-badge" style={{ background: `${g.color}20`, color: g.color }}>
                <Users size={16} />
                <span>{g.nombre}</span>
              </div>

              <div className="group-color-dot" style={{ background: g.color }} title={g.color} />
            </div>

            <div className="group-actions">
              <button className="ph-btn-info" onClick={() => openStudentsModal(g)} type="button">
                <Eye size={16} />
                Ver estudiantes
              </button>

              <button className="ph-btn-soft" onClick={() => openModal(g)} type="button">
                <Edit2 size={16} />
                Editar
              </button>

              <button className="ph-btn-danger" onClick={() => handleDelete(g.id)} type="button">
                <Trash2 size={16} />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="ph-empty">
          <Palette size={42} />
          <h2>No hay grupos</h2>
          <p>{searchTerm ? 'No coincide ningún grupo con tu búsqueda.' : 'Creá tu primer grupo para organizar estudiantes.'}</p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="ph-modal-bg" onMouseDown={closeModal}>
          <div className="ph-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>{editing ? 'Editar Grupo' : 'Nuevo Grupo'}</h2>
              <button className="ph-icon-btn" onClick={closeModal} type="button" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <form className="ph-form" onSubmit={handleSubmit}>
              <div className="ph-form-group">
                <label>Nombre *</label>
                <input
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: 3ro A"
                  required
                />
              </div>

              <div className="ph-form-group">
                <label>Color</label>
                <div className="ph-color-row">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <span className="ph-color-code">{formData.color}</span>
                </div>
              </div>

              <button className="ph-btn-primary" type="submit">
                {editing ? 'Guardar cambios' : 'Crear grupo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Estudiantes */}
      {showStudentsModal && selectedGroup && (
        <div className="ph-modal-bg" onMouseDown={closeStudentsModal}>
          <div className="ph-modal students-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="ph-modal-header">
              <h2>
                <UserCheck size={24} />
                Estudiantes de {selectedGroup.nombre}
              </h2>
              <button className="ph-icon-btn" onClick={closeStudentsModal} type="button" aria-label="Cerrar">
                <X size={20} />
              </button>
            </div>

            <div className="students-list-container">
              {groupStudents.length === 0 ? (
                <div className="ph-empty-students">
                  <Users size={48} />
                  <p>Este grupo aún no tiene estudiantes asignados.</p>
                </div>
              ) : (
                <div className="students-list">
                  {groupStudents.map((student) => (
                    <div key={student.id} className="student-item">
                      <div className="student-item-info">
                        <h4>{student.nombre} {student.apellido}</h4>
                        {student.telefono && (
                          <span className="student-phone">{student.telefono}</span>
                        )}
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

export default Grupos