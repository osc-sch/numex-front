import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, ProgressBar, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  abandonActivityAttempt,
  answerActivityAttempt,
  getActivity,
  getActivityAttempt,
  startActivityAttempt,
} from '../services/activities'

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  if (globalThis.crypto?.getRandomValues) {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  throw new Error('Tu navegador no puede crear un identificador seguro para enviar respuestas.')
}

function StudentActivityPage() {
  const { courseId, sectionId, activityId } = useParams()
  return (
    <ActivityResolution
      key={`${courseId}:${sectionId}:${activityId}`}
      courseId={courseId}
      sectionId={sectionId}
      activityId={activityId}
    />
  )
}

function ActivityResolution({ courseId, sectionId, activityId }) {
  const [activity, setActivity] = useState(null)
  const [attempt, setAttempt] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [nextQuestion, setNextQuestion] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAbandoning, setIsAbandoning] = useState(false)
  const [showAbandonConfirmation, setShowAbandonConfirmation] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [attemptError, setAttemptError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [canRecoverAttempt, setCanRecoverAttempt] = useState(false)
  const [isRecoveringAttempt, setIsRecoveringAttempt] = useState(false)
  const [abandonError, setAbandonError] = useState('')
  const [abandoned, setAbandoned] = useState(false)
  const submissionInFlight = useRef(false)
  const pendingRequest = useRef(null)
  const sectionUrl = `/courses/${encodeURIComponent(courseId)}#${encodeURIComponent(sectionId)}`

  useEffect(() => {
    const controller = new AbortController()
    getActivity(courseId, sectionId, activityId, { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setActivity(data)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar la actividad.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, activityId])

  const setAttemptState = (data, { preservePendingRequest = false } = {}) => {
    if (!preservePendingRequest) pendingRequest.current = null
    setAttempt(data.intento)
    setCurrentQuestion(data.preguntaActual)
    setStatistics(data.intento.estadisticas)
    setSelectedOption('')
    setFeedback(null)
    setNextQuestion(null)
    setCanRecoverAttempt(false)
    setSubmitError('')
    setAbandoned(data.intento.estado === 'abandonado')
  }

  const startOrResume = async () => {
    if (isStarting || isLoading) return
    setIsStarting(true)
    setAttemptError('')
    try {
      const data = await startActivityAttempt(activityId)
      setAttemptState(data)
    } catch (error) {
      setAttemptError(error.message || 'No se pudo iniciar o recuperar el intento.')
    } finally {
      setIsStarting(false)
    }
  }

  const checkAnswer = async event => {
    event.preventDefault()
    if (
      submissionInFlight.current
      || isSubmitting
      || !selectedOption
      || !attempt
      || !currentQuestion
      || feedback
    ) return

    const ejercicioId = currentQuestion.ejercicioId
    if (
      !pendingRequest.current
      || pendingRequest.current.ejercicioId !== ejercicioId
      || pendingRequest.current.opcionId !== selectedOption
    ) {
      try {
        pendingRequest.current = {
          requestId: createRequestId(),
          ejercicioId,
          opcionId: selectedOption,
        }
      } catch (error) {
        setSubmitError(error.message)
        return
      }
    }

    submissionInFlight.current = true
    setIsSubmitting(true)
    setSubmitError('')
    try {
      const response = await answerActivityAttempt(attempt.id, pendingRequest.current)
      pendingRequest.current = null
      setCanRecoverAttempt(false)
      setFeedback(response.retroalimentacion)
      setNextQuestion(response.preguntaActual)
      setStatistics(response.estadisticas)
      setAttempt(current => ({
        ...current,
        estado: response.actividadCompletada ? 'completado' : current.estado,
      }))
    } catch (error) {
      setSubmitError(error.message || 'No se pudo comprobar tu respuesta. Podés reintentar sin duplicarla.')
      setCanRecoverAttempt(error.status === 409)
    } finally {
      submissionInFlight.current = false
      setIsSubmitting(false)
    }
  }

  const recoverAttempt = async () => {
    if (!attempt?.id || isRecoveringAttempt) return
    setIsRecoveringAttempt(true)
    setSubmitError('')
    try {
      const data = await getActivityAttempt(attempt.id)
      const preservePendingRequest =
        pendingRequest.current?.ejercicioId === data.preguntaActual?.ejercicioId
      setAttemptState(data, { preservePendingRequest })
      setCanRecoverAttempt(false)
    } catch (error) {
      setSubmitError(error.message || 'No se pudo recuperar el progreso. Intentá nuevamente.')
      setCanRecoverAttempt(true)
    } finally {
      setIsRecoveringAttempt(false)
    }
  }

  const continueAfterFeedback = () => {
    if (!feedback) return
    if (attempt?.estado === 'completado') {
      setCurrentQuestion(null)
      setNextQuestion(null)
      setFeedback(null)
      return
    }
    setCurrentQuestion(nextQuestion)
    setNextQuestion(null)
    setSelectedOption('')
    setFeedback(null)
  }

  const abandonAttempt = async () => {
    if (!attempt?.id || isAbandoning) return
    setIsAbandoning(true)
    setAbandonError('')
    try {
      await abandonActivityAttempt(attempt.id)
      setAbandoned(true)
      setAttempt(current => ({ ...current, estado: 'abandonado' }))
      setShowAbandonConfirmation(false)
    } catch (error) {
      setAbandonError(error.message || 'No se pudo registrar el abandono. Intentá nuevamente.')
    } finally {
      setIsAbandoning(false)
    }
  }

  const completedQuestions = statistics?.preguntasCompletadas ?? 0
  const totalQuestions = attempt?.progresoPorPregunta?.length ?? 0
  const submittedAnswers = statistics?.respuestasEnviadas ?? 0
  const correctAnswers = statistics?.respuestasCorrectas ?? 0
  const incorrectAnswers = statistics?.respuestasIncorrectas ?? 0
  const firstTryCorrect = statistics?.aciertosPrimerIntento ?? 0
  const progressValue = totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0
  const isComplete = attempt?.estado === 'completado' && !feedback

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-green student-activity-page" aria-labelledby="student-activity-title">
        <Link to={sectionUrl} className="teacher-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a la sección
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando actividad…
          </div>
        )}
        {loadError && <Alert variant="danger" role="alert">{loadError}</Alert>}

        {!isLoading && !loadError && activity && (
          <>
            <header className="student-activity-heading">
              <p className="teacher-eyebrow"><i className="bi bi-clipboard-check" aria-hidden="true" /> Actividad</p>
              <h1 id="student-activity-title">{activity.titulo}</h1>
              {activity.descripcion && <p>{activity.descripcion}</p>}
            </header>

            {attemptError && <Alert variant="danger" role="alert">{attemptError}</Alert>}
            {abandonError && <Alert variant="danger" role="alert">{abandonError}</Alert>}

            {!attempt && (
              <section className="activity-start-card">
                <span className="activity-start-icon" aria-hidden="true"><i className="bi bi-play-circle" /></span>
                <div>
                  <h2>Aprendé pregunta por pregunta</h2>
                  <p>Si ya tenés un intento en progreso, el servidor lo recuperará para que continúes.</p>
                </div>
                <Button onClick={startOrResume} disabled={isStarting}>
                  {isStarting
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Recuperando…</>
                    : 'Comenzar o continuar'}
                </Button>
              </section>
            )}

            {attempt?.estado === 'abandonado' && (
              <section className="activity-start-card">
                <span className="activity-start-icon" aria-hidden="true"><i className="bi bi-arrow-repeat" /></span>
                <div>
                  <h2>Este intento fue abandonado</h2>
                  <p>Podés empezar un nuevo intento cuando quieras.</p>
                </div>
                <Button onClick={startOrResume} disabled={isStarting}>
                  {isStarting
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Iniciando…</>
                    : 'Comenzar un nuevo intento'}
                </Button>
              </section>
            )}

            {attempt && !abandoned && (
              <>
                <section className="activity-live-progress" aria-label="Progreso del intento">
                  <div className="activity-live-progress-labels">
                    <strong>Preguntas completadas</strong>
                    <span>{completedQuestions} de {totalQuestions}</span>
                  </div>
                  <ProgressBar
                    now={progressValue}
                    aria-label={`${completedQuestions} de ${totalQuestions} preguntas completadas`}
                  />
                  <div className="activity-live-progress-stats">
                    <span>
                      {statistics?.respuestasCorrectas ?? 0}
                      {' '}
                      {(statistics?.respuestasCorrectas ?? 0) === 1 ? 'respuesta correcta' : 'respuestas correctas'}
                    </span>
                    <span>
                      {statistics?.respuestasIncorrectas ?? 0}
                      {' '}
                      {(statistics?.respuestasIncorrectas ?? 0) === 1 ? 'respuesta incorrecta' : 'respuestas incorrectas'}
                    </span>
                    <span>
                      {submittedAnswers} {submittedAnswers === 1 ? 'respuesta enviada' : 'respuestas enviadas'}
                    </span>
                  </div>
                </section>

                {isComplete ? (
                  <section className="activity-completion-card" aria-labelledby="activity-completion-title" role="status">
                    <div className="activity-completion-icon" aria-hidden="true"><i className="bi bi-mortarboard" /></div>
                    <p className="teacher-eyebrow">Práctica terminada</p>
                    <h2 id="activity-completion-title">¡Terminaste la actividad!</h2>
                    <p className="activity-completion-count">
                      Completaste {completedQuestions} {completedQuestions === 1 ? 'pregunta' : 'preguntas'}.
                    </p>
                    <div className="activity-completion-stats">
                      <div>
                        <strong>{submittedAnswers}</strong>
                        <span>{submittedAnswers === 1 ? 'respuesta enviada' : 'respuestas enviadas'}</span>
                      </div>
                      <div>
                        <strong>{correctAnswers}</strong>
                        <span>{correctAnswers === 1 ? 'respuesta correcta' : 'respuestas correctas'}</span>
                      </div>
                      <div>
                        <strong>{incorrectAnswers}</strong>
                        <span>{incorrectAnswers === 1 ? 'respuesta incorrecta' : 'respuestas incorrectas'}</span>
                      </div>
                      <div>
                        <strong>{firstTryCorrect}</strong>
                        <span>{firstTryCorrect === 1 ? 'acierto al primer intento' : 'aciertos al primer intento'}</span>
                      </div>
                    </div>
                    <p className="activity-completion-note">Este resultado es una guía para seguir aprendiendo, no una calificación académica.</p>
                    <Button as={Link} to={sectionUrl}>Volver a la sección</Button>
                  </section>
                ) : (
                  <>
                    {currentQuestion && (
                      <Form className="activity-current-question" onSubmit={checkAnswer}>
                        <div className="activity-current-question-heading">
                          <span>Pregunta en curso</span>
                          <span>{completedQuestions} completadas</span>
                        </div>
                        {currentQuestion.tipo !== 'opcion_unica' ? (
                          <Alert variant="warning">
                            Este tipo de pregunta todavía no se puede resolver. El backend debe servir ejercicios de selección única.
                          </Alert>
                        ) : (
                          <>
                            <fieldset disabled={isSubmitting || Boolean(feedback)}>
                              <legend className="student-activity-question-prompt">{currentQuestion.enunciado}</legend>
                              <div className="student-activity-options">
                                {currentQuestion.opciones.map(option => (
                                  <Form.Check
                                    key={option._id}
                                    checked={selectedOption === option._id}
                                    id={`attempt-${currentQuestion.ejercicioId}-${option._id}`}
                                    label={option.texto}
                                    name={`attempt-${currentQuestion.ejercicioId}`}
                                    onClick={() => {
                                      if (isSubmitting || feedback) return
                                      setSelectedOption(option._id)
                                      setSubmitError('')
                                    }}
                                    onChange={() => {
                                      setSelectedOption(option._id)
                                      setSubmitError('')
                                    }}
                                    type="radio"
                                  />
                                ))}
                              </div>
                            </fieldset>
                            {feedback && (
                              <section
                                className={`activity-feedback-panel is-${feedback.tipo === 'acierto' ? 'correct' : 'hint'}`}
                                aria-live="polite"
                                aria-atomic="true"
                              >
                                <div className="activity-feedback-icon" aria-hidden="true">
                                  <i className={`bi ${feedback.tipo === 'acierto' ? 'bi-check-circle-fill' : feedback.tipo === 'explicacion' ? 'bi-lightbulb-fill' : 'bi-chat-square-text-fill'}`} />
                                </div>
                                <div>
                                  <h2>
                                    {feedback.tipo === 'acierto'
                                      ? '¡Respuesta correcta!'
                                      : feedback.tipo === 'explicacion'
                                        ? 'Revisemos la idea'
                                        : 'Una pista para ayudarte'}
                                  </h2>
                                  <p>{feedback.mensaje}</p>
                                </div>
                                <Button type="button" onClick={continueAfterFeedback}>
                                  {attempt.estado === 'completado' ? 'Ver resultado' : 'Continuar'}
                                </Button>
                              </section>
                            )}
                            {submitError && !feedback && (
                              <Alert className="mt-3" variant="danger" role="alert">
                                <p>{submitError}</p>
                                {canRecoverAttempt && (
                                  <Button
                                    disabled={isRecoveringAttempt}
                                    onClick={recoverAttempt}
                                    size="sm"
                                    variant="outline-secondary"
                                  >
                                    {isRecoveringAttempt
                                      ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Recuperando…</>
                                      : 'Recuperar progreso del servidor'}
                                  </Button>
                                )}
                              </Alert>
                            )}
                            {!feedback && (
                              <div className="activity-current-question-footer">
                                <Button type="submit" disabled={!selectedOption || isSubmitting}>
                                  {isSubmitting
                                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Comprobando…</>
                                    : 'Comprobar respuesta'}
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </Form>
                    )}

                  </>
                )}

                {attempt.estado === 'en_progreso' && (
                  <div className="activity-abandon-action">
                    <Button variant="link" onClick={() => setShowAbandonConfirmation(true)}>
                      Abandonar actividad
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        <Modal show={showAbandonConfirmation} onHide={() => !isAbandoning && setShowAbandonConfirmation(false)} centered>
          <Modal.Header closeButton={!isAbandoning}>
            <Modal.Title>Abandonar actividad</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Se registrará que abandonaste este intento. ¿Querés continuar?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowAbandonConfirmation(false)} disabled={isAbandoning}>
              Seguir resolviendo
            </Button>
            <Button variant="danger" onClick={abandonAttempt} disabled={isAbandoning}>
              {isAbandoning
                ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Registrando…</>
                : 'Confirmar abandono'}
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default StudentActivityPage
