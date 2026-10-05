import { useRef, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/authContext'

function LoginForm() {
  const { login } = useAuth()
  const { state } = useLocation()
  const submitting = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    setError('')

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity()
      return
    }

    const values = new FormData(event.currentTarget)
    const email = values.get('email').trim().toLowerCase()
    const password = values.get('password')

    submitting.current = true
    setIsSubmitting(true)
    try {
      await login({ email, password })
    } catch (error) {
      setError(error.status === 401
        ? 'El email o la contraseña son incorrectos.'
        : error.message || 'No se pudo iniciar sesión. Intentá nuevamente.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <Form className="auth-form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
      {state?.registrationSuccess && (
        <Alert variant="success" role="status">Tu cuenta de alumno se creó correctamente.</Alert>
      )}
      <div className="form-header">
        <span className="brand-mark">NUMEX</span>
        <span className="mini-tag">Iniciá sesión</span>
      </div>

      <div className="form-title-block mb-3">
        <h3>Ingresá a tu cuenta</h3>
        <p>Continuá con tus ejercicios, seguimientos y desafíos de matemáticas.</p>
      </div>

      {error && <Alert variant="danger" role="alert">{error}</Alert>}

      <Form.Group className="mb-3" controlId="loginEmail">
        <Form.Label>Email</Form.Label>
        <Form.Control name="email" type="email" autoComplete="username" maxLength={254}
          defaultValue={state?.email || ''} placeholder="tuemail@ejemplo.com" disabled={isSubmitting} required />
      </Form.Group>

      <Form.Group className="mb-3" controlId="loginPassword">
        <Form.Label>Contraseña</Form.Label>
        <Form.Control name="password" type="password" autoComplete="current-password" maxLength={72}
          placeholder="••••••••" disabled={isSubmitting} required />
      </Form.Group>

      <Button type="submit" className="w-100 create-account-btn" disabled={isSubmitting}>
        {isSubmitting
          ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Ingresando…</>
          : 'Iniciar sesión'}
      </Button>

      <div className="text-center mt-4 mb-0 text-muted small fw-semibold">
        ¿No tenés cuenta?{' '}
        <Link to="/register" className="step-link" style={{ float: 'none', marginTop: 0 }}>
          Crear cuenta
        </Link>
      </div>
    </Form>
  )
}

export default LoginForm
