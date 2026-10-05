import { buildTestCorrectionPayload, parseActivitySession } from './activitySession.js'
import { parseCorrectionProfile } from './correctionProfile.js'

const LATEST_RESULT_KEY = 'numex_latest_test_result'

export function summarizeTestResult(result) {
  if (
    typeof result?.completed_at !== 'string' ||
    !Number.isFinite(Date.parse(result.completed_at))
  ) {
    throw new Error('El resultado no tiene una fecha de finalización válida.')
  }

  const session = parseActivitySession(result.sessionData)
  const payload = buildTestCorrectionPayload(session, result.answers)
  const profile = parseCorrectionProfile(result.correctionProfile, session.test_id)
  const questions = session.preguntas.map((question, index) => {
    const answer = result.answers[question.pregunta_id]
    const correctAnswer = payload.test.preguntas[index].respuesta_correcta

    return {
      id: question.pregunta_id,
      statement: question.enunciado,
      answer,
      answerText: question.opciones[answer].texto,
      correctAnswer,
      correctAnswerText: question.opciones[correctAnswer].texto,
      isCorrect: answer === correctAnswer,
      feedback: question.opciones[answer].feedback ?? '',
    }
  })
  const correct = questions.filter((question) => question.isCorrect).length

  return {
    student: profile?.alumno ?? payload.alumno,
    profile,
    completedAt: result.completed_at,
    total: questions.length,
    correct,
    incorrect: questions.length - correct,
    percentage: Math.round((correct / questions.length) * 100),
    questions,
  }
}

export function loadLatestTestResult(userId) {
  try {
    const stored = JSON.parse(localStorage.getItem(userId ? `${LATEST_RESULT_KEY}:${userId}` : LATEST_RESULT_KEY))
    if (stored?.version !== 1) {
      return null
    }

    summarizeTestResult(stored.result)
    return stored.result
  } catch {
    return null
  }
}

export function saveLatestTestResult(result, userId) {
  try {
    localStorage.setItem(userId ? `${LATEST_RESULT_KEY}:${userId}` : LATEST_RESULT_KEY, JSON.stringify({ version: 1, result }))
    return true
  } catch {
    return false
  }
}
