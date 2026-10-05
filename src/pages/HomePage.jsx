import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'
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
  const diagnosticPending = profile.test_diagnostic_completed === false
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

        {latestTestResult && !resultSaved && (
          <Alert variant="warning">
            Podés ver tus resultados durante esta sesión, pero no se pudieron guardar
            en este navegador. Se perderán al recargar o cerrar la página.
          </Alert>
        )}
        <TestResults result={latestTestResult} />
      </DashboardLayout>

      <Modal
        className="dashboard-modal diagnostic-modal"
        show={diagnosticPending}
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header>
          <span className="modal-topic-icon"><i className="bi bi-clipboard2-pulse" aria-hidden="true" /></span>
          <Modal.Title>
            Antes de comenzar
          </Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <p>
            Para comenzar a usar Numex necesitamos conocer un poco
            mejor tus conocimientos actuales de matemática.
          </p>

          <p>
            Por eso vas a realizar un breve <strong>test de diagnóstico</strong>.
            No es un examen y no afecta tus calificaciones.
          </p>

          <p>
            Tus respuestas nos permitirán identificar los temas que ya
            dominas y aquellos que todavía necesitan un poco más de práctica.
          </p>

          <p className="mb-0">
            Con esta información, Numex podrá preparar actividades
            adaptadas especialmente a tus necesidades.
          </p>

          {diagnosticError && (
            <Alert variant="danger" className="mt-3 mb-0">
              {diagnosticError}
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="primary"
            onClick={handleGoToDiagnostic}
            disabled={isStartingDiagnostic}
            aria-busy={isStartingDiagnostic}
          >
            {isStartingDiagnostic ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  className="me-2"
                  aria-hidden="true"
                />
                Iniciando diagnóstico...
              </>
            ) : (
              'Ir al test de diagnóstico'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default HomePage
