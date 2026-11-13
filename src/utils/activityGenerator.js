export const DEFAULT_ACTIVITY_GENERATION_PROMPT =
  'Lee todos los archivos y crea una actividad de selección única con los datos recaudados. Envíala en el formato JSON indicado.'

function isActivity(value) {
  return Boolean(
    value
    && typeof value === 'object'
    && !Array.isArray(value)
    && typeof value.titulo === 'string'
    && Array.isArray(value.ejercicios),
  )
}

function unwrapActivity(value) {
  if (isActivity(value)) return value
  if (value && typeof value === 'object' && isActivity(value.json)) return value.json
  return null
}

function parseResult(result) {
  if (typeof result !== 'string') return { value: result }
  try {
    return { value: JSON.parse(result) }
  } catch {
    return { error: 'El servicio no devolvió un resultado JSON que se pueda importar.' }
  }
}

export function getGeneratedActivities(data) {
  if (data?.error_parseo === true) {
    return { activities: [], parseError: true }
  }

  const parsed = parseResult(data?.resultado ?? data)
  if (parsed.error) return { activities: [], parseError: false, error: parsed.error }

  const value = parsed.value
  const candidates = Array.isArray(value)
    ? value
    : Array.isArray(value?.actividades)
      ? value.actividades
      : [value]
  return {
    activities: candidates.map(unwrapActivity).filter(Boolean),
    parseError: false,
  }
}

export function sanitizeTextField(value) {
  if (typeof value !== 'string') return ''

  let text = value.replace(/\r/g, '').replace(/\u00a0/g, ' ').trim()
  text = text
    .replace(/(?:clientId|optionId|exerciseId|questionId|answerId|_id)\s*[:=]\s*[A-Za-z0-9_-]+/gi, '')
    .replace(/\b(?:new|option|client|exercise|question|answer)-[A-Za-z0-9_-]+\b/gi, '')
    .replace(/\b[A-Za-z]+Id(?:[A-Za-z0-9_-]+)?\b/gi, '')
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '')
    .replace(/\b[0-9a-fA-F]{24,}\b/g, '')
    .trim()

  return text
}

export function toActivityDraft(generated, createId) {
  return {
    titulo: sanitizeTextField(generated?.titulo),
    descripcion: sanitizeTextField(generated?.descripcion),
    ejercicios: (generated?.ejercicios ?? []).map(exercise => {
      const opciones = Array.isArray(exercise?.opciones) ? exercise.opciones : []
      const correctIndex = Number.isInteger(exercise?.indiceCorrecta)
        ? exercise.indiceCorrecta
        : -1
      const optionDrafts = opciones.map(option => ({
        clientId: createId(),
        texto: sanitizeTextField(option?.texto),
        pista: sanitizeTextField(option?.pista),
        explicacionError: sanitizeTextField(option?.explicacionError),
      }))
      return {
        clientId: createId(),
        tipo: 'opcion_unica',
        enunciado: sanitizeTextField(exercise?.enunciado),
        explicacionGeneral: sanitizeTextField(exercise?.explicacionGeneral),
        opciones: optionDrafts,
        correctOptionId: optionDrafts[correctIndex]?.clientId ?? null,
      }
    }),
  }
}
