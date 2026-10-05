import { useCallback, useEffect, useRef, useState } from 'react'
import { AuthContext } from './authContext'
import * as api from '../services/auth'

export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', session: null, error: '' })
  const revision = useRef(0)
  const changingSession = useRef(false)

  const refreshSession = useCallback((signal) => {
    if (changingSession.current || signal?.aborted) return Promise.resolve()
    const current = ++revision.current
    return api.getSession({ signal }).then((session) => {
      if (current === revision.current && !signal?.aborted) {
        setState({ status: session ? 'authenticated' : 'anonymous', session, error: '' })
      }
    }).catch((error) => {
      if (error.name !== 'AbortError' && current === revision.current && !signal?.aborted) {
        setState({ status: 'error', session: null, error: error.message })
      }
    })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    refreshSession(controller.signal)
    const refresh = () => {
      if (document.visibilityState === 'visible') refreshSession(controller.signal)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    const timer = window.setInterval(refresh, 60000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [refreshSession])

  const login = async (credentials) => {
    if (changingSession.current) throw new Error('Esperá a que termine la solicitud actual.')
    changingSession.current = true
    const current = ++revision.current
    try {
      await api.login(credentials)
      const session = await api.getSession()
      if (!session) throw new Error('No se pudo mantener la sesión. Revisá que las cookies estén habilitadas.')
      if (current === revision.current) setState({ status: 'authenticated', session, error: '' })
    } finally {
      changingSession.current = false
    }
  }

  const logout = async () => {
    if (changingSession.current) throw new Error('Esperá a que termine la solicitud actual.')
    changingSession.current = true
    const current = ++revision.current
    try {
      await api.logout()
      if (current === revision.current) setState({ status: 'anonymous', session: null, error: '' })
    } finally {
      changingSession.current = false
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, user: state.session?.user, profile: state.session?.profile, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  )
}
