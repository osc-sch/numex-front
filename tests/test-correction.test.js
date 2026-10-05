import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  buildTestCorrectionPayload,
  parseActivitySession,
} from '../src/utils/activitySession.js'
import { submitTestCorrection } from '../src/services/testCorrection.js'

const session = parseActivitySession({
  test_id: 'TEST_MAT_001',
  alumno: { nombre: 'Juan Pérez', anio_ingreso: 2024 },
  preguntas: [
    {
      pregunta_id: 'P001',
      habilidad_id: 'MAT_1A_C1_H01',
      enunciado: 'Primera pregunta',
      opciones: { A: 'Opción A', B: 'Opción B', C: 'Opción C' },
      respuesta_correcta: 'B',
    },
    {
      pregunta_id: 'P002',
      habilidad_id: 'MAT_1A_C1_H02',
      enunciado: 'Segunda pregunta',
      opciones: { A: 'Opción A', B: 'Opción B', C: 'Opción C' },
      respuesta_correcta: 'A',
    },
  ],
})
const answers = { P002: 'C', P001: 'B' }
const expectedPayload = {
  alumno: { nombre: 'Juan Pérez', anio_ingreso: 2024 },
  cantidad_practica_diaria: 5,
  test: {
    test_id: 'TEST_MAT_001',
    preguntas: [
      { pregunta_id: 'P001', habilidad_id: 'MAT_1A_C1_H01', respuesta_correcta: 'B' },
      { pregunta_id: 'P002', habilidad_id: 'MAT_1A_C1_H02', respuesta_correcta: 'A' },
    ],
  },
  respuestas: [
    { pregunta_id: 'P001', respuesta: 'B' },
    { pregunta_id: 'P002', respuesta: 'C' },
  ],
}

test('builds the requested contract and keeps incorrect student answers separate from the answer key', () => {
  const originalSession = structuredClone(session)
  const originalAnswers = structuredClone(answers)

  assert.deepEqual(buildTestCorrectionPayload(session, answers), expectedPayload)
  assert.deepEqual(session, originalSession)
  assert.deepEqual(answers, originalAnswers)
})

test('derives the answer key from Correct for the previously supported internal format', () => {
  const example = JSON.parse(readFileSync(
    new URL('../src/data/diagnostic-test.json', import.meta.url),
    'utf8'
  ))
  const payload = buildTestCorrectionPayload(example, { P036: 'D' })

  assert.deepEqual(payload.alumno, { nombre: 'Jose', anio_ingreso: 4 })
  assert.equal(payload.test.test_id, example.test_id)
  assert.equal(payload.test.preguntas[0].respuesta_correcta, 'C')
  assert.equal(payload.respuestas[0].respuesta, 'D')
})

test('does not contact the API when answers or required session data are missing', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', () => {
    throw new Error('Unexpected network request')
  })

  for (const invalidAnswers of [{}, { P001: 'B' }, { ...answers, P002: 'Z' }]) {
    await assert.rejects(submitTestCorrection(session, invalidAnswers), /Respondé todas/)
  }
  await assert.rejects(submitTestCorrection({ ...session, alumno: {} }, answers), /datos del alumno/)
  await assert.rejects(submitTestCorrection({ ...session, test_id: undefined }, answers), /datos del alumno o del test/)
  const incomplete = structuredClone(session)
  delete incomplete.preguntas[0].habilidad_id
  await assert.rejects(submitTestCorrection(incomplete, answers), /datos de las preguntas/)
  assert.equal(fetchMock.mock.callCount(), 0)
})

for (const status of [200, 204]) {
  test(`posts the exact JSON to corregir_test and accepts HTTP ${status}`, async (context) => {
    const fetchMock = context.mock.method(globalThis, 'fetch', async () => (
      new Response(status === 204 ? null : '{"ok":true}', { status })
    ))

    assert.equal(await submitTestCorrection(session, answers), null)

    assert.equal(fetchMock.mock.callCount(), 1)
    const [url, options] = fetchMock.mock.calls[0].arguments
    assert.equal(url, 'https://osc-sch.app.n8n.cloud/webhook-test/corregir_test')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['Content-Type'], 'application/json')
    assert.deepEqual(JSON.parse(options.body), expectedPayload)
  })
}

test('reports an inactive webhook instead of accepting HTTP 404 as a completed submission', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => new Response(
    '{"message":"Webhook not registered"}',
    { status: 404 }
  ))

  await assert.rejects(submitTestCorrection(session, answers), (error) => {
    assert.match(error.message, /servicio de corrección no está disponible/)
    assert.equal(error.cause.status, 404)
    assert.equal(error.cause.details.message, 'Webhook not registered')
    return true
  })
})

test('allows a manual retry after a non-JSON server error without changing the payload', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(
    'Unavailable', { status: 500 }
  ))

  await assert.rejects(submitTestCorrection(session, answers), /No se pudieron enviar/)
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 204 }))
  await submitTestCorrection(session, answers)

  assert.equal(fetchMock.mock.callCount(), 2)
  assert.equal(fetchMock.mock.calls[0].arguments[1].body, fetchMock.mock.calls[1].arguments[1].body)
})

test('propagates a network failure so the activity can keep answers and offer a retry', async (context) => {
  context.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Failed to fetch')
  })

  await assert.rejects(submitTestCorrection(session, answers), /Failed to fetch/)
})

test('returns the n8n correction profile for the completed test', async (context) => {
  const response = JSON.parse(readFileSync(
    new URL('./fixtures/correction-profile.json', import.meta.url), 'utf8'
  ))
  response[0].test_id = session.test_id
  context.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(response)))

  assert.deepEqual(await submitTestCorrection(session, answers), response[0])
})

test('keeps a successful submission when the response contains no usable profile', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('Workflow started'))
  assert.equal(await submitTestCorrection(session, answers), null)
  assert.equal(fetchMock.mock.callCount(), 1)
})
