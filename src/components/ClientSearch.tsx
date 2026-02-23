import { useState } from 'react'
import { Phone, User, Hash, AlertCircle, Edit, Mail, Building, DollarSign, Calendar, Send } from 'lucide-react'
import { Client, calls, supabase } from '../lib/supabase'
import { getStatusColor, getStatusText, formatCurrency, formatDate } from '../lib/utils'
import LoadingSpinner from './LoadingSpinner'
import ClientCommentsDropdown from './ClientCommentsDropdown'
import { useAuth } from '../hooks/useAuth'
import EmailModal from './EmailModal'

interface ClientSearchProps {
  client: Client
  onCallStarted: () => void
  onEditClient?: (client: Client) => void
}

export default function ClientSearch({ client, onCallStarted, onEditClient }: ClientSearchProps) {
  const { isAdmin } = useAuth()
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)

  const handleCall = async () => {
    setCalling(true)
    setError('')

    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        setError('No se pudo obtener la información del agente')
        return
      }

      const { data, error } = await calls.start(client.id, userData.user.id)
      
      if (error) {
        setError(error.message || 'Error al iniciar la llamada')
      } else {
        onCallStarted()
        // Aquí podrías mostrar una notificación de éxito
        console.log('Llamada iniciada:', data)
      }
    } catch (err) {
      setError('Error inesperado al iniciar la llamada')
      console.error('Error iniciando llamada:', err)
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
      {/* Header con nombre y acciones */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <User className="h-5 w-5 text-gray-400" />
          <div>
            <h3 className="font-medium text-gray-900">{client.name}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                {client.serial}
              </div>
              <div className="flex items-center">
                <div className={`status-indicator ${getStatusColor(client.status_color)}`} />
                {getStatusText(client.status_color)}
              </div>
              <span>Intentos: {client.attempts}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onEditClient && (
            <button
              onClick={() => onEditClient(client)}
              className="text-blue-600 hover:text-blue-900 p-2"
              title="Editar cliente"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {client.email && (
            <button
              onClick={() => setShowEmailModal(true)}
              className="text-green-600 hover:text-green-900 p-2"
              title="Enviar email"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleCall}
            disabled={calling}
            className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {calling ? (
              <LoadingSpinner size="sm" text="" fullScreen={false} />
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Llamar
              </>
            )}
          </button>
        </div>
      </div>

      {/* Información detallada del cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
        {isAdmin && client.phone_number && (
          <div className="flex items-center text-gray-600">
            <Phone className="h-4 w-4 text-gray-400 mr-2" />
            <span className="font-medium">{client.phone_number}</span>
          </div>
        )}
        
        {isAdmin && client.email && (
          <div className="flex items-center text-gray-600">
            <Mail className="h-4 w-4 text-gray-400 mr-2" />
            <span>{client.email}</span>
          </div>
        )}
        
        {client.trading_company && (
          <div className="flex items-center text-gray-600">
            <Building className="h-4 w-4 text-gray-400 mr-2" />
            <span>{client.trading_company}</span>
          </div>
        )}
        
        {client.deposit_amount && (
          <div className="flex items-center text-gray-600">
            <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
            <span>{formatCurrency(client.deposit_amount)}</span>
          </div>
        )}
        
        {client.investment_date && (
          <div className="flex items-center text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span>{formatDate(client.investment_date)}</span>
          </div>
        )}
        
        <div className="flex items-center text-gray-600">
          <Calendar className="h-4 w-4 text-gray-400 mr-2" />
          <span>Creado: {formatDate(client.created_at)}</span>
        </div>
      </div>

      {/* Comentarios con dropdown */}
      <ClientCommentsDropdown clientId={client.id} />

      {/* Error de llamada */}
      {error && (
        <div className="mt-3 flex items-center text-red-600 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </div>
      )}

      {/* Modal de email */}
      <EmailModal
        client={client}
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
      />
    </div>
  )
}
