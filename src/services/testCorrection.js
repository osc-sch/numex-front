import { buildTestCorrectionPayload } from '../utils/activitySession.js'
import { parseCorrectionProfile } from '../utils/correctionProfile.js'

const CORRECTION_WEBHOOK_URL = import.meta.env?.DEV
  ? '/api/test-correction'
  : 'https://osc-sch.app.n8n.cloud/webhook-test/corregir_test'

export async function submitTestCorrection(session, answers) {
  const payload = buildTestCorrectionPayload(session, answers)
  const response = await fetch(CORRECTION_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const details = await response.json().catch(() => null)
    throw new Error(
      response.status === 404
        ? 'El servicio de corrección no está disponible en este momento. Tus respuestas se conservan; intentá nuevamente.'
        : 'No se pudieron enviar las respuestas. Intentá nuevamente.',
      { cause: { status: response.status, details } }
    )
  }

  // A successful acknowledgement may have no profile (for example, HTTP 204).
  const correction = await response.json().catch(() => null)
  return parseCorrectionProfile(correction, session.test_id)
}
