import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Home, 
  Users, 
  UsersRound, 
  CreditCard, 
  TrendingUp,
  LogOut,
  GraduationCap,
  AlertCircle
} from 'lucide-react'
import DashboardHome from './DashboardHome'
import Estudiantes from './Estudiantes'

function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profesor, setProfesor] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getProfesor()
  }, [])

  const getProfesor = async () => {
    try {
      const { data, error } = await supabase
        .from('profesores')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error) throw error
      setProfesor(data)
    } catch (error) {
      console.error('Error al cargar datos del profesor:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600 text-xl">Cargando...</div>
      </div>
    )
  }

  // Verificar si el profesor está verificado
  if (profesor && !profesor.verificado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="bg-yellow-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <AlertCircle className="w-12 h-12 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Cuenta Pendiente de Verificación
          </h2>
          <p className="text-gray-600 mb-6">
            Tu cuenta ha sido creada exitosamente, pero necesita ser verificada por un administrador 
            antes de que puedas acceder a la plataforma. Recibirás un correo cuando tu cuenta sea activada.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-800 text-sm">
              <strong>Información del registro:</strong><br/>
              Nombre: {profesor.nombre} {profesor.apellido}<br/>
              Email: {profesor.email}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'estudiantes', label: 'Estudiantes', icon: Users },
    { id: 'grupos', label: 'Grupos', icon: UsersRound },
    { id: 'pagos', label: 'Pagos', icon: CreditCard },
    { id: 'progreso', label: 'Progreso', icon: TrendingUp },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-full">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ProfesorHub</h1>
                <p className="text-sm opacity-90">Plataforma de Gestión</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold">
                  {profesor?.nombre} {profesor?.apellido}
                </p>
                <p className="text-sm opacity-90">{profesor?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 font-medium whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'text-purple-600 border-b-2 border-purple-600'
                      : 'text-gray-600 hover:text-purple-600'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardHome profesor={profesor} />}
        {activeTab === 'estudiantes' && <Estudiantes profesorId={session.user.id} />}
        {activeTab === 'grupos' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Grupos</h2>
            <p className="text-gray-600">Próximamente...</p>
          </div>
        )}
        {activeTab === 'pagos' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Pagos</h2>
            <p className="text-gray-600">Próximamente...</p>
          </div>
        )}
        {activeTab === 'progreso' && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Progreso</h2>
            <p className="text-gray-600">Próximamente...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard