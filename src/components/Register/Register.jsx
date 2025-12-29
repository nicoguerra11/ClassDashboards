import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { Link } from 'react-router-dom'
import { GraduationCap, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react'
import './Register.css'

function Register() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const nombre = formData.nombre.trim()
    const apellido = formData.apellido.trim()
    const email = formData.email.trim().toLowerCase()
    const password = formData.password
    const confirmPassword = formData.confirmPassword

    if (!nombre || !apellido || !email || !password || !confirmPassword) {
      setError('Completá todos los campos')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      // 1. Crear usuario en auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nombre, apellido }
        }
      })

      if (authError) throw authError
      if (!authData?.user) throw new Error('No se pudo crear el usuario')

      // 2. Crear registro en tabla profesores inmediatamente
      const { error: insertError } = await supabase
        .from('profesores')
        .insert({
          id: authData.user.id, // Mismo ID que auth.users
          nombre,
          apellido,
          email,
          verificado: false,
          deshabilitado: false,
          created_at: new Date().toISOString()
        })

      if (insertError) {
        console.error('Error al insertar profesor:', insertError)
        // No lanzamos error aquí porque el usuario ya fue creado en auth
        // Pero lo mostramos al admin en consola para debugging
      }

      // 3. Cerrar sesión y mostrar mensaje de éxito
      await supabase.auth.signOut()
      setSuccess(true)
    } catch (err) {
      setError(err?.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="register-container">
        <div className="register-background">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
        </div>

        <div className="register-card">
          <div className="success-icon">
            <CheckCircle size={80} />
          </div>

          <h2>¡Registro exitoso!</h2>

          <div className="warning-box">
            <p className="warning-title">⚠️ Cuenta pendiente de verificación</p>
            <p className="warning-text">
              Tu cuenta necesita ser verificada por un administrador. Te notificaremos cuando esté lista.
            </p>
          </div>

          <Link to="/login" className="btn-primary">
            Ir a Iniciar Sesión
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="register-container">
      <div className="register-background">
        <div className="bubble bubble-1"></div>
        <div className="bubble bubble-2"></div>
      </div>

      <div className="register-card">
        <div className="register-logo">
          <div className="logo-glow"></div>
          <div className="logo-icon">
            <GraduationCap size={48} />
          </div>
        </div>

        <div className="register-header">
          <h1>Crear Cuenta</h1>
          <p>Únete a AulaGest</p>
        </div>

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="register-form">
          <div className="form-row">
            <div className="form-group">
              <label>Nombre</label>
              <div className="input-wrapper">
                <User className="input-icon" size={20} />
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  placeholder="Juan"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Apellido</label>
              <input
                type="text"
                name="apellido"
                value={formData.apellido}
                onChange={handleChange}
                placeholder="Pérez"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Correo electrónico</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={20} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <div className="register-footer">
          <p>
            ¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Register