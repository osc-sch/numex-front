export class ActivityError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ActivityError'
    this.status = status
  }
}

async function requestActivity(path, { method = 'GET', body, signal } = {}) {
  let response
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      cache: 'no-store',
      ...(body ? {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      } : {}),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ActivityError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = data.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new ActivityError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data.message || `La API respondió con HTTP ${response.status}. Intentá nuevamente.`,
      response.status,
    )
  }
  return data
}

const activitiesPath = (courseId, sectionId) =>
  `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities`

export async function getActivities(courseId, sectionId, { signal } = {}) {
  const data = await requestActivity(activitiesPath(courseId, sectionId), { signal })
  if (Array.isArray(data)) return data
  if (Array.isArray(data.actividades)) return data.actividades
  throw new ActivityError('El servidor devolvió una respuesta inválida.')
}

export async function getActivity(courseId, sectionId, activityId, { signal } = {}) {
  const data = await requestActivity(
    `${activitiesPath(courseId, sectionId)}/${encodeURIComponent(activityId)}`,
    { signal },
  )
  if (!data.actividad || !data.actividad._id) throw new ActivityError('El servidor devolvió una respuesta inválida.')
  return data.actividad
}

export async function createActivity(courseId, sectionId, activity) {
  const data = await requestActivity(activitiesPath(courseId, sectionId), {
    method: 'POST',
    body: activity,
  })
  if (!data.actividad || !data.actividad._id) throw new ActivityError('El servidor devolvió una respuesta inválida.')
  return data.actividad
}

export async function updateActivity(courseId, sectionId, activityId, changes) {
  const data = await requestActivity(
    `${activitiesPath(courseId, sectionId)}/${encodeURIComponent(activityId)}`,
    { method: 'PUT', body: changes },
  )
  if (!data.actividad || !data.actividad._id) throw new ActivityError('El servidor devolvió una respuesta inválida.')
  return data.actividad
}

export async function deleteActivity(courseId, sectionId, activityId) {
  await requestActivity(
    `${activitiesPath(courseId, sectionId)}/${encodeURIComponent(activityId)}`,
    { method: 'DELETE' },
  )
}

export async function submitActivity(courseId, sectionId, activityId, respuestas) {
  const data = await requestActivity(
    `${activitiesPath(courseId, sectionId)}/${encodeURIComponent(activityId)}/submit`,
    { method: 'POST', body: { respuestas } },
  )
  if (
    !Number.isFinite(data.totalPreguntas)
    || !Number.isFinite(data.respuestasCorrectas)
    || !Number.isFinite(data.respuestasIncorrectas)
    || !Number.isFinite(data.porcentajeAciertos)
    || !Array.isArray(data.resultados)
  ) {
    throw new ActivityError('El servidor devolvió una respuesta de corrección inválida.')
  }
  return data
}

const requestAttempt = (path, { method = 'GET', body, signal } = {}) =>
  requestActivity(path, { method, body, signal })

const isQuestion = question =>
  question === null
  || Boolean(
    question?.ejercicioId
    && typeof question.enunciado === 'string'
    && Array.isArray(question.opciones)
    && question.opciones.every(option => option?._id && typeof option.texto === 'string'),
  )

const isAttempt = attempt =>
  Boolean(
    attempt?.id
    && ['en_progreso', 'completado', 'abandonado'].includes(attempt.estado)
    && Array.isArray(attempt.progresoPorPregunta)
    && attempt.estadisticas
    && Number.isFinite(attempt.estadisticas.preguntasCompletadas)
    && Number.isFinite(attempt.estadisticas.respuestasEnviadas)
    && Number.isFinite(attempt.estadisticas.respuestasCorrectas)
    && Number.isFinite(attempt.estadisticas.respuestasIncorrectas)
    && Number.isFinite(attempt.estadisticas.aciertosPrimerIntento),
  )

const isAnswerStats = statistics =>
  Boolean(
    statistics
    && Number.isFinite(statistics.preguntasCompletadas)
    && Number.isFinite(statistics.respuestasEnviadas)
    && Number.isFinite(statistics.respuestasCorrectas)
    && Number.isFinite(statistics.respuestasIncorrectas)
    && Number.isFinite(statistics.aciertosPrimerIntento),
  )

export async function startActivityAttempt(activityId) {
  const data = await requestAttempt(`/api/activities/${encodeURIComponent(activityId)}/attempts`, {
    method: 'POST',
    body: {},
  })
  if (!isAttempt(data.intento) || !isQuestion(data.preguntaActual)) {
    throw new ActivityError('El servidor devolvió un intento inválido.')
  }
  return data
}

export async function getActivityAttempt(attemptId, { signal } = {}) {
  const data = await requestAttempt(`/api/attempts/${encodeURIComponent(attemptId)}`, { signal })
  if (!isAttempt(data.intento) || !isQuestion(data.preguntaActual)) {
    throw new ActivityError('El servidor devolvió un intento inválido.')
  }
  return data
}

export async function answerActivityAttempt(attemptId, { requestId, ejercicioId, opcionId }) {
  const data = await requestAttempt(`/api/attempts/${encodeURIComponent(attemptId)}/answers`, {
    method: 'POST',
    body: { requestId, ejercicioId, opcionId },
  })
  if (
    typeof data.correcta !== 'boolean'
    || !['acierto', 'pista', 'explicacion'].includes(data.retroalimentacion?.tipo)
    || typeof data.retroalimentacion.mensaje !== 'string'
    || !Number.isFinite(data.preguntasPendientes)
    || !isAnswerStats(data.estadisticas)
    || typeof data.actividadCompletada !== 'boolean'
    || !isQuestion(data.preguntaActual)
  ) {
    throw new ActivityError('El servidor devolvió una corrección inválida.')
  }
  return data
}

export async function abandonActivityAttempt(attemptId) {
  const data = await requestAttempt(
    `/api/attempts/${encodeURIComponent(attemptId)}/abandon`,
    { method: 'POST', body: {} },
  )
  if (!data.message) throw new ActivityError('El servidor devolvió una respuesta de abandono inválida.')
  return data
}

export async function getActivityStatistics(activityId, { signal } = {}) {
  const data = await requestAttempt(
    `/api/activities/${encodeURIComponent(activityId)}/statistics`,
    { signal },
  )
  if (!Array.isArray(data.porAlumno) || !Array.isArray(data.porPregunta)) {
    throw new ActivityError('El servidor devolvió estadísticas inválidas.')
  }
  return data
}

export async function getActivityAttempts(activityId, { limit = 50, skip = 0, signal } = {}) {
  const query = new URLSearchParams({ limit: String(limit), skip: String(skip) })
  const data = await requestAttempt(
    `/api/activities/${encodeURIComponent(activityId)}/attempts?${query}`,
    { signal },
  )
  if (!Array.isArray(data.intentos) || !Number.isFinite(data.total)) {
    throw new ActivityError('El servidor devolvió un historial de intentos inválido.')
  }
  return data
}

export async function getActivityAttemptEvents(attemptId, { limit = 100, before, signal } = {}) {
  const query = new URLSearchParams({ limit: String(limit) })
  if (before) query.set('before', before)
  const data = await requestAttempt(
    `/api/attempts/${encodeURIComponent(attemptId)}/events?${query}`,
    { signal },
  )
  if (!Array.isArray(data.eventos)) {
    throw new ActivityError('El servidor devolvió un historial de interacciones inválido.')
  }
  return data.eventos
}
