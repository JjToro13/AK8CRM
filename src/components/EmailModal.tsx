import { useState, useEffect } from 'react'
import { X, Send, Mail, AlertCircle, CheckCircle } from 'lucide-react'
import { Client, emails, supabase } from '../lib/supabase'
import LoadingSpinner from './LoadingSpinner'
import { useAuth } from '../hooks/useAuth'

interface EmailModalProps {
  client: Client
  isOpen: boolean
  onClose: () => void
}

interface EmailAccount {
  id: number
  name: string
  from_email: string
}

export default function EmailModal({ client, isOpen, onClose }: EmailModalProps) {
  const { isAdmin, user } = useAuth()
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  // Estados para multi-cuenta de email
  const [emailAccounts, setEmailAccounts] = useState<EmailAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // Cargar cuentas de email disponibles y preferencia del usuario
  useEffect(() => {
    if (isOpen && user) {
      loadEmailAccounts()
    }
  }, [isOpen, user])

  const loadEmailAccounts = async () => {
    try {
      setLoadingAccounts(true)
      
      // Obtener cuentas de email disponibles
      const { data: functionsData, error: functionsError } = await supabase.functions.invoke('get-email-accounts')
      
      if (functionsError) {
        console.error('Error obteniendo cuentas de email:', functionsError)
        setError('No se pudieron cargar las cuentas de email')
        setLoadingAccounts(false)
        return
      }

      if (!functionsData?.success || !functionsData?.accounts || functionsData.accounts.length === 0) {
        console.error('No hay cuentas de email configuradas')
        setError('No hay cuentas de email configuradas en el sistema')
        setLoadingAccounts(false)
        return
      }

      setEmailAccounts(functionsData.accounts)

      // Obtener preferencia del usuario
      const { data: agentData, error: agentError } = await supabase
        .from('agents')
        .select('preferred_email_account_id')
        .eq('id', user?.id)
        .single()

      if (!agentError && agentData) {
        // Si tiene preferencia guardada y esa cuenta existe, usarla
        const preferredId = agentData.preferred_email_account_id
        if (preferredId && functionsData.accounts.some((acc: EmailAccount) => acc.id === preferredId)) {
          setSelectedAccountId(preferredId)
        } else {
          // Si no tiene preferencia o la cuenta no existe, usar la primera
          setSelectedAccountId(functionsData.accounts[0].id)
        }
      } else {
        // Si hay error o no se encontró el agente, usar la primera cuenta
        setSelectedAccountId(functionsData.accounts[0].id)
      }

    } catch (error) {
      console.error('Error en loadEmailAccounts:', error)
      setError('Error al cargar las cuentas de email')
    } finally {
      setLoadingAccounts(false)
    }
  }

  const handleAccountChange = async (accountId: number) => {
    setSelectedAccountId(accountId)

    // Guardar preferencia del usuario
    if (user) {
      try {
        const { error } = await supabase
          .from('agents')
          .update({ preferred_email_account_id: accountId })
          .eq('id', user.id)

        if (error) {
          console.error('Error guardando preferencia de email:', error)
        } else {
          console.log('Preferencia de email guardada:', accountId)
        }
      } catch (error) {
        console.error('Error al guardar preferencia:', error)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!subject.trim() || !message.trim()) {
      setError('El asunto y el mensaje son requeridos')
      return
    }

    if (!selectedAccountId) {
      setError('Por favor selecciona una cuenta de email')
      return
    }

    setLoading(true)

    try {
      const { error } = await emails.sendWithAccount(
        client.id,
        subject.trim(),
        message.trim(),
        user?.id,
        selectedAccountId
      )

      if (error) {
        throw new Error(error.message || 'Error enviando email')
      }

      setSuccess(true)
      setSubject('')
      setMessage('')
      
      // Cerrar modal después de 2 segundos
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)

    } catch (error) {
      console.error('Error enviando email:', error)
      setError(error instanceof Error ? error.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  const selectedAccount = emailAccounts.find(acc => acc.id === selectedAccountId)

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Enviar Email
              </h2>
              <p className="text-sm text-gray-600">
                a {client.first_name || client.name || 'Cliente'} ({client.serial})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Información del cliente */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Información del Cliente
            </h3>
            <div className="text-sm text-blue-700">
              <p><strong>Nombre:</strong> {client.first_name || client.name || 'No disponible'}</p>
              <p><strong>Serie:</strong> {client.serial}</p>
              {isAdmin && (
                <p><strong>Email:</strong> {client.email || 'No disponible'}</p>
              )}
              {!isAdmin && (
                <p><strong>Email:</strong> {client.email ? '***@***.***' : 'No disponible'}</p>
              )}
            </div>
          </div>

          {/* Selector de cuenta de email */}
          {loadingAccounts ? (
            <div className="flex items-center justify-center p-4">
              <LoadingSpinner size="sm" text="Cargando cuentas de email..." fullScreen={false} />
            </div>
          ) : emailAccounts.length > 0 ? (
            <div>
              <label htmlFor="email-account" className="block text-sm font-medium text-gray-700 mb-2">
                Enviar desde *
              </label>
              <select
                id="email-account"
                value={selectedAccountId || ''}
                onChange={(e) => handleAccountChange(Number(e.target.value))}
                className="input-field"
                required
              >
                {emailAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.from_email})
                  </option>
                ))}
              </select>
              {selectedAccount && (
                <p className="text-xs text-gray-500 mt-1">
                  Los emails se enviarán desde: {selectedAccount.from_email}
                </p>
              )}
            </div>
          ) : null}

          {/* Formulario de email */}
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Asunto *
              </label>
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ej: Seguimiento de inversión"
                className="input-field"
                required
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                {subject.length}/100 caracteres
              </p>
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                Mensaje *
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
                className="input-field min-h-[200px] resize-y"
                required
                maxLength={5000}
              />
              <p className="text-xs text-gray-500 mt-1">
                {message.length}/5000 caracteres
              </p>
            </div>
          </div>

          {/* Instrucciones */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-yellow-800 mb-2">
              Instrucciones
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• El email se enviará desde la cuenta seleccionada arriba</li>
              <li>• El cliente recibirá el mensaje en su email registrado</li>
              <li>• Tu selección de cuenta se guardará para futuros envíos</li>
              <li>• El cliente podrá responder directamente a este email</li>
            </ul>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-600 text-sm">
                  Email enviado correctamente. El modal se cerrará automáticamente.
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !subject.trim() || !message.trim() || !selectedAccountId || loadingAccounts}
              className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <LoadingSpinner size="sm" text="Enviando..." fullScreen={false} />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Email
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
