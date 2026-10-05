import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseActivitySession } from '../src/utils/activitySession.js'

const example = JSON.parse(readFileSync(
  new URL('../src/data/diagnostic-test.json', import.meta.url),
  'utf8'
))

test('keeps the API questions, answer keys, feedback and session metadata', () => {
  const session = structuredClone(example)
  session.test_id = 'API_SESSION_002'
  session.preguntas[0].enunciado = 'Pregunta recibida de la API'

  assert.deepEqual(parseActivitySession(session), session)
  assert.deepEqual(parseActivitySession([session]), session)
  assert.equal(session.preguntas[0].opciones.C.Correct, true)
})

const n8nSession = {
  test_id: 'DIAG-MAT-2024-JOSE-4TO',
  tipo: 'Test Diagnóstico Inicial',
  alumno: { nombre: 'Jose', anio_ingreso: 4 },
  preguntas: [
    {
      pregunta_id: 'P001',
      anio_origen: 1,
      contenido_id: '1_NO_003',
      habilidad_id: '1_NO_003_H01',
      enunciado: 'Si Jose tiene 3 paquetes, 5 cajas y 8 lápices sueltos, ¿cuántos lápices tiene en total?',
      opciones: { A: '358', B: '3508', C: '3580', D: '853' },
      respuesta_correcta: 'A',
      explicaciones_incorrectas: {
        B: 'Error en la comprensión del valor posicional.',
        C: 'Confusión en la escala decimal.',
        D: 'Inversión del orden del sistema posicional.',
      },
    },
  ],
}

test('adapts n8n text options and feedback without changing the original response', () => {
  const original = structuredClone(n8nSession)
  const session = parseActivitySession([n8nSession])
  const question = session.preguntas[0]

  assert.equal(session.test_id, n8nSession.test_id)
  assert.deepEqual(session.alumno, n8nSession.alumno)
  assert.equal(question.habilidad_id, '1_NO_003_H01')
  assert.equal(question.opciones.A.texto, '358')
  assert.equal(question.opciones.A.Correct, true)
  assert.deepEqual(question.opciones.B, {
    texto: '3508',
    Correct: false,
    feedback: n8nSession.preguntas[0].explicaciones_incorrectas.B,
  })
  assert.deepEqual(n8nSession, original)
})

test('uses the answer key of each question, including when the correct option is not A', () => {
  const payload = structuredClone(n8nSession)
  payload.preguntas.push({
    ...structuredClone(payload.preguntas[0]),
    pregunta_id: 'P002',
    respuesta_correcta: 'D',
    explicaciones_incorrectas: undefined,
  })
  const session = parseActivitySession(payload)

  assert.equal(session.preguntas.length, 2)
  assert.equal(session.preguntas[0].opciones.A.Correct, true)
  assert.equal(session.preguntas[1].opciones.A.Correct, false)
  assert.equal(session.preguntas[1].opciones.D.Correct, true)
  assert.equal(session.preguntas[1].opciones.B.feedback, '')
})

test('rejects n8n text options when the answer key is missing or does not match an option', () => {
  for (const answer of [undefined, '', 'E']) {
    const payload = structuredClone(n8nSession)
    payload.preguntas[0].respuesta_correcta = answer

    assert.throws(() => parseActivitySession(payload), /preguntas incompletas o inválidas/)
  }
})

test('rejects an acknowledgement or empty response instead of opening a test', () => {
  for (const payload of [
    { message: 'Workflow was started' },
    null,
    [],
    {},
    { preguntas: [] },
    { preguntas: 'invalid' },
    [example, example],
  ]) {
    assert.throws(() => parseActivitySession(payload), /no envió preguntas/)
  }
})

test('rejects colliding question IDs that would overwrite student answers', () => {
  const session = structuredClone(example)
  session.preguntas.push(structuredClone(session.preguntas[0]))

  assert.throws(() => parseActivitySession(session), /preguntas incompletas o inválidas/)
  session.preguntas[0].pregunta_id = 1
  session.preguntas[1].pregunta_id = '1'
  assert.throws(() => parseActivitySession(session), /preguntas incompletas o inválidas/)
})

test('rejects malformed questions or answer keys before they reach the activity screen', () => {
  const question = example.preguntas[0]
  const malformedQuestions = [
    null,
    { ...question, pregunta_id: undefined },
    { ...question, pregunta_id: '__proto__' },
    { ...question, enunciado: '' },
    { ...question, opciones: null },
    { ...question, opciones: { A: null, B: question.opciones.B } },
    {
      ...question,
      opciones: {
        A: { texto: 'Respuesta A', Correct: 'false' },
        B: { texto: 'Respuesta B', Correct: true },
      },
    },
    {
      ...question,
      opciones: {
        A: { texto: 'Respuesta A', Correct: false },
        B: { texto: 'Respuesta B', Correct: false },
      },
    },
  ]

  for (const malformedQuestion of malformedQuestions) {
    assert.throws(
      () => parseActivitySession({ preguntas: [malformedQuestion] }),
      /preguntas incompletas o inválidas/
    )
  }
})
