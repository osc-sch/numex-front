function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

export function parseActivitySession(payload) {
  // n8n can return a single item or an array containing that item.
  const session = Array.isArray(payload) && payload.length === 1
    ? payload[0]
    : payload

  if (
    !isObject(session) ||
    !Array.isArray(session.preguntas) ||
    session.preguntas.length === 0
  ) {
    throw new Error(
      'El servicio respondió, pero no envió preguntas para el diagnóstico. Intentá nuevamente.'
    )
  }

  const questionIds = new Set()

  const questions = session.preguntas.map((question) => {
    const id = question?.pregunta_id
    const validId = hasText(id) || (typeof id === 'number' && Number.isFinite(id))
    let options = isObject(question?.opciones)
      ? Object.entries(question.opciones)
      : []

    if (options.every(([, option]) => typeof option === 'string')) {
      options = options.map(([key, text]) => [
        key,
        {
          texto: text,
          Correct: key === question.respuesta_correcta,
          feedback: key === question.respuesta_correcta
            ? 'La respuesta es correcta.'
            : question.explicaciones_incorrectas?.[key] ?? '',
        },
      ])
    }

    if (
      !validId ||
      questionIds.has(String(id)) ||
      Object.hasOwn(Object.prototype, String(id)) ||
      !hasText(question?.enunciado) ||
      options.length < 2 ||
      !options.every(([key, option]) =>
        hasText(key) &&
        isObject(option) &&
        hasText(option.texto) &&
        typeof option.Correct === 'boolean' &&
        (option.feedback == null || typeof option.feedback === 'string')
      ) ||
      !options.some(([, option]) => option.Correct)
    ) {
      throw new Error(
        'El servicio devolvió preguntas incompletas o inválidas. Intentá generar el diagnóstico nuevamente.'
      )
    }

    questionIds.add(String(id))

    return { ...question, opciones: Object.fromEntries(options) }
  })

  return { ...session, preguntas: questions }
}

export function buildTestCorrectionPayload(session, answers) {
  if (
    !hasText(session?.alumno?.nombre) ||
    !Number.isInteger(session?.alumno?.anio_ingreso) ||
    session.alumno.anio_ingreso <= 0 ||
    !hasText(session?.test_id) ||
    !Array.isArray(session?.preguntas) ||
    session.preguntas.length === 0
  ) {
    throw new Error('No se pudo preparar el envío: faltan datos del alumno o del test.')
  }

  const questions = session.preguntas.map((question) => {
    const correctOptions = Object.entries(question.opciones ?? {})
      .filter(([, option]) => option?.Correct === true)
    const correctAnswer = question.respuesta_correcta ?? (
      correctOptions.length === 1 ? correctOptions[0][0] : undefined
    )

    if (
      !hasText(question.habilidad_id) ||
      !hasText(correctAnswer) ||
      !Object.hasOwn(question.opciones ?? {}, correctAnswer)
    ) {
      throw new Error('No se pudo preparar el envío: faltan datos de las preguntas.')
    }

    if (
      !Object.hasOwn(answers ?? {}, question.pregunta_id) ||
      !Object.hasOwn(question.opciones, answers[question.pregunta_id])
    ) {
      throw new Error('Respondé todas las preguntas antes de finalizar el test.')
    }

    return {
      pregunta_id: question.pregunta_id,
      habilidad_id: question.habilidad_id,
      respuesta_correcta: correctAnswer,
    }
  })

  return {
    alumno: {
      nombre: session.alumno.nombre,
      anio_ingreso: session.alumno.anio_ingreso,
    },
    cantidad_practica_diaria: 5,
    test: {
      test_id: session.test_id,
      preguntas: questions,
    },
    respuestas: questions.map(({ pregunta_id }) => ({
      pregunta_id,
      respuesta: answers[pregunta_id],
    })),
  }
}
