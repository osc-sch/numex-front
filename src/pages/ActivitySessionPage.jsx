import { useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Modal,
  ProgressBar,
  Spinner,
} from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'

import DashboardLayout from '../components/DashboardLayout'
import { submitTestCorrection } from '../services/testCorrection'
import '../styles/activity-session.css'



const SESSION_CONFIG = {
  diagnostic: {
    label: 'Diagnóstico inicial',
    eyebrow: 'Conociendo tu punto de partida',
    icon: 'bi-clipboard2-pulse',
    description:
      'Responde con calma. No es un examen y tus respuestas nos ayudarán a preparar actividades adecuadas para vos.',
    showImmediateFeedback: false,
    finishLabel: 'Finalizar diagnóstico',
  },

  practice: {
    label: 'Práctica de hoy',
    eyebrow: 'Actividad personalizada',
    icon: 'bi-lightning-charge',
    description:
      'Practica los contenidos seleccionados para seguir avanzando.',
    showImmediateFeedback: true,
    finishLabel: 'Finalizar práctica',
  },

  exam: {
    label: 'Actividad del profesor',
    eyebrow: 'Actividad asignada',
    icon: 'bi-journal-check',
    description:
      'Responde las consignas de la actividad asignada por tu profesor.',
    showImmediateFeedback: false,
    finishLabel: 'Entregar actividad',
  },
}

