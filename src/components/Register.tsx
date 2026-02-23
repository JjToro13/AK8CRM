import { useState } from 'react'
import { Eye, EyeOff, UserPlus, Shield, User, Key } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'

interface RegisterProps {
  onBackToLogin: () => void
}

export default function Register({ onBackToLogin }: RegisterProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'agent' as 'admin' | 'agent',
    adminPassword: '',
    invitationCode: '' // Nuevo campo para código de invitación
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Contraseña de admin para crear cuentas de administrador
  const ADMIN_CREATION_PASSWORD = import.meta.env.VITE_ADMIN_CREATION_PASSWORD || 'ADMIN_MASCARA_2024'

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    // Validar código de invitación (obligatorio para todos)
    if (!formData.invitationCode.trim()) {
      setError('El código de invitación es requerido')
      return false
    }

    if (!formData.name.trim()) {
      setError('El nombre es requerido')
      return false
    }

    if (!formData.email.trim()) {
      setError('El email es requerido')
      return false
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('El email no es válido')
      return false
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      return false
    }

    if (formData.role === 'admin' && formData.adminPassword !== ADMIN_CREATION_PASSWORD) {
      setError('La contraseña de administrador es incorrecta')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // PASO 1: Validar el código de invitación
      const { data: validationData, error: validationError } = await supabase.rpc('validate_invitation_code', {
        p_code: formData.invitationCode.trim()
      })

      if (validationError) {
        console.error('Error al validar código:', validationError)
        setError('Error al validar el código de invitación')
        setLoading(false)
        return
      }

      // Verificar si el código es válido
      if (!validationData?.valid) {
        setError(validationData?.message || 'Código de invitación inválido')
        setLoading(false)
        return
      }

      // PASO 2: Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: formData.role
          }
        }
      })

      if (authError) {
        console.error('Error de autenticación:', authError)
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Error al crear el usuario')
        return
      }

      // Crear registro en la tabla agents usando Edge Function
      const { data: registerData, error: registerError } = await supabase.functions.invoke('register-user', {
        body: {
          user_id: authData.user.id,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          invitation_code: formData.invitationCode // ✅ Enviar código de invitación para validación
        }
      })

      if (registerError) {
        console.error('Error registrando usuario:', registerError)
        setError(`Error al crear el perfil de agente: ${registerError.message}`)
        return
      }

      if (!registerData?.success) {
        setError('Error al crear el perfil de agente')
        return
      }

      // Si es admin, mostrar mensaje de éxito
      if (formData.role === 'admin') {
        alert('¡Cuenta de administrador creada exitosamente! Ya puedes iniciar sesión.')
      } else {
        alert('¡Cuenta de agente creada exitosamente! Ya puedes iniciar sesión.')
      }

      // Volver al login
      onBackToLogin()

    } catch (error) {
      console.error('Error en registro:', error)
      setError('Error inesperado. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Regístrate como agente o administrador
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Código de Invitación - PRIMER CAMPO */}
            <div>
              <label htmlFor="invitationCode" className="block text-sm font-medium text-gray-700">
                <Key className="inline h-4 w-4 mr-1 text-blue-600" />
                Código de Invitación
              </label>
              <input
                id="invitationCode"
                name="invitationCode"
                type="text"
                required
                value={formData.invitationCode}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Ingresa tu código de invitación"
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-gray-500">
                Solicita el código de invitación al administrador del sistema
              </p>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="Tu nombre completo"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="mt-1 input-field"
                placeholder="tu@email.com"
              />
            </div>

            {/* Rol */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Tipo de Cuenta
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                className="mt-1 input-field"
              >
                <option value="agent">Agente</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Contraseña de Admin (solo si es admin) */}
            {formData.role === 'admin' && (
              <div>
                <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
                  <Shield className="inline h-4 w-4 mr-1" />
                  Contraseña de Administrador
                </label>
                <div className="mt-1 relative">
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={formData.adminPassword}
                    onChange={handleInputChange}
                    className="input-field pr-10"
                    placeholder="Contraseña de administrador"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                  >
                    {showAdminPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Contacta al administrador del sistema para obtener esta contraseña
                </p>
              </div>
            )}

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="" fullScreen={false} />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Crear Cuenta
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onBackToLogin}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <User className="w-4 h-4 mr-2" />
              Volver al Login
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
