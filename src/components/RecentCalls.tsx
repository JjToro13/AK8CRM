import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Call } from '../lib/supabase'
import { formatDate, formatDuration, getCallStatusText } from '../lib/utils'

interface RecentCallsProps {
  calls: Call[]
}

export default function RecentCalls({ calls }: RecentCallsProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'no_answer':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  if (calls.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        No hay llamadas recientes
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              {getStatusIcon(call.status)}
              <div>
                <h3 className="font-medium text-gray-900">
                  {call.client?.first_name || 'Cliente desconocido'}
                </h3>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Serie: {call.client?.serial}</span>
                  <span>Agente: {call.agent?.name || 'Desconocido'}</span>
                  <span>{formatDate(call.start_time)}</span>
                  {call.duration && (
                    <span>Duración: {formatDuration(call.duration)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">
              {getCallStatusText(call.status)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