function ActivitySessionPage({
  purpose = 'diagnostic',
  sessionData,
  onComplete,
}) {
  const navigate = useNavigate()
  const config =
    SESSION_CONFIG[purpose] ??
    SESSION_CONFIG.practice

  const questions = sessionData?.preguntas ?? []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [checkedQuestions, setCheckedQuestions] = useState({})
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const submissionInProgress = useRef(false)

  const currentQuestion = questions[currentIndex]

  const answeredCount = Object.keys(answers).length

  const progress = questions.length
    ? ((currentIndex + 1) / questions.length) * 100
    : 0

  const selectedAnswer = currentQuestion
    ? answers[currentQuestion.pregunta_id]
    : null

  const questionWasChecked = currentQuestion
    ? Boolean(
        checkedQuestions[currentQuestion.pregunta_id]
      )
    : false

  const selectedOption =
    currentQuestion && selectedAnswer
      ? currentQuestion.opciones[selectedAnswer]
      : null

  const isLastQuestion =
    currentIndex === questions.length - 1

  const remainingCount =
    questions.length - answeredCount

  const sessionTitle =
    sessionData?.titulo ?? config.label

  const studentName =
    sessionData?.alumno?.nombre ?? 'Estudiante'

  const questionOptions = useMemo(() => {
    if (!currentQuestion?.opciones) {
      return []
    }

    return Object.entries(currentQuestion.opciones)
  }, [currentQuestion])

  const handleSelectAnswer = (optionKey) => {
    if (
      questionWasChecked &&
      config.showImmediateFeedback
    ) {
      return
    }

    setAnswers((previousAnswers) => ({
      ...previousAnswers,
      [currentQuestion.pregunta_id]: optionKey,
    }))
  }

  const handleCheckAnswer = () => {
    if (!selectedAnswer) {
      return
    }

    setCheckedQuestions((previous) => ({
      ...previous,
      [currentQuestion.pregunta_id]: true,
    }))
  }

  const handleNext = () => {
    if (!selectedAnswer) {
      return
    }

    if (
      config.showImmediateFeedback &&
      !questionWasChecked
    ) {
      handleCheckAnswer()
      return
    }

    if (isLastQuestion) {
      setSubmitError('')
      setShowFinishModal(true)
      return
    }

    setCurrentIndex((index) => index + 1)
  }

  const handlePrevious = () => {
    if (currentIndex === 0) {
      return
    }

    setCurrentIndex((index) => index - 1)
  }

  const handleGoToQuestion = (index) => {
    setCurrentIndex(index)
  }

  const handleFinish = async () => {
    if (submissionInProgress.current || completed || remainingCount > 0) {
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    setSubmitError('')
    let correctionProfile

    try {
      correctionProfile = await submitTestCorrection(sessionData, answers)
      setShowFinishModal(false)
      setCompleted(true)
    } catch (error) {
      console.error('No se pudo enviar el test para corregir:', error)
      setSubmitError(
        error instanceof TypeError
          ? 'No se pudo conectar con el servicio de corrección. Tus respuestas se conservan; intentá nuevamente.'
          : error.message || 'No se pudieron enviar las respuestas. Intentá nuevamente.'
      )
      return
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }

    const result = {
      session_id:
        sessionData?.test_id ??
        sessionData?.session_id ??
        null,

      purpose,

      answers,
      sessionData,
      completed_at: new Date().toISOString(),
      correctionProfile,

      total_questions: questions.length,
      answered_questions: answeredCount,
    }

    if (onComplete) {
      onComplete(result)
    }
  }

  const getOptionClassName = (
    optionKey,
    option
  ) => {
    const classes = ['answer-option']

    const isSelected =
      selectedAnswer === optionKey

    if (isSelected) {
      classes.push('selected')
    }

    if (
      config.showImmediateFeedback &&
      questionWasChecked
    ) {
      if (option.Correct) {
        classes.push('correct')
      } else if (isSelected) {
        classes.push('incorrect')
      }
    }

    return classes.join(' ')
  }

  const getQuestionButtonClass = (question, index) => {
    const classes = ['question-nav-button']

    if (index === currentIndex) {
      classes.push('current')
    }

    if (answers[question.pregunta_id]) {
      classes.push('answered')
    }

    return classes.join(' ')
  }

  const getPrimaryButtonText = () => {
    if (
      config.showImmediateFeedback &&
      !questionWasChecked
    ) {
      return 'Comprobar respuesta'
    }

    if (isLastQuestion) {
      return config.finishLabel
    }

    return 'Siguiente'
  }

  if (!questions.length) {
    return (
      <DashboardLayout eyebrow={config.eyebrow}>
        <section className="activity-session-page">
          <Card className="session-empty-card">
            <Card.Body>
              <i className="bi bi-inbox" />

              <h1>No hay preguntas disponibles</h1>

              <p>
                Esta sesión todavía no tiene actividades
                cargadas. Volvé al inicio para comenzar una actividad.
              </p>

              <Button variant="primary" onClick={() => navigate('/')}>
                Volver al inicio
              </Button>
            </Card.Body>
          </Card>
        </section>
      </DashboardLayout>
    )
  }

  if (completed) {
  return (
    <DashboardLayout eyebrow={config.eyebrow}>
      <section className="activity-session-page">
        <Card className="session-complete-card">
          <Card.Body>
            <div className="complete-icon">
              <i className="bi bi-check-lg" />
            </div>

            <p className="eyebrow">
              Sesión completada
            </p>

            <h1>¡Terminaste!</h1>

            <p>
              Tus respuestas fueron registradas.
            </p>

            <div className="complete-summary">
              <span>
                Preguntas respondidas
              </span>

              <strong>
                {answeredCount}/{questions.length}
              </strong>
            </div>

            <Button
              variant="primary"
              className="mt-3"
              onClick={() => navigate('/')}
            >
              <i className="bi bi-house-door me-2" />
              Ver resultados en Inicio
            </Button>
          </Card.Body>
        </Card>
      </section>
    </DashboardLayout>
  )
}

  return (
    <DashboardLayout eyebrow={config.eyebrow}>
      <section className="activity-session-page">

        {/* Cabecera de la sesión */}
        <header className="session-heading">
          <div>
            <p className="eyebrow">
              {config.eyebrow}
            </p>

            <h1>{sessionTitle}</h1>

            <p className="session-description">
              {config.description}
            </p>
          </div>

          <div className="session-type-icon">
            <i className={`bi ${config.icon}`} />
          </div>
        </header>

        {/* Progreso general */}
        <Card className="session-progress-card">
          <Card.Body>
            <div className="session-progress-header">
              <div>
                <span>Tu progreso</span>

                <strong>
                  Pregunta {currentIndex + 1} de{' '}
                  {questions.length}
                </strong>
              </div>

              <Badge
                bg="light"
                text="dark"
                className="session-progress-badge"
              >
                {answeredCount} respondidas
              </Badge>
            </div>

            <ProgressBar
              now={progress}
              className="session-progress-bar"
            />
          </Card.Body>
        </Card>

        <div className="activity-session-layout">

          {/* Pregunta */}
          <main>
            <Card className="question-card">
              <Card.Body>

                <div className="question-meta">
                  <Badge
                    bg="primary"
                    className="question-year"
                  >
                    {currentQuestion.anio_origen}° año
                  </Badge>

                  <span className="question-topic">
                    {currentQuestion.eje}
                  </span>
                </div>

                <div className="question-number">
                  Pregunta {currentIndex + 1}
                </div>

                <h2 className="question-statement">
                  {currentQuestion.enunciado}
                </h2>

                <div className="answer-options">
                  {questionOptions.map(
                    ([optionKey, option]) => (
                      <button
                        key={optionKey}
                        type="button"
                        className={getOptionClassName(
                          optionKey,
                          option
                        )}
                        onClick={() =>
                          handleSelectAnswer(optionKey)
                        }
                      >
                        <span className="answer-letter">
                          {optionKey}
                        </span>

                        <span className="answer-text">
                          {option.texto}
                        </span>

                        {selectedAnswer === optionKey &&
                          !questionWasChecked && (
                            <i className="bi bi-check-circle-fill answer-selected-icon" />
                          )}

                        {config.showImmediateFeedback &&
                          questionWasChecked &&
                          option.Correct && (
                            <i className="bi bi-check-circle-fill answer-correct-icon" />
                          )}

                        {config.showImmediateFeedback &&
                          questionWasChecked &&
                          selectedAnswer ===
                            optionKey &&
                          !option.Correct && (
                            <i className="bi bi-x-circle-fill answer-incorrect-icon" />
                          )}
                      </button>
                    )
                  )}
                </div>

                {/* Feedback solo en prácticas */}
                {config.showImmediateFeedback &&
                  questionWasChecked &&
                  selectedOption && (
                    <div
                      className={
                        selectedOption.Correct
                          ? 'question-feedback correct-feedback'
                          : 'question-feedback incorrect-feedback'
                      }
                    >
                      <div className="feedback-icon">
                        <i
                          className={
                            selectedOption.Correct
                              ? 'bi bi-check-circle-fill'
                              : 'bi bi-info-circle-fill'
                          }
                        />
                      </div>

                      <div>
                        <strong>
                          {selectedOption.Correct
                            ? '¡Muy bien!'
                            : 'Revisemos esta respuesta'}
                        </strong>

                        <p>
                          {selectedOption.feedback}
                        </p>
                      </div>
                    </div>
                  )}

                {purpose === 'diagnostic' && (
                  <div className="diagnostic-note">
                    <i className="bi bi-shield-check" />

                    <span>
                      Durante el diagnóstico no te
                      mostraremos cuáles respuestas son
                      correctas. Queremos conocer tu punto
                      de partida real.
                    </span>
                  </div>
                )}

                <div className="question-controls">
                  <Button
                    variant="outline-secondary"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <i className="bi bi-arrow-left me-2" />
                    Anterior
                  </Button>

                  <Button
                    variant="primary"
                    className="next-question-button"
                    disabled={!selectedAnswer}
                    onClick={handleNext}
                  >
                    {getPrimaryButtonText()}

                    {!isLastQuestion && (
                      <i className="bi bi-arrow-right ms-2" />
                    )}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </main>

          {/* Navegador lateral */}
          <aside className="session-sidebar">

            <Card className="session-summary-card">
              <Card.Body>
                <div className="session-summary-header">
                  <div className="session-student-icon">
                    <i className="bi bi-person" />
                  </div>

                  <div>
                    <span>Estudiante</span>
                    <strong>{studentName}</strong>
                  </div>
                </div>

                <div className="session-stats">
                  <div>
                    <span>Respondidas</span>
                    <strong>{answeredCount}</strong>
                  </div>

                  <div>
                    <span>Pendientes</span>
                    <strong>{remainingCount}</strong>
                  </div>
                </div>
              </Card.Body>
            </Card>

            <Card className="question-navigator-card">
              <Card.Body>
                <div className="navigator-header">
                  <div>
                    <span>Preguntas</span>
                    <strong>
                      Navegación rápida
                    </strong>
                  </div>

                  <i className="bi bi-grid-3x3-gap" />
                </div>

                <div className="question-navigator">
                  {questions.map((question, index) => (
                    <button
                      key={question.pregunta_id}
                      type="button"
                      className={getQuestionButtonClass(
                        question,
                        index
                      )}
                      onClick={() =>
                        handleGoToQuestion(index)
                      }
                      aria-label={`Ir a la pregunta ${
                        index + 1
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <div className="navigator-legend">
                  <span>
                    <i className="legend-dot current-dot" />
                    Actual
                  </span>

                  <span>
                    <i className="legend-dot answered-dot" />
                    Respondida
                  </span>
                </div>
              </Card.Body>
            </Card>

          </aside>
        </div>

        <Modal
          className="dashboard-modal"
          show={showFinishModal}
          onHide={() => {
            if (!isSubmitting) {
              setShowFinishModal(false)
            }
          }}
          backdrop={isSubmitting ? 'static' : true}
          keyboard={!isSubmitting}
          centered
        >
          <Modal.Header closeButton={!isSubmitting}>
            <Modal.Title>
              ¿Finalizar la actividad?
            </Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <p>
              Respondistе{' '}
              <strong>
                {answeredCount} de {questions.length}
              </strong>{' '}
              preguntas.
            </p>

            {submitError && (
              <Alert variant="danger">
                {submitError}
              </Alert>
            )}

            {remainingCount > 0 && (
              <div className="finish-warning">
                <i className="bi bi-exclamation-triangle" />

                <span>
                  Todavía quedan {remainingCount}{' '}
                  preguntas sin responder.
                </span>
              </div>
            )}
          </Modal.Body>

          <Modal.Footer>
            <Button
              variant="outline-secondary"
              disabled={isSubmitting}
              onClick={() =>
                setShowFinishModal(false)
              }
            >
              Seguir revisando
            </Button>

            <Button
              variant="primary"
              onClick={handleFinish}
              disabled={remainingCount > 0 || isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    className="me-2"
                    aria-hidden="true"
                  />
                  Enviando respuestas...
                </>
              ) : (
                config.finishLabel
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default ActivitySessionPage
