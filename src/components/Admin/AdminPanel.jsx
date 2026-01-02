import { useState, useEffect } from 'react'
import { supabase, supabaseAdmin } from '../../supabaseClient'
import { useNavigate } from 'react-router-dom'
import {
  Shield,
  CheckCircle,
  XCircle,
  Mail,
  Calendar,
  ArrowLeft,
  Search,
  AlertCircle,
  RefreshCw,
  Trash2,
  Ban,
  Check,
  Key
} from 'lucide-react'
import './AdminPanel.css'

function AdminPanel() {
  const [profesores, setProfesores] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('todos')
  const [adminPassword, setAdminPassword] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  const ADMIN_PASSWORD = 'marichla'

  useEffect(() => {
    if (isAuthenticated) loadProfesores()
  }, [isAuthenticated])

  const handleAdminLogin = (e) => {
    e.preventDefault()
    if (adminPassword === ADMIN_PASSWORD) setIsAuthenticated(true)
    else alert('Contraseña incorrecta')
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
      alert('Error al cargar profesores: ' + error.message)
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
      alert('✅ Profesor verificado exitosamente')
      loadProfesores()
    } catch (error) {
      console.error('Error al verificar profesor:', error)
      alert('Error al verificar profesor: ' + error.message)
    }
  }

  const revocarVerificacion = async (profesorId) => {
    if (!confirm('¿Estás seguro de revocar la verificación de este profesor?')) return

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
      alert('Error al revocar verificación: ' + error.message)
    }
  }

  const deshabilitarProfesor = async (profesorId, deshabilitado) => {
    const accion = deshabilitado ? 'habilitar' : 'deshabilitar'
    if (!confirm(`¿Estás seguro de ${accion} esta cuenta?`)) return

    try {
      const { error } = await supabase
        .from('profesores')
        .update({
          deshabilitado: !deshabilitado
        })
        .eq('id', profesorId)

      if (error) throw error
      alert(deshabilitado ? '✅ Cuenta habilitada' : '🚫 Cuenta deshabilitada')
      loadProfesores()
    } catch (error) {
      console.error(`Error al ${accion} profesor:`, error)
      alert(`Error al ${accion} profesor: ` + error.message)
    }
  }

  const eliminarProfesor = async (profesorId) => {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este profesor? Esta acción es irreversible.')) return

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
      alert('Error al eliminar profesor: ' + error.message)
    }
  }

  // ✅ NUEVA FUNCIÓN: Resetear contraseña
  const resetearPassword = async (profesorId, email) => {
    const nuevaPassword = prompt(
      `🔑 Ingresá una nueva contraseña para ${email}:\n\n` +
      `(Mínimo 6 caracteres)\n` +
      `Luego comunicate con el profesor para darle su nueva contraseña.`
    )

    if (!nuevaPassword) return

    if (nuevaPassword.length < 6) {
      alert('❌ La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (!confirm(`¿Confirmar nueva contraseña para ${email}?`)) return

    try {
      // Actualizar contraseña usando admin API con Service Role Key
      const { error } = await supabaseAdmin.auth.admin.updateUserById(
        profesorId,
        { password: nuevaPassword }
      )

      if (error) throw error

      // Mostrar la contraseña para que puedas copiarla
      const copiar = confirm(
        `✅ Contraseña actualizada exitosamente!\n\n` +
        `Nueva contraseña: ${nuevaPassword}\n\n` +
        `¿Querés copiarla al portapapeles?`
      )

      if (copiar) {
        navigator.clipboard.writeText(nuevaPassword)
        alert('📋 Contraseña copiada al portapapeles')
      }
    } catch (error) {
      console.error('Error al resetear contraseña:', error)
      alert(
        '❌ Error al resetear contraseña\n\n' +
        'Detalles: ' + error.message + '\n\n' +
        'Verificá que el Service Role Key esté configurado correctamente en .env'
      )
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="admin-auth">
        <div className="admin-auth-bg" aria-hidden="true">
          <div className="admin-blob admin-blob-1"></div>
          <div className="admin-blob admin-blob-2"></div>
        </div>

        <div className="admin-auth-card">
          <div className="admin-auth-logo">
            <div className="admin-auth-glow"></div>
            <div className="admin-auth-icon">
              <Shield size={44} />
            </div>
          </div>

          <div className="admin-auth-header">
            <h1>Panel de Admin</h1>
            <p>Ingresa tu contraseña</p>
          </div>

          <form onSubmit={handleAdminLogin} className="admin-auth-form">
            <div className="admin-field">
              <label>Contraseña de administrador</label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button type="submit" className="admin-auth-btn">
              Acceder al Panel
            </button>
          </form>

          <button className="admin-back" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />
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

    if (filter === 'verificados') return matchesSearch && p.verificado && !p.deshabilitado
    if (filter === 'pendientes') return matchesSearch && !p.verificado && !p.deshabilitado
    if (filter === 'deshabilitados') return matchesSearch && p.deshabilitado
    return matchesSearch
  })

  const stats = {
    total: profesores.length,
    verificados: profesores.filter(p => p.verificado && !p.deshabilitado).length,
    pendientes: profesores.filter(p => !p.verificado && !p.deshabilitado).length,
    deshabilitados: profesores.filter(p => p.deshabilitado).length
  }

  return (
    <div className="admin">
      <header className="admin-header">
        <div className="admin-header-inner">
          <div className="admin-title">
            <div className="admin-badge">
              <Shield size={26} />
            </div>
            <div>
              <h1>Panel de Administración</h1>
              <p>Gestión de Profesores</p>
            </div>
          </div>

          <div className="admin-header-actions">
            <button className="admin-header-btn" onClick={loadProfesores}>
              <RefreshCw size={18} />
              Recargar
            </button>
            <button className="admin-header-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-stats">
          <div className="admin-stat-card blue">
            <div className="admin-stat-icon">
              <Shield size={26} />
            </div>
            <div>
              <span>Total Profesores</span>
              <strong>{stats.total}</strong>
            </div>
          </div>

          <div className="admin-stat-card green">
            <div className="admin-stat-icon">
              <CheckCircle size={26} />
            </div>
            <div>
              <span>Verificados</span>
              <strong>{stats.verificados}</strong>
            </div>
          </div>

          <div className="admin-stat-card orange">
            <div className="admin-stat-icon">
              <AlertCircle size={26} />
            </div>
            <div>
              <span>Pendientes</span>
              <strong>{stats.pendientes}</strong>
            </div>
          </div>

          <div className="admin-stat-card red">
            <div className="admin-stat-icon">
              <Ban size={26} />
            </div>
            <div>
              <span>Deshabilitados</span>
              <strong>{stats.deshabilitados}</strong>
            </div>
          </div>
        </div>

        <div className="admin-filters">
          <div className="admin-search">
            <Search size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre o email..."
            />
          </div>

          <div className="admin-filter-buttons">
            <button
              className={`admin-filter-btn ${filter === 'todos' ? 'active' : ''}`}
              onClick={() => setFilter('todos')}
            >
              Todos
            </button>
            <button
              className={`admin-filter-btn ${filter === 'verificados' ? 'active' : ''}`}
              onClick={() => setFilter('verificados')}
            >
              Verificados
            </button>
            <button
              className={`admin-filter-btn ${filter === 'pendientes' ? 'active' : ''}`}
              onClick={() => setFilter('pendientes')}
            >
              Pendientes
            </button>
            <button
              className={`admin-filter-btn ${filter === 'deshabilitados' ? 'active' : ''}`}
              onClick={() => setFilter('deshabilitados')}
            >
              Deshabilitados
            </button>
          </div>
        </div>

        {loading ? (
          <div className="admin-loading">
            <div className="admin-loader" />
            <p>Cargando profesores...</p>
          </div>
        ) : (
          <div className="admin-list">
            {filteredProfesores.map((profesor) => (
              <div key={profesor.id} className={`admin-card ${profesor.deshabilitado ? 'disabled' : ''}`}>
                <div className="admin-card-left">
                  <div className="admin-card-top">
                    <h3>{profesor.nombre} {profesor.apellido}</h3>

                    {profesor.deshabilitado ? (
                      <span className="admin-pill disabled">
                        <Ban size={16} />
                        Deshabilitado
                      </span>
                    ) : profesor.verificado ? (
                      <span className="admin-pill ok">
                        <CheckCircle size={16} />
                        Verificado
                      </span>
                    ) : (
                      <span className="admin-pill pending">
                        <AlertCircle size={16} />
                        Pendiente
                      </span>
                    )}
                  </div>

                  <div className="admin-card-info">
                    <div className="admin-info-item">
                      <Mail size={18} />
                      <span>{profesor.email}</span>
                    </div>

                    <div className="admin-info-item">
                      <Calendar size={18} />
                      <span>Registrado: {new Date(profesor.created_at).toLocaleDateString('es-UY')}</span>
                    </div>

                    {profesor.fecha_verificacion && (
                      <div className="admin-info-item">
                        <CheckCircle size={18} />
                        <span>Verificado: {new Date(profesor.fecha_verificacion).toLocaleDateString('es-UY')}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-card-actions">
                  {/* ✅ NUEVO BOTÓN: Resetear contraseña */}
                  <button 
                    className="admin-action-btn password" 
                    onClick={() => resetearPassword(profesor.id, profesor.email)}
                    title="Cambiar contraseña"
                  >
                    <Key size={18} />
                    Resetear Password
                  </button>

                  {profesor.deshabilitado ? (
                    <button className="admin-action-btn success" onClick={() => deshabilitarProfesor(profesor.id, true)}>
                      <Check size={18} />
                      Habilitar
                    </button>
                  ) : (
                    <>
                      {profesor.verificado ? (
                        <button className="admin-action-btn warn" onClick={() => revocarVerificacion(profesor.id)}>
                          <XCircle size={18} />
                          Revocar
                        </button>
                      ) : (
                        <button className="admin-action-btn ok" onClick={() => verificarProfesor(profesor.id)}>
                          <CheckCircle size={18} />
                          Verificar
                        </button>
                      )}

                      <button className="admin-action-btn disable" onClick={() => deshabilitarProfesor(profesor.id, false)}>
                        <Ban size={18} />
                        Deshabilitar
                      </button>
                    </>
                  )}

                  <button className="admin-action-btn danger" onClick={() => eliminarProfesor(profesor.id)}>
                    <Trash2 size={18} />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}

            {filteredProfesores.length === 0 && (
              <div className="admin-empty">
                <AlertCircle size={52} />
                <p>No se encontraron profesores</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminPanel