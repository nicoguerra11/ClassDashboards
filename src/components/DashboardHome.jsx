import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Users, CreditCard, UsersRound, TrendingUp, CheckCircle, XCircle } from 'lucide-react'

function DashboardHome({ profesor }) {
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    estudiantesMesActual: 0,
    totalGrupos: 0,
    gruposNuevos: 0,
    ingresoMensual: 0,
    cambioIngreso: 0,
    progresoPromedio: 0,
    cambioProgreso: 0
  })
  const [proximasClases, setProximasClases] = useState([])
  const [pagosPendientes, setPagosPendientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Obtener estadísticas
      await Promise.all([
        getEstudiantesStats(),
        getGruposStats(),
        getPagosStats(),
        getPagosPendientes()
      ])
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEstudiantesStats = async () => {
    const { data, error } = await supabase
      .from('estudiantes')
      .select('*')
      .eq('profesor_id', profesor.id)

    if (!error && data) {
      const ahora = new Date()
      const mesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      
      const estudiantesMesActual = data.filter(
        e => new Date(e.created_at) >= mesActual
      ).length

      setStats(prev => ({
        ...prev,
        totalEstudiantes: data.length,
        estudiantesMesActual
      }))
    }
  }

  const getGruposStats = async () => {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('profesor_id', profesor.id)

    if (!error && data) {
      const ahora = new Date()
      const mesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      
      const gruposNuevos = data.filter(
        g => new Date(g.created_at) >= mesActual
      ).length

      setStats(prev => ({
        ...prev,
        totalGrupos: data.length,
        gruposNuevos
      }))
    }
  }

  const getPagosStats = async () => {
    const ahora = new Date()
    const mesActual = ahora.getMonth() + 1
    const anioActual = ahora.getFullYear()

    // Pagos del mes actual
    const { data: pagosActual, error: errorActual } = await supabase
      .from('pagos')
      .select('monto')
      .eq('profesor_id', profesor.id)
      .eq('mes', mesActual)
      .eq('anio', anioActual)

    // Pagos del mes anterior
    const mesAnterior = mesActual === 1 ? 12 : mesActual - 1
    const anioAnterior = mesActual === 1 ? anioActual - 1 : anioActual

    const { data: pagosAnterior, error: errorAnterior } = await supabase
      .from('pagos')
      .select('monto')
      .eq('profesor_id', profesor.id)
      .eq('mes', mesAnterior)
      .eq('anio', anioAnterior)

    if (!errorActual && pagosActual) {
      const totalActual = pagosActual.reduce((sum, p) => sum + parseFloat(p.monto), 0)
      const totalAnterior = pagosAnterior?.reduce((sum, p) => sum + parseFloat(p.monto), 0) || 0
      
      const cambio = totalAnterior > 0 
        ? ((totalActual - totalAnterior) / totalAnterior * 100).toFixed(1)
        : 0

      setStats(prev => ({
        ...prev,
        ingresoMensual: totalActual,
        cambioIngreso: parseFloat(cambio)
      }))
    }
  }

  const getPagosPendientes = async () => {
    const ahora = new Date()
    const mesActual = ahora.getMonth() + 1
    const anioActual = ahora.getFullYear()

    // Obtener todos los estudiantes
    const { data: estudiantes, error: errorEst } = await supabase
      .from('estudiantes')
      .select('id, nombre, apellido')
      .eq('profesor_id', profesor.id)

    if (errorEst || !estudiantes) return

    // Obtener pagos del mes actual
    const { data: pagos, error: errorPagos } = await supabase
      .from('pagos')
      .select('estudiante_id')
      .eq('profesor_id', profesor.id)
      .eq('mes', mesActual)
      .eq('anio', anioActual)

    if (!errorPagos) {
      const estudiantesConPago = new Set(pagos?.map(p => p.estudiante_id) || [])
      const pendientes = estudiantes
        .filter(e => !estudiantesConPago.has(e.id))
        .slice(0, 3)

      setPagosPendientes(pendientes)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Cargando estadísticas...</div>
      </div>
    )
  }

  const StatCard = ({ title, value, change, icon: Icon, color }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-gray-800">{value}</h3>
        </div>
        <div className={`${color} bg-opacity-10 p-3 rounded-lg`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
      </div>
      {change !== null && (
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600 text-sm font-medium">
            {change > 0 ? '+' : ''}{change}{typeof value === 'string' && value.includes('$') ? '%' : ''} {change > 0 ? 'más que el mes pasado' : 'este mes'}
          </span>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">
          ¡Bienvenido de nuevo, {profesor.nombre}!
        </h1>
        <p className="text-lg opacity-90">
          Tienes {stats.totalEstudiantes} estudiantes activos y {pagosPendientes.length} pagos pendientes para revisar.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="TOTAL ESTUDIANTES"
          value={stats.totalEstudiantes}
          change={stats.estudiantesMesActual}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="INGRESO MENSUAL"
          value={`$${stats.ingresoMensual.toLocaleString('es-UY')}`}
          change={stats.cambioIngreso}
          icon={CreditCard}
          color="bg-pink-500"
        />
        <StatCard
          title="TOTAL GRUPOS"
          value={stats.totalGrupos}
          change={stats.gruposNuevos}
          icon={UsersRound}
          color="bg-orange-400"
        />
        <StatCard
          title="PROGRESO PROM."
          value={`${stats.progresoPromedio}%`}
          change={stats.cambioProgreso}
          icon={TrendingUp}
          color="bg-purple-600"
        />
      </div>

      {/* Pagos Pendientes */}
      {pagosPendientes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Pagos Pendientes Este Mes
          </h2>
          <div className="space-y-3">
            {pagosPendientes.map((estudiante) => (
              <div
                key={estudiante.id}
                className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <span className="font-medium text-gray-800">
                    {estudiante.nombre} {estudiante.apellido}
                  </span>
                </div>
                <span className="text-sm text-red-600 font-medium">
                  Pago pendiente
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardHome