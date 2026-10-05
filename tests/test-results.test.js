import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  loadLatestTestResult,
  saveLatestTestResult,
  summarizeTestResult,
} from '../src/utils/testResults.js'

const sessionData = JSON.parse(readFileSync(
  new URL('../src/data/diagnostic-test.json', import.meta.url),
  'utf8'
))
sessionData.preguntas = [0, 1, 2].map((index) => ({
  ...structuredClone(sessionData.preguntas[0]),
  pregunta_id: `P${index + 1}`,
}))
const result = {
  sessionData,
  answers: { P1: 'C', P2: 'D', P3: 'C' },
  completed_at: '2026-09-28T18:00:00.000Z',
}

function useStorage(context, storage) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
  context.after(() => {
    if (original) {
      Object.defineProperty(globalThis, 'localStorage', original)
    } else {
      delete globalThis.localStorage
    }
  })
}

test('summarizes actual answers and questions rather than the declared question count', () => {
  const original = structuredClone(result)
  const summary = summarizeTestResult(result)

  assert.equal(summary.total, 3)
  assert.equal(summary.correct, 2)
  assert.equal(summary.incorrect, 1)
  assert.equal(summary.percentage, 67)
  assert.equal(summary.student.nombre, 'Jose')
  assert.equal(summary.questions[1].answer, 'D')
  assert.equal(summary.questions[1].correctAnswer, 'C')
  assert.equal(summary.questions[1].isCorrect, false)
  assert.equal(summary.questions[1].answerText, sessionData.preguntas[1].opciones.D.texto)
  assert.equal(summary.questions[1].correctAnswerText, sessionData.preguntas[1].opciones.C.texto)
  assert.equal(summary.questions[1].feedback, sessionData.preguntas[1].opciones.D.feedback)
  assert.deepEqual(result, original)
})

test('handles tests with all correct or all incorrect answers', () => {
  for (const [answer, percentage, correct] of [['A', 0, 0], ['C', 100, 3]]) {
    const summary = summarizeTestResult({
      ...result,
      answers: { P1: answer, P2: answer, P3: answer },
    })
    assert.equal(summary.percentage, percentage)
    assert.equal(summary.correct, correct)
    assert.equal(summary.correct + summary.incorrect, summary.total)
  }
})

test('restores the latest finished test across reloads and replaces the previous one', (context) => {
  const values = new Map()
  useStorage(context, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  })
  assert.equal(loadLatestTestResult(), null)
  assert.equal(saveLatestTestResult(result), true)
  assert.deepEqual(loadLatestTestResult(), result)

  const nextResult = { ...result, answers: { P1: 'C', P2: 'C', P3: 'C' } }
  assert.equal(saveLatestTestResult(nextResult), true)
  assert.equal(summarizeTestResult(loadLatestTestResult()).percentage, 100)
  assert.equal(values.size, 1)
})

test('ignores corrupted, incompatible or incomplete stored results', (context) => {
  let stored
  useStorage(context, { getItem: () => stored })
  for (const value of [
    'invalid JSON',
    JSON.stringify({ version: 2, result }),
    JSON.stringify({ version: 1, result: {} }),
    JSON.stringify({ version: 1, result: { ...result, answers: {} } }),
    JSON.stringify({ version: 1, result: { ...result, completed_at: 'invalid date' } }),
  ]) {
    stored = value
    assert.equal(loadLatestTestResult(), null)
  }
})

test('storage failure does not prevent displaying the in-memory result', (context) => {
  useStorage(context, {
    getItem: () => { throw new Error('Storage unavailable') },
    setItem: () => { throw new Error('Storage quota exceeded') },
  })

  assert.equal(loadLatestTestResult(), null)
  assert.equal(saveLatestTestResult(result), false)
  assert.equal(summarizeTestResult(result).percentage, 67)
})

test('persists the API profile and keeps topic mastery separate from answer accuracy', (context) => {
  const [profile] = JSON.parse(readFileSync(
    new URL('./fixtures/correction-profile.json', import.meta.url), 'utf8'
  ))
  profile.test_id = sessionData.test_id
  const finished = { ...result, correctionProfile: profile }
  const values = new Map()
  useStorage(context, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  })

  assert.equal(saveLatestTestResult(finished), true)
  const summary = summarizeTestResult(loadLatestTestResult())
  assert.deepEqual(summary.profile, profile)
  assert.equal(summary.profile.temas[0].dominio_pct, 62.1)
  assert.equal(summary.percentage, 67)
  assert.equal(summary.student.anio_ingreso, 2024)
})

test('older stored results still show their answer summary without a correction profile', () => {
  const summary = summarizeTestResult(result)
  assert.equal(summary.profile, null)
  assert.equal(summary.percentage, 67)
})

test('a profile from a different test cannot replace the summary student or topic results', () => {
  const [profile] = JSON.parse(readFileSync(
    new URL('./fixtures/correction-profile.json', import.meta.url), 'utf8'
  ))
  const summary = summarizeTestResult({ ...result, correctionProfile: profile })
  assert.equal(summary.profile, null)
  assert.deepEqual(summary.student, sessionData.alumno)
})
