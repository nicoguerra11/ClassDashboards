import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Receipt,
  X
} from 'lucide-react'

import Estudiantes from '../Estudiantes/Estudiantes'
import Grupos from '../Grupos/Grupos'
import Pagos from '../Pagos/Pagos'
import Gastos from '../Gastos/Gastos'
import Progreso from '../Progreso/Progreso'

import './Dashboard.css'

function Dashboard({ session }) {
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('dashboard')
  const [profesor, setProfesor] = useState(null)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    totalEstudiantes: 0,
    estudiantesMesActual: 0,
    totalGrupos: 0,
    ingresoMensual: 0,
    pagosPendientesTotal: 0,
    pagosPendientesPreview: [],
    pagosPendientesAll: []
  })

  const [openPendientes, setOpenPendientes] = useState(false)

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId) {
      navigate('/login', { replace: true })
      return
    }

    getOrCreateProfesor(userId)

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession?.user) navigate('/login', { replace: true })
    })

    return () => {
      sub?.subscription?.unsubscribe?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (profesor) loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profesor])

  const getOrCreateProfesor = async (userId) => {
    setLoading(true)
    try {
      const { data: prof, error: profError } = await supabase
        .from('profesores')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (profError) throw profError

      if (prof) {
        setProfesor(prof)
        return
      }

      const email = session?.user?.email?.toLowerCase() || ''
      const meta = session?.user?.user_metadata || {}
      const nombre = (meta.nombre || '').trim()
      const apellido = (meta.apellido || '').trim()

      const safeNombre = nombre || 'Profesor'
      const safeApellido = apellido || 'SinApellido'

      const { data: created, error: createError } = await supabase
        .from('profesores')
        .upsert(
          [
            {
              id: userId,
              nombre: safeNombre,
              apellido: safeApellido,
              email,
              verificado: false,
              deshabilitado: false
            }
          ],
          { onConflict: 'id' }
        )
        .select('*')
        .single()

      if (createError) throw createError
      setProfesor(created)
    } catch (err) {
      console.error('Error cargando/creando profesor:', err)
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      // Estudiantes (completo, porque lo vamos a usar para modal)
      const { data: estudiantes, error: eEst } = await supabase
        .from('estudiantes')
        .select('id, nombre, apellido, created_at')
        .eq('profesor_id', profesor.id)

      if (eEst) throw eEst

      const ahora = new Date()
      const mesActualDate = new Date(ahora.getFullYear(), ahora.getMonth(), 1)
      const estudiantesMes =
        estudiantes?.filter((e) => new Date(e.created_at) >= mesActualDate).length || 0

      // Grupos
      const { data: grupos, error: eGrp } = await supabase
        .from('grupos')
        .select('*')
        .eq('profesor_id', profesor.id)

      if (eGrp) throw eGrp

      const mes = ahora.getMonth() + 1
      const anio = ahora.getFullYear()

      // Pagos del mes actual (solo para calcular ingreso mensual y who paid)
      const { data: pagos, error: ePag } = await supabase
        .from('pagos')
        .select('monto, estudiante_id')
        .eq('profesor_id', profesor.id)
        .eq('mes', mes)
        .eq('anio', anio)

      if (ePag) throw ePag

      const totalIngresos =
        pagos?.reduce((sum, p) => sum + (Number(p.monto) || 0), 0) || 0

      const idsConPago = new Set(pagos?.map((p) => String(p.estudiante_id)) || [])
      const pendientesAll =
        (estudiantes || []).filter((e) => !idsConPago.has(String(e.id))) || []

      // Preview (primeros 3) para banner o lo que quieras
      const pendientesPreview = pendientesAll.slice(0, 3)

      setStats({
        totalEstudiantes: estudiantes?.length || 0,
        estudiantesMesActual: estudiantesMes,
        totalGrupos: grupos?.length || 0,
        ingresoMensual: totalIngresos,
        pagosPendientesTotal: pendientesAll.length,
        pagosPendientesPreview: pendientesPreview,
        pagosPendientesAll: pendientesAll
      })
    } catch (error) {
      console.error('Error al cargar estadísticas:', error)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  const closePendientes = () => setOpenPendientes(false)

  const pendientesTitle = useMemo(() => {
    const n = stats.pagosPendientesTotal
    if (n === 0) return 'Pagos al día 🎉'
    if (n === 1) return '1 pago pendiente'
    return `${n} pagos pendientes`
  }, [stats.pagosPendientesTotal])

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!profesor) {
    return (
      <div className="verification-pending">
        <div className="verification-card">
          <div className="warning-icon">
            <AlertCircle size={60} />
          </div>
          <h2>No se pudo cargar tu perfil</h2>
          <p>Probá cerrar sesión y volver a entrar.</p>
          <button onClick={handleLogout} className="btn-logout">
            Ir a Login
          </button>
        </div>
      </div>
    )
  }

  if (!profesor.verificado) {
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
            <p>
              {profesor.nombre} {profesor.apellido}
            </p>
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
              <p className="user-name">
                {profesor.nombre} {profesor.apellido}
              </p>
              <p className="user-email">{profesor.email}</p>
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
                  <div className="stat-badge">+{stats.estudiantesMesActual} este mes</div>
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

              {/* ✅ NUEVA: Pagos pendientes (clic abre modal) */}
              <button
                type="button"
                className="stat-card stat-card-clickable"
                onClick={() => stats.pagosPendientesTotal > 0 && setOpenPendientes(true)}
                title={stats.pagosPendientesTotal > 0 ? 'Ver estudiantes pendientes' : 'No hay pendientes'}
              >
                <div className="stat-content">
                  <div className="stat-info">
                    <p className="stat-label">Pagos Pendientes (mes)</p>
                    <h3 className="stat-value">{stats.pagosPendientesTotal}</h3>
                  </div>
                  <div className="stat-icon red">
                    <AlertCircle size={32} />
                  </div>
                </div>

                {stats.pagosPendientesTotal > 0 && (
                  <div className="stat-badge badge-red">Ver detalle</div>
                )}
              </button>
            </div>

            {/* ❌ Eliminamos el bloque rojo de abajo para que no sea redundante */}
          </div>
        )}

        {activeTab === 'estudiantes' && <Estudiantes profesorId={session.user.id} />}
        {activeTab === 'grupos' && <Grupos profesorId={session.user.id} />}
        {activeTab === 'pagos' && <Pagos profesorId={session.user.id} />}
        {activeTab === 'gastos' && <Gastos profesorId={session.user.id} />}
        {activeTab === 'progreso' && <Progreso profesorId={session.user.id} />}

        {/* ✅ MODAL PENDIENTES (estilo tuyo) */}
        {openPendientes && (
          <div className="ph-confirm-bg" onMouseDown={closePendientes}>
            <div className="ph-confirm" onMouseDown={(e) => e.stopPropagation()}>
              <div className="ph-confirm-header">
                <div className="ph-confirm-icon info">
                  <Users size={22} />
                </div>

                <div className="ph-confirm-title">
                  <h3>{pendientesTitle}</h3>
                  <p>Estudiantes que aún no registran pago este mes.</p>
                </div>

                <button
                  className="ph-confirm-close"
                  onClick={closePendientes}
                  type="button"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '0 1.25rem 1.25rem' }}>
                {stats.pagosPendientesAll.length === 0 ? (
                  <div style={{ color: '#6b7280', fontWeight: 700 }}>
                    No hay pagos pendientes.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {stats.pagosPendientesAll.map((e) => (
                      <div
                        key={e.id}
                        style={{
                          border: '2px solid #f3f4f6',
                          borderRadius: 16,
                          padding: '1rem',
                          background: '#fff'
                        }}
                      >
                        <div style={{ fontWeight: 900, color: '#111827' }}>
                          {e.nombre} {e.apellido}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: 16 }}>
                  <button className="ph-btn-secondary" type="button" onClick={closePendientes}>
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default Dashboard
