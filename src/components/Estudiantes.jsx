import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
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
  Users
} from 'lucide-react'

function Estudiantes({ profesorId }) {
  const [estudiantes, setEstudiantes] = useState([])
  const [grupos, setGrupos] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEstudiante, setEditingEstudiante] = useState(null)
  const [loading, setLoading] = useState(true)
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

    if (!error && data) {
      setEstudiantes(data)
    }
  }

  const loadGrupos = async () => {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('profesor_id', profesorId)

    if (!error && data) {
      setGrupos(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (editingEstudiante) {
      // Actualizar
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
    } else {
      // Crear nuevo
      const { error } = await supabase
        .from('estudiantes')
        .insert([
          {
            profesor_id: profesorId,
            nombre: formData.nombre,
            apellido: formData.apellido,
            email: formData.email || null,
            telefono: formData.telefono || null,
            grupo_id: formData.grupo_id || null
          }
        ])

      if (!error) {
        await loadEstudiantes()
        closeModal()
      }
    }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de eliminar este estudiante?')) {
      const { error } = await supabase
        .from('estudiantes')
        .delete()
        .eq('id', id)

      if (!error) {
        await loadEstudiantes()
      }
    }
  }

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

  const hasPagadoEsteMes = (pagos) => {
    if (!pagos || pagos.length === 0) return false
    const ahora = new Date()
    const mesActual = ahora.getMonth() + 1
    const anioActual = ahora.getFullYear()
    
    return pagos.some(p => p.mes === mesActual && p.anio === anioActual)
  }

  const filteredEstudiantes = estudiantes.filter(e => {
    const searchLower = searchTerm.toLowerCase()
    return (
      e.nombre.toLowerCase().includes(searchLower) ||
      e.apellido.toLowerCase().includes(searchLower) ||
      (e.email && e.email.toLowerCase().includes(searchLower)) ||
      (e.grupos && e.grupos.nombre.toLowerCase().includes(searchLower))
    )
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando estudiantes...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Estudiantes</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tu lista de estudiantes ({filteredEstudiantes.length})
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Estudiante
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email o grupo..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
          />
        </div>
      </div>

      {/* Students List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredEstudiantes.map((estudiante) => {
          const pagado = hasPagadoEsteMes(estudiante.pagos)
          
          return (
            <div
              key={estudiante.id}
              className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
            >
              {/* Header con estado de pago */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {estudiante.nombre} {estudiante.apellido}
                  </h3>
                  {estudiante.grupos && (
                    <div className="flex items-center gap-2 mt-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span
                        className="text-sm px-2 py-1 rounded-full"
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
                <div className="flex items-center gap-2">
                  {pagado ? (
                    <div className="bg-green-100 p-2 rounded-lg" title="Pagado este mes">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                  ) : (
                    <div className="bg-red-100 p-2 rounded-lg" title="Pago pendiente">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Información de contacto */}
              <div className="space-y-2 mb-4">
                {estudiante.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{estudiante.email}</span>
                  </div>
                )}
                {estudiante.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{estudiante.telefono}</span>
                  </div>
                )}
              </div>

              {/* Estado de pago */}
              <div className="mb-4">
                <div className={`text-sm font-medium px-3 py-2 rounded-lg ${
                  pagado 
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}>
                  {pagado ? '✓ Pagado este mes' : '✗ Pago pendiente'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => openModal(estudiante)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(estudiante.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {filteredEstudiantes.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">
            {searchTerm ? 'No se encontraron estudiantes con ese criterio de búsqueda.' : 'Aún no tienes estudiantes. ¡Agrega tu primer estudiante!'}
          </p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingEstudiante ? 'Editar Estudiante' : 'Nuevo Estudiante'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Apellido *
                    </label>
                    <input
                      type="text"
                      value={formData.apellido}
                      onChange={(e) => setFormData({...formData, apellido: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grupo
                  </label>
                  <select
                    value={formData.grupo_id}
                    onChange={(e) => setFormData({...formData, grupo_id: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                  >
                    <option value="">Sin grupo</option>
                    {grupos.map((grupo) => (
                      <option key={grupo.id} value={grupo.id}>
                        {grupo.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition font-semibold"
                  >
                    {editingEstudiante ? 'Guardar Cambios' : 'Crear Estudiante'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Estudiantes