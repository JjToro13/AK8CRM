// utils.ts - Funciones utilitarias para formateo de fechas, validación de datos, generación de seriales únicos, debounce y manejo de clases CSS. Incluye funciones específicas para el CRM como formateo de duración de llamadas y estados de contacto.

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Función para combinar clases de Tailwind CSS
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para formatear fechas
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Función para formatear duración de llamadas
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Función para obtener el color de estado
export function getStatusColor(status: string): string {
  const colors = {
    gray: 'status-gray',
    red: 'status-red',
    yellow: 'status-yellow',
    green: 'status-green',
    blue: 'status-blue'
  }
  return colors[status as keyof typeof colors] || 'status-gray'
}

// Función para obtener el texto del estado
export function getStatusText(status: string): string {
  const texts = {
    gray: 'Sin contactar',
    red: 'Múltiples intentos',
    yellow: 'No desea ser contactado',
    green: 'Contacto exitoso',
    blue: 'En proceso de venta'
  }
  return texts[status as keyof typeof texts] || 'Desconocido'
}

// Función para obtener el texto del estado de llamada
export function getCallStatusText(status: string): string {
  const texts = {
    in_progress: 'En progreso',
    completed: 'Completada',
    failed: 'Fallida',
    no_answer: 'Sin respuesta'
  }
  return texts[status as keyof typeof texts] || 'Desconocido'
}

// Función para validar email
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Función para validar número de teléfono
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Función para formatear número de teléfono
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')
  }
  if (cleaned.length === 12 && cleaned.startsWith('34')) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, '+$1 $2 $3 $4')
  }
  return phone
}

// Función para formatear moneda
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount)
}

// Función para generar número de serie único
export function generateSerial(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 5)
  return `CLI${timestamp}${random}`.toUpperCase()
}

// Función para debounce
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
