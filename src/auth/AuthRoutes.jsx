import { Alert, Button, Spinner } from 'react-bootstrap'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './authContext'
import { getLoginDestination } from './loginDestination'

function SessionStatus() {
  const { status, error, refreshSession } = useAuth()
  return (
    <main className="min-vh-100 d-flex flex-column justify-content-center align-items-center p-4" aria-live="polite">
      {status === 'error' ? <>
        <Alert variant="danger">{error}</Alert>
        <Button onClick={() => refreshSession()}>Reintentar conexión</Button>
      </> : <><Spinner animation="border" aria-hidden="true" /><p className="mt-3">Verificando tu sesión…</p></>}
    </main>
  )
}

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading' || status === 'error') return <SessionStatus />
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />
  }
  return <Outlet />
}

export function PublicAuth() {
  const { status } = useAuth()
  const location = useLocation()
  if (status === 'loading') return <SessionStatus />
  if (status === 'authenticated') return <Navigate to={getLoginDestination(location.state?.from)} replace />
  return <Outlet />
}
