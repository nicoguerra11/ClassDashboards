import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import {
  Home,
  Users,
  UsersRound,
  CreditCard,
  TrendingUp,
  LogOut,
  GraduationCap,
  AlertCircle,
  DollarSign,
  Receipt
} from 'lucide-react'

import Estudiantes from '../Estudiantes/Estudiantes'
import Grupos from '../Grupos/Grupos'
import Pagos from '../Pagos/Pagos'
import Gastos from '../Gastos/Gastos'
import Progreso from '../Progreso/Progreso'

import './Dashboard.css'

function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [profesor, setProfesor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    estudiantesMesActual: 0,
    totalGrupos: 0,
    ingresoMensual: 0,
    pagosPendientesPreview: [],   // ✅
    pagosPendientesTotal: 0,      // ✅
    progresoPromedio: 0
  })

  useEffect(() => {
    getProfesor()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (profesor) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesor])

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
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { data: estudiantes, error: eEst } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('profesor_id', profesor.id)

      if (eEst) throw eEst

      const ahora = new Date()
      const mesActualDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const estudiantesMes =
        estudiantes?.filter(e => new Date(e.created_at) >= mesActualDate).length || 0

      const { data: grupos, error: eGrp } = await supabase
        .from('grupos')
        .select('*')
        .eq('profesor_id', profesor.id)

      if (eGrp) throw eGrp

      const mes = ahora.getMonth() + 1
      const anio = ahora.getFullYear()

      const { data: pagos, error: ePag } = await supabase
        .from('pagos')
        .select('monto')
        .eq('profesor_id', profesor.id)
        .eq('mes', mes)
        .eq('anio', anio)

      if (ePag) throw ePag

      const totalIngresos =
        pagos?.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) || 0

      const { data: pagosRealizados, error: ePagR } = await supabase
        .from('pagos')
        .select('estudiante_id')
        .eq('profesor_id', profesor.id)
        .eq('mes', mes)
        .eq('anio', anio)

      if (ePagR) throw ePagR

      const idsConPago = new Set(pagosRealizados?.map(p => p.estudiante_id) || [])
      const pendientesAll = estudiantes?.filter(e => !idsConPago.has(e.id)) || []
      const pendientesPreview = pendientesAll.slice(0, 3)

      // ✅ Progreso promedio: NO rompe si no existe 'clases'
      let progresoPromedio = 0

      if (estudiantes?.length) {
        try {
          const { data: clases, error: eCla } = await supabase
            .from('clases')
            .select('estudiante_id, asistio')
            .in('estudiante_id', estudiantes.map(e => e.id))

          // Si la tabla no existe o falla, no tiramos todo abajo:
          if (!eCla && clases?.length) {
            const porEstudiante = new Map()

            for (const c of clases) {
              if (!porEstudiante.has(c.estudiante_id)) {
                porEstudiante.set(c.estudiante_id, { total: 0, asistidas: 0 })
              }
              const obj = porEstudiante.get(c.estudiante_id)
              obj.total += 1
              if (c.asistio) obj.asistidas += 1
            }

            const porcentajes = [...porEstudiante.values()].map(v =>
              v.total > 0 ? (v.asistidas / v.total) * 100 : 0
            )

            progresoPromedio = porcentajes.length
              ? Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length)
              : 0
          }
        } catch (errClases) {
          // Silencioso: si no existe la tabla, listo. Progreso = 0.
          // console.warn('Tabla clases no disponible:', errClases)
        }
      }

      setStats({
        totalEstudiantes: estudiantes?.length || 0,
        estudiantesMesActual: estudiantesMes,
        totalGrupos: grupos?.length || 0,
        ingresoMensual: totalIngresos,
        pagosPendientesPreview: pendientesPreview,
        pagosPendientesTotal: pendientesAll.length,
        progresoPromedio
      })
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (profesor && !profesor.verificado) {
    return (
      <div className="verification-pending">
        <div className="verification-card">
          <div className="warning-icon">
            <AlertCircle size={60} />
          </div>
          <h2>Cuenta Pendiente de Verificación</h2>
          <p>Tu cuenta necesita ser verificada por un administrador.</p>
          <div className="info-box">
            <strong>Información:</strong>
            <p>{profesor.nombre} {profesor.apellido}</p>
            <p>{profesor.email}</p>
          </div>
          <button onClick={handleLogout} className="btn-logout">
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
    { id: 'gastos', label: 'Gastos', icon: Receipt },
    { id: 'progreso', label: 'Progreso', icon: TrendingUp }
  ]

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <div className="header-logo">
              <GraduationCap size={32} />
            </div>
            <div className="header-title">
              <h1>ProfesorHub</h1>
              <p>Plataforma de Gestión</p>
            </div>
          </div>

          <div className="header-right">
            <div className="user-info">
              <p className="user-name">{profesor?.nombre} {profesor?.apellido}</p>
              <p className="user-email">{profesor?.email}</p>
            </div>
            <button onClick={handleLogout} className="btn-logout-header" title="Cerrar sesión">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <nav className="dashboard-nav">
        <div className="nav-content">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <main className="dashboard-main">
        {activeTab === 'dashboard' && (
          <div className="dashboard-home">
            <div className="welcome-banner">
              <h2>¡Bienvenido, {profesor.nombre}!</h2>
              <p>
                Tienes {stats.totalEstudiantes} estudiantes y {stats.pagosPendientesTotal} pagos pendientes
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">Total Estudiantes</p>
                    <h3 className="stat-value">{stats.totalEstudiantes}</h3>
                  </div>
                  <div className="stat-icon purple">
                    <Users size={32} />
                  </div>
                </div>
                {stats.estudiantesMesActual > 0 && (
                  <div className="stat-badge">
                    +{stats.estudiantesMesActual} este mes
                  </div>
                )}
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">Ingreso Mensual</p>
                    <h3 className="stat-value">${stats.ingresoMensual.toLocaleString('es-UY')}</h3>
                  </div>
                  <div className="stat-icon pink">
                    <DollarSign size={32} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">Total Grupos</p>
                    <h3 className="stat-value">{stats.totalGrupos}</h3>
                  </div>
                  <div className="stat-icon orange">
                    <UsersRound size={32} />
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">Progreso Promedio</p>
                    <h3 className="stat-value">{stats.progresoPromedio}%</h3>
                  </div>
                  <div className="stat-icon purple">
                    <TrendingUp size={32} />
                  </div>
                </div>
              </div>
            </div>

            {stats.pagosPendientesPreview.length > 0 && (
              <div className="pending-payments">
                <div className="section-header">
                  <div className="section-icon">
                    <AlertCircle size={24} />
                  </div>
                  <h2>Pagos Pendientes</h2>
                </div>

                <div className="payments-list">
                  {stats.pagosPendientesPreview.map((estudiante) => (
                    <div key={estudiante.id} className="payment-item">
                      <span className="payment-name">
                        {estudiante.nombre} {estudiante.apellido}
                      </span>
                      <span className="payment-badge">Pago pendiente</span>
                    </div>
                  ))}
                </div>

                {stats.pagosPendientesTotal > stats.pagosPendientesPreview.length && (
                  <div style={{ marginTop: 10, color: '#6b7280', fontWeight: 700 }}>
                    Mostrando {stats.pagosPendientesPreview.length} de {stats.pagosPendientesTotal}.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'estudiantes' && <Estudiantes profesorId={session.user.id} />}
        {activeTab === 'grupos' && <Grupos profesorId={session.user.id} />}
        {activeTab === 'pagos' && <Pagos profesorId={session.user.id} />}
        {activeTab === 'gastos' && <Gastos profesorId={session.user.id} />}
        {activeTab === 'progreso' && <Progreso profesorId={session.user.id} />}
      </main>
    </div>
  )
}

export default Dashboard
