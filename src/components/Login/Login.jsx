import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Link } from 'react-router-dom'
import { GraduationCap, Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react'
import './Login.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Credenciales inválidas. Verifica tu email y contraseña.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Tu cuenta aún no ha sido verificada por un administrador.')
      } else {
        setError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Fondo decorativo */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-blob login-blob-1"></div>
        <div className="login-blob login-blob-2"></div>
      </div>

      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-glow"></div>
          <div className="login-logo-icon">
            <GraduationCap size={48} />
          </div>
        </div>

        <div className="login-header">
          <h1>ProfesorHub</h1>
          <p>Bienvenido de vuelta</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label>Correo electrónico</label>
            <div className="login-input-wrapper">
              <Mail className="login-input-icon" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <div className="login-input-wrapper">
              <Lock className="login-input-icon" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                Iniciando sesión...
              </span>
            ) : (
              <span className="login-btn-content">
                Iniciar Sesión <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            ¿No tienes cuenta?{' '}
            <Link to="/register">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
