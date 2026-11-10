import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { useAuth } from '../auth/authContext'

import DashboardLayout from '../components/DashboardLayout'
import HomeCarousel from '../components/HomeCarousel'
import TestResults from '../components/TestResults'
import { parseActivitySession } from '../utils/activitySession'

const DIAGNOSTIC_WEBHOOK_URL = import.meta.env.DEV
  ? '/api/diagnostic'
  : 'https://osc-sch.app.n8n.cloud/webhook-test/crear_actividades'

function HomePage({ latestTestResult = null, resultSaved = true }) {
  const { user, profile } = useAuth()
  const diagnosticPending = user.id_rol === 3 && profile.test_diagnostic_completed === false
  const [isStartingDiagnostic, setIsStartingDiagnostic] = useState(false)
  const [diagnosticError, setDiagnosticError] = useState('')

  const navigate = useNavigate()

  const handleGoToDiagnostic = async () => {
    if (isStartingDiagnostic) {
      return
    }

    setIsStartingDiagnostic(true)
    setDiagnosticError('')

    try {
      const response = await fetch(
        DIAGNOSTIC_WEBHOOK_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: profile.nombre,
            anio_curso: profile.anio_cursada,
            habilidades: [],
            dificultades: [],
          }),
        }
      )

      if (!response.ok) {
        const details = await response.json().catch(() => null)
        console.error('El webhook de diagnóstico rechazó la solicitud:', {
          status: response.status,
          details,
        })

        throw new Error(
          response.status === 404
            ? 'El servicio de diagnóstico no está disponible en este momento. Intentá nuevamente en unos minutos.'
            : 'No se pudo iniciar el test de diagnóstico. Intentá nuevamente.'
        )
      }

      const payload = await response.json().catch(() => {
        throw new Error(
          'El servicio no devolvió una respuesta válida con las actividades. Intentá nuevamente.'
        )
      })
      const sessionData = parseActivitySession(payload)

      navigate('/diagnostic', { state: { sessionData } })
    } catch (error) {
      console.error('No se pudo iniciar el diagnóstico:', error)
      setDiagnosticError(
        error instanceof TypeError
          ? 'No se pudo conectar con el servicio de diagnóstico. Revisá tu conexión e intentá nuevamente.'
          : error.message || 'No se pudo iniciar el test de diagnóstico. Intentá nuevamente.'
      )
    } finally {
      setIsStartingDiagnostic(false)
    }
  }

  return (
    <>
      <DashboardLayout eyebrow="Inicio">
        <HomeCarousel displayName={profile.nombre || user.user_name} />

        {diagnosticPending && (
          <div className="d-flex flex-column align-items-start gap-2 mb-4">
            <Button
              variant="outline-primary"
              onClick={handleGoToDiagnostic}
              disabled={isStartingDiagnostic}
              aria-busy={isStartingDiagnostic}
            >
              {isStartingDiagnostic ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" aria-hidden="true" />
                  Iniciando diagnóstico...
                </>
              ) : (
                'Iniciar test de diagnóstico'
              )}
            </Button>
            {diagnosticError && (
              <Alert variant="danger" className="mb-0" role="alert">
                {diagnosticError}
              </Alert>
            )}
          </div>
        )}

        {latestTestResult && !resultSaved && (
          <Alert variant="warning">
            Podés ver tus resultados durante esta sesión, pero no se pudieron guardar
            en este navegador. Se perderán al recargar o cerrar la página.
          </Alert>
        )}
        <TestResults result={latestTestResult} />
      </DashboardLayout>
    </>
  )
}

export default HomePage
