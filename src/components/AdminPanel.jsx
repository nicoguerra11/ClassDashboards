import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Mail, 
  Calendar,
  ArrowLeft,
  Search,
  AlertCircle
} from 'lucide-react'

function AdminPanel() {
  const [profesores, setProfesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('todos') // todos, verificados, pendientes
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  // Contraseña temporal del admin (cambiar en producción)
  const ADMIN_PASSWORD = 'marichla' // CAMBIAR ESTO

  useEffect(() => {
    if (isAuthenticated) {
      loadProfesores()
    }
  }, [isAuthenticated])

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (adminPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true)
    } else {
      alert('Contraseña incorrecta')
    }
  }

  const loadProfesores = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profesores')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setProfesores(data || [])
    } catch (error) {
      console.error('Error al cargar profesores:', error)
    } finally {
      setLoading(false)
    }
  }

  const verificarProfesor = async (profesorId) => {
    try {
      const { error } = await supabase
        .from('profesores')
        .update({ 
          verificado: true,
          fecha_verificacion: new Date().toISOString()
        })
        .eq('id', profesorId)

      if (error) throw error
      
      alert('Profesor verificado exitosamente')
      loadProfesores()
    } catch (error) {
      console.error('Error al verificar profesor:', error)
      alert('Error al verificar profesor')
    }
  }

  const revocarVerificacion = async (profesorId) => {
    if (confirm('¿Estás seguro de revocar la verificación de este profesor?')) {
      try {
        const { error } = await supabase
          .from('profesores')
          .update({ 
            verificado: false,
            fecha_verificacion: null
          })
          .eq('id', profesorId)

        if (error) throw error
        
        alert('Verificación revocada')
        loadProfesores()
      } catch (error) {
        console.error('Error al revocar verificación:', error)
        alert('Error al revocar verificación')
      }
    }
  }

  const eliminarProfesor = async (profesorId) => {
    if (confirm('¿Estás seguro de eliminar este profesor? Esta acción eliminará todos sus datos.')) {
      try {
        const { error } = await supabase
          .from('profesores')
          .delete()
          .eq('id', profesorId)

        if (error) throw error
        
        alert('Profesor eliminado')
        loadProfesores()
      } catch (error) {
        console.error('Error al eliminar profesor:', error)
        alert('Error al eliminar profesor')
      }
    }
  }

  // Login del admin
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-full">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
            Panel de Administración
          </h1>
          <p className="text-center text-gray-600 mb-8">
            Ingresa la contraseña de administrador
          </p>

          <form onSubmit={handleAdminLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition"
            >
              Acceder
            </button>
          </form>

          <button
            onClick={() => navigate('/')}
            className="w-full mt-4 text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  const filteredProfesores = profesores.filter(p => {
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase())
    
    if (filter === 'verificados') return matchesSearch && p.verificado
    if (filter === 'pendientes') return matchesSearch && !p.verificado
    return matchesSearch
  })

  const stats = {
    total: profesores.length,
    verificados: profesores.filter(p => p.verificado).length,
    pendientes: profesores.filter(p => !p.verificado).length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold">Panel de Administración</h1>
                <p className="text-sm opacity-90">Gestión de Profesores</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Total Profesores</p>
                <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Verificados</p>
                <p className="text-3xl font-bold text-gray-800">{stats.verificados}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-gray-600 text-sm">Pendientes</p>
                <p className="text-3xl font-bold text-gray-800">{stats.pendientes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('todos')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'todos' 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilter('verificados')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'verificados' 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Verificados
              </button>
              <button
                onClick={() => setFilter('pendientes')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'pendientes' 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Pendientes
              </button>
            </div>
          </div>
        </div>

        {/* Profesores List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando profesores...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProfesores.map((profesor) => (
              <div
                key={profesor.id}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {profesor.nombre} {profesor.apellido}
                      </h3>
                      {profesor.verificado ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          Verificado
                        </span>
                      ) : (
                        <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          Pendiente
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-gray-600">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{profesor.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Registrado: {new Date(profesor.created_at).toLocaleDateString('es-UY')}</span>
                      </div>
                      {profesor.fecha_verificacion && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Verificado: {new Date(profesor.fecha_verificacion).toLocaleDateString('es-UY')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {profesor.verificado ? (
                      <button
                        onClick={() => revocarVerificacion(profesor.id)}
                        className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition font-medium flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Revocar
                      </button>
                    ) : (
                      <button
                        onClick={() => verificarProfesor(profesor.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Verificar
                      </button>
                    )}
                    <button
                      onClick={() => eliminarProfesor(profesor.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredProfesores.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No se encontraron profesores</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminPanel