// useAuth.ts - Hook personalizado para manejar autenticación con Supabase. Incluye manejo de sesión, estado de usuario, verificación de rol de admin y funciones de inicio/cierre de sesión. Optimizado para rendimiento y seguridad.

import { useState, useEffect } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  isAdmin: boolean
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isAdmin: false
  })

  useEffect(() => {
    let mounted = true

    // Función para verificar si es admin
    const checkAdminRole = async (userId: string): Promise<boolean> => {
      try {
        const { data: agent } = await supabase
          .from('agents')
          .select('role')
          .eq('id', userId)
          .single()
        
        return agent?.role === 'admin'
      } catch (error) {
        console.error('Error verificando rol de admin:', error)
        return false
      }
    }

    // Obtener sesión inicial
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error obteniendo sesión:', error)
          if (mounted) {
            setAuthState(prev => ({ ...prev, loading: false }))
          }
          return
        }

        if (mounted) {
          // Establecer estado inicial sin esperar la verificación de admin
          setAuthState({
            user: session?.user ?? null,
            session,
            loading: false,
            isAdmin: false // Temporal, se actualizará después
          })

          // Verificar rol de admin de forma asíncrona sin bloquear
          if (session?.user) {
            checkAdminRole(session.user.id).then(isAdmin => {
              if (mounted) {
                setAuthState(prev => ({ ...prev, isAdmin }))
              }
            })
          }
        }
      } catch (error) {
        console.error('Error en getInitialSession:', error)
        if (mounted) {
          setAuthState(prev => ({ ...prev, loading: false }))
        }
      }
    }

    getInitialSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        console.log('Auth state changed:', event, session?.user?.id)

        // Establecer estado inmediatamente sin esperar verificación de admin
        setAuthState({
          user: session?.user ?? null,
          session,
          loading: false,
          isAdmin: false // Temporal, se actualizará después
        })

        // Verificar rol de admin de forma asíncrona sin bloquear
        if (session?.user) {
          checkAdminRole(session.user.id).then(isAdmin => {
            if (mounted) {
              setAuthState(prev => ({ ...prev, isAdmin }))
            }
          })
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }))
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Error cerrando sesión:', error)
        setAuthState(prev => ({ ...prev, loading: false }))
        return { error }
      }

      // Limpiar estado local
      setAuthState({
        user: null,
        session: null,
        loading: false,
        isAdmin: false
      })

      return { error: null }
    } catch (error) {
      console.error('Error inesperado cerrando sesión:', error)
      setAuthState(prev => ({ ...prev, loading: false }))
      return { error }
    }
  }

  return {
    ...authState,
    signOut
  }
}