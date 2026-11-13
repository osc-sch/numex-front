import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createActivity,
  abandonActivityAttempt,
  answerActivityAttempt,
  deleteActivity,
  getActivities,
  getActivity,
  getActivityAttempt,
  getActivityAttemptEvents,
  getActivityAttempts,
  getActivityStatistics,
  submitActivity,
  startActivityAttempt,
  updateActivity,
} from '../src/services/activities.js'

const courseId = 'course/1'
const sectionId = 'section 2'
const activityId = 'activity-3'
const basePath = '/api/courses/course%2F1/sections/section%202/activities'
const activity = {
  _id: activityId,
  titulo: 'Repaso',
  descripcion: 'Operaciones',
  estado: 'borrador',
  ejercicios: [],
}

test('activities are listed using authenticated, uncached requests', async context => {
  const studentActivity = {
    ...activity,
    progresoAlumno: { estado: 'completada', completada: true, numeroVersion: 1 },
  }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ actividades: [studentActivity] }))
  assert.deepEqual(await getActivities(courseId, sectionId), [studentActivity])
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, basePath)
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
})

test('a single activity is read from the section activities endpoint', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ actividad: activity }))
  assert.deepEqual(await getActivity(courseId, sectionId, activityId), activity)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `${basePath}/${activityId}`)
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
})

test('activity creation sends the supplied activity payload', async context => {
  const payload = {
    titulo: 'Repaso',
    descripcion: '',
    estado: 'publicado',
    ejercicios: [{
      tipo: 'opcion_unica',
      enunciado: '¿Cuánto es 2 + 2?',
      opciones: [{ texto: '3' }, { texto: '4' }],
      indiceCorrecta: 1,
    }],
  }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ actividad: activity }, { status: 201 }))
  assert.deepEqual(await createActivity(courseId, sectionId, payload), activity)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, basePath)
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), payload)
})

test('activity LaTeX strings survive JSON submission and retrieval unchanged', async context => {
  const formula = String.raw`$\int_0^1 x^2\,dx = \frac{1}{3}$`
  const payload = {
    titulo: 'Integrales',
    descripcion: String.raw`Calculá $$\int_0^1 x\,dx$$`,
    estado: 'publicado',
    ejercicios: [{
      tipo: 'opcion_unica',
      enunciado: String.raw`¿Cuál es el valor de $\sqrt{9}$?`,
      opciones: [
        { texto: '2', pista: String.raw`Revisá $\sqrt{x}$.`, explicacionError: '' },
        { texto: '3', pista: '', explicacionError: formula },
      ],
      indiceCorrecta: 1,
    }],
  }
  const persistedActivity = { ...activity, ...payload }
  const fetchMock = context.mock.method(globalThis, 'fetch', async (_url, options) => {
    if (options.method === 'POST') return Response.json({ actividad: persistedActivity }, { status: 201 })
    return Response.json({ actividad: persistedActivity })
  })

  const saved = await createActivity(courseId, sectionId, payload)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), payload)
  assert.equal(saved.ejercicios[0].opciones[1].explicacionError, formula)

  const loaded = await getActivity(courseId, sectionId, activityId)
  assert.equal(loaded.ejercicios[0].enunciado, payload.ejercicios[0].enunciado)
  assert.equal(loaded.descripcion, payload.descripcion)
})

test('activity updates preserve existing exercise and option IDs', async context => {
  const payload = {
    estado: 'borrador',
    ejercicios: [{
      _id: 'exercise-id',
      tipo: 'opcion_unica',
      enunciado: 'Pregunta editada',
      explicacionGeneral: 'Repasá el procedimiento.',
      opciones: [
        { _id: 'option-id', texto: 'Respuesta', pista: '', explicacionError: 'Desarrollá el paso anterior.' },
        { texto: 'Nueva opción', pista: 'Volvé a leer el enunciado.', explicacionError: '' },
      ],
      indiceCorrecta: 0,
    }],
  }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ actividad: activity }))
  assert.deepEqual(await updateActivity(courseId, sectionId, activityId, payload), activity)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `${basePath}/${activityId}`)
  assert.equal(options.method, 'PUT')
  assert.deepEqual(JSON.parse(options.body), payload)
})

test('activity deletion accepts an empty success response', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
  await deleteActivity(courseId, sectionId, activityId)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `${basePath}/${activityId}`)
  assert.equal(options.method, 'DELETE')
  assert.equal(options.credentials, 'include')
})

test('submissions send selected real IDs to the correction endpoint', async context => {
  const response = {
    totalPreguntas: 1,
    respuestasCorrectas: 1,
    respuestasIncorrectas: 0,
    porcentajeAciertos: 100,
    resultados: [{ ejercicioId: 'exercise-id', respondida: true, correcta: true }],
  }
  const respuestas = [{ ejercicioId: 'exercise-id', opcionId: 'option-id' }]
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(response))
  assert.deepEqual(await submitActivity(courseId, sectionId, activityId, respuestas), response)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `${basePath}/${activityId}/submit`)
  assert.equal(options.method, 'POST')
  assert.deepEqual(JSON.parse(options.body), { respuestas })
})

test('activity API errors are surfaced to the caller', async context => {
  context.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'No autorizado' }, { status: 403 }))
  await assert.rejects(getActivities(courseId, sectionId), { message: 'No autorizado', status: 403 })
})

