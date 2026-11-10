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

export function toActivityDraft(generated, createId) {
  return {
    titulo: generated.titulo,
    descripcion: typeof generated.descripcion === 'string' ? generated.descripcion : '',
    ejercicios: generated.ejercicios.map(exercise => {
      const opciones = Array.isArray(exercise?.opciones) ? exercise.opciones : []
      const correctIndex = Number.isInteger(exercise?.indiceCorrecta)
        ? exercise.indiceCorrecta
        : -1
      const optionDrafts = opciones.map(option => ({
        clientId: createId(),
        texto: typeof option?.texto === 'string' ? option.texto : '',
        pista: typeof option?.pista === 'string' ? option.pista : '',
        explicacionError: typeof option?.explicacionError === 'string' ? option.explicacionError : '',
      }))
      return {
        clientId: createId(),
        tipo: 'opcion_unica',
        enunciado: typeof exercise?.enunciado === 'string' ? exercise.enunciado : '',
        explicacionGeneral: typeof exercise?.explicacionGeneral === 'string' ? exercise.explicacionGeneral : '',
        opciones: optionDrafts,
        correctOptionId: optionDrafts[correctIndex]?.clientId ?? null,
      }
    }),
  }
}