test('malformed activity collections and correction results are rejected', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ data: [] }))
  await assert.rejects(getActivities(courseId, sectionId), /respuesta inválida/)
  fetchMock.mock.mockImplementation(async () => Response.json({ resultados: [] }))
  await assert.rejects(submitActivity(courseId, sectionId, activityId, []), /corrección inválida/)
})

const activeAttempt = {
  intento: {
    id: 'attempt-1',
    actividad: activityId,
    estado: 'en_progreso',
    estadisticas: {
      respuestasEnviadas: 1,
      respuestasCorrectas: 0,
      respuestasIncorrectas: 1,
      aciertosPrimerIntento: 0,
      preguntasCompletadas: 0,
    },
    preguntasPendientes: 2,
    progresoPorPregunta: [{ ejercicio: 'exercise-1', intentos: 1 }],
  },
  preguntaActual: {
    ejercicioId: 'exercise-1',
    tipo: 'opcion_unica',
    enunciado: 'Pregunta',
    opciones: [{ _id: 'option-1', texto: 'Opción' }],
  },
}

test('attempt start resumes server progress using authenticated cookies', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(activeAttempt))
  assert.deepEqual(await startActivityAttempt(activityId), activeAttempt)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/activities/${activityId}/attempts`)
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), {})
})

test('attempt progress is read by attempt ID without caching', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(activeAttempt))
  assert.deepEqual(await getActivityAttempt('attempt-1'), activeAttempt)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/attempts/attempt-1')
  assert.equal(options.method, 'GET')
  assert.equal(options.cache, 'no-store')
})

test('an individual answer carries its stable idempotency request ID', async context => {
  const response = {
    correcta: false,
    retroalimentacion: { tipo: 'pista', mensaje: 'Probá otra vez.' },
    intentosPregunta: 1,
    preguntasPendientes: 2,
    actividadCompletada: false,
    estadisticas: activeAttempt.intento.estadisticas,
    preguntaActual: activeAttempt.preguntaActual,
  }
  const answer = { requestId: 'request-id-123', ejercicioId: 'exercise-1', opcionId: 'option-1' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(response))
  assert.deepEqual(await answerActivityAttempt('attempt-1', answer), response)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/attempts/attempt-1/answers')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), answer)
})

test('attempt abandonment is an explicit authenticated POST', async context => {
  const response = { message: 'Intento abandonado correctamente', intentoId: 'attempt-1' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(response))
  assert.deepEqual(await abandonActivityAttempt('attempt-1'), response)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/attempts/attempt-1/abandon')
  assert.equal(options.method, 'POST')
  assert.deepEqual(JSON.parse(options.body), {})
})

test('activity tracking loads owner-only statistics and paginated attempts', async context => {
  const statistics = {
    alumnosUnicos: 1,
    totalIntentos: 1,
    intentosEnProgreso: 1,
    actividadesFinalizadas: 0,
    actividadesAbandonadas: 0,
    respuestasEnviadas: 2,
    respuestasCorrectas: 1,
    respuestasIncorrectas: 1,
    aciertosPrimerIntento: 0,
    porAlumno: [{
      alumnoId: 'student-1',
      intentos: 1,
      estudiante: { nombreCompleto: 'Ana Pérez', username: 'aperez' },
    }],
    porPregunta: [{
      actividadVersionId: 'version-1',
      ejercicioId: 'exercise-1',
      pregunta: '¿Cuánto es 2 + 2?',
      respuestas: 2,
      incorrectas: 1,
      alumnosUnicos: 1,
      porcentajeAciertoPrimerIntento: 0,
      promedioErroresPorAlumno: 1,
      opciones: [
        { opcionId: 'option-1', texto: '3', selecciones: 1, correcta: false },
        { opcionId: 'option-2', texto: '4', selecciones: 1, correcta: true },
      ],
    }],
  }
  const fetchMock = context.mock.method(globalThis, 'fetch', async url => {
    if (url.includes('/statistics')) return Response.json(statistics)
    return Response.json({ intentos: [{ _id: 'attempt-1' }], total: 1, limit: 50, skip: 0 })
  })
  assert.deepEqual(await getActivityStatistics(activityId), statistics)
  assert.deepEqual(await getActivityAttempts(activityId, { limit: 50, skip: 0 }), {
    intentos: [{ _id: 'attempt-1' }], total: 1, limit: 50, skip: 0,
  })
  assert.equal(fetchMock.mock.calls[0].arguments[0], `/api/activities/${activityId}/statistics`)
  assert.equal(fetchMock.mock.calls[1].arguments[0], `/api/activities/${activityId}/attempts?limit=50&skip=0`)
  assert.equal(fetchMock.mock.calls[1].arguments[1].credentials, 'include')
})

test('activity attempt events are read in a bounded chronological page', async context => {
  const events = [{ _id: 'event-1', tipo: 'inicio' }]
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ eventos: events }))
  assert.deepEqual(await getActivityAttemptEvents('attempt-1', {
    limit: 100,
    before: '2026-11-09T12:00:00.000Z',
  }), events)
  assert.equal(
    fetchMock.mock.calls[0].arguments[0],
    '/api/attempts/attempt-1/events?limit=100&before=2026-11-09T12%3A00%3A00.000Z',
  )
})
