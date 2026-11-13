import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner, Table } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MathContent from '../components/MathContent'
import {
  getActivity,
  getActivityAttemptEvents,
  getActivityAttempts,
  getActivityStatistics,
} from '../services/activities'
import { getCourse, getCourseSections } from '../services/courses'
import { getStudentDisplayName } from '../utils/studentDisplayName'

const stateLabels = {
  en_progreso: 'En progreso',
  completado: 'Completado',
  abandonado: 'Abandonado',
}

const eventLabels = {
  inicio: 'Inició el intento',
  reanudacion: 'Reanudó el intento',
  respuesta_correcta: 'Respondió correctamente',
  respuesta_incorrecta: 'Respondió incorrectamente',
  finalizacion: 'Completó la actividad',
  abandono: 'Abandonó explícitamente',
}

function TeacherActivityTrackingPage() {
  const { courseId, sectionId, activityId } = useParams()
  return (
    <ActivityTracking
      key={`${courseId}:${sectionId}:${activityId}`}
      courseId={courseId}
      sectionId={sectionId}
      activityId={activityId}
    />
  )
}

function ActivityTracking({ courseId, sectionId, activityId }) {
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [activity, setActivity] = useState(null)
  const [statistics, setStatistics] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [totalAttempts, setTotalAttempts] = useState(0)
  const [skip, setSkip] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const [events, setEvents] = useState([])
  const [eventCursor, setEventCursor] = useState(null)
  const [hasMoreEvents, setHasMoreEvents] = useState(false)
  const [isLoadingOlderEvents, setIsLoadingOlderEvents] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [selectedQuestionKey, setSelectedQuestionKey] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const historyRequestSequence = useRef(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      getActivity(courseId, sectionId, activityId, { signal: controller.signal }),
      getActivityStatistics(activityId, { signal: controller.signal }),
      getActivityAttempts(activityId, { limit: 50, skip: 0, signal: controller.signal }),
    ]).then(([courseData, sections, activityData, stats, attemptData]) => {
      if (controller.signal.aborted) return
      const currentSection = sections.find(item => item._id === sectionId)
      if (!currentSection) throw new Error('No se encontró la sección de esta actividad.')
      setCourse(courseData)
      setSection(currentSection)
      setActivity(activityData)
      setStatistics(stats)
      setAttempts(attemptData.intentos)
      setTotalAttempts(attemptData.total)
      setSkip(attemptData.intentos.length)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar el seguimiento.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, activityId, reloadVersion])

  const studentsById = useMemo(
    () => new Map((statistics?.porAlumno ?? []).map(student => [String(student.alumnoId), student])),
    [statistics],
  )
  const studentsRankedByErrors = useMemo(
    () => (statistics?.porAlumno ?? [])
      .slice()
      .sort((left, right) =>
        (right.respuestasIncorrectas ?? 0) - (left.respuestasIncorrectas ?? 0)
        || (left.aciertosPrimerIntento ?? 0) - (right.aciertosPrimerIntento ?? 0)),
    [statistics],
  )
  const questionsByVersionAndId = useMemo(
    () => new Map((statistics?.porPregunta ?? []).map(question => [
      `${String(question.actividadVersionId)}:${String(question.ejercicioId)}`,
      question,
    ])),
    [statistics],
  )
  const questionKey = question => `${String(question.actividadVersionId)}:${String(question.ejercicioId)}`
  const questionsWithErrors = useMemo(
    () => (statistics?.porPregunta ?? [])
      .filter(question => (question.incorrectas ?? 0) > 0)
      .slice()
      .sort((left, right) =>
        (right.incorrectas ?? 0) - (left.incorrectas ?? 0)
        || (right.promedioErroresPorAlumno ?? 0) - (left.promedioErroresPorAlumno ?? 0)),
    [statistics],
  )
  const selectedDistributionQuestion = (statistics?.porPregunta ?? [])
    .find(question => questionKey(question) === selectedQuestionKey)
    ?? statistics?.porPregunta?.[0]
  const selectedOptionCount = selectedDistributionQuestion?.opciones
    ?.reduce((total, option) => total + (option.selecciones ?? 0), 0) ?? 0

  const reload = () => {
    setLoadError('')
    setIsLoading(true)
    setReloadVersion(value => value + 1)
  }

  const loadMoreAttempts = async () => {
    if (isLoadingMore || skip >= totalAttempts) return
    setIsLoadingMore(true)
    setLoadError('')
    try {
      const data = await getActivityAttempts(activityId, { limit: 50, skip })
      setAttempts(current => [...current, ...data.intentos])
      setSkip(skip + data.intentos.length)
      setTotalAttempts(data.total)
    } catch (error) {
      setLoadError(error.message || 'No se pudieron cargar más intentos.')
    } finally {
      setIsLoadingMore(false)
    }
  }

  const openHistory = async attempt => {
    const requestSequence = ++historyRequestSequence.current
    setSelectedAttempt(attempt)
    setEvents([])
    setEventCursor(null)
    setHasMoreEvents(false)
    setEventsError('')
    setIsLoadingEvents(true)
    try {
      const attemptEvents = await getActivityAttemptEvents(attempt._id, { limit: 200 })
      if (requestSequence !== historyRequestSequence.current) return
      setEvents(attemptEvents.slice().reverse())
      setEventCursor(attemptEvents.at(-1)?.fecha ?? null)
      setHasMoreEvents(attemptEvents.length === 200)
    } catch (error) {
      if (requestSequence === historyRequestSequence.current) {
        setEventsError(error.message || 'No se pudo cargar el historial del participante.')
      }
    } finally {
      if (requestSequence === historyRequestSequence.current) setIsLoadingEvents(false)
    }
  }

  const closeHistory = () => {
    historyRequestSequence.current += 1
    setSelectedAttempt(null)
    setEvents([])
    setEventCursor(null)
    setHasMoreEvents(false)
    setEventsError('')
  }

  const loadOlderEvents = async () => {
    if (!selectedAttempt || !eventCursor || isLoadingOlderEvents) return
    const requestSequence = historyRequestSequence.current
    setIsLoadingOlderEvents(true)
    setEventsError('')
    try {
      const olderEvents = await getActivityAttemptEvents(selectedAttempt._id, {
        limit: 200,
        before: eventCursor,
      })
      if (requestSequence !== historyRequestSequence.current) return
      setEvents(current => [...olderEvents.slice().reverse(), ...current])
      setEventCursor(olderEvents.at(-1)?.fecha ?? null)
      setHasMoreEvents(olderEvents.length === 200)
    } catch (error) {
      if (requestSequence === historyRequestSequence.current) {
        setEventsError(error.message || 'No se pudieron cargar interacciones anteriores.')
      }
    } finally {
      if (requestSequence === historyRequestSequence.current) setIsLoadingOlderEvents(false)
    }
  }

  const student = selectedAttempt ? studentsById.get(String(selectedAttempt.alumno)) : null
  const participantName = selectedAttempt
    ? getStudentDisplayName(selectedAttempt.estudiante ?? student?.estudiante)
    : ''

  return (
    <DashboardLayout eyebrow="Seguimiento de actividades">
      <section className="teacher-section-page teacher-tone-blue activity-tracking-page" aria-labelledby="activity-tracking-title">
        <Link
          to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities`}
          className="teacher-back-link"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a actividades
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando seguimiento…
          </div>
        )}
        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
            <Button variant="outline-secondary" onClick={reload}>Reintentar</Button>
          </Alert>
        )}

        {!isLoading && !loadError && course && section && activity && statistics && (
          <>
            <header className="activity-tracking-heading">
              <div>
                <p className="teacher-eyebrow">{course.curso} · {section.nombre} · Seguimiento</p>
                <h1 id="activity-tracking-title"><MathContent content={activity.titulo} inline /></h1>
                <p>Revisá el avance de los participantes y sus interacciones.</p>
              </div>
              <Link
                className="btn btn-outline-primary"
                to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/${encodeURIComponent(activityId)}/edit`}
              >
                Editar actividad
              </Link>
            </header>

            <section className="activity-tracking-summary" aria-label="Resumen de seguimiento">
              <article><span>Participantes</span><strong>{statistics.alumnosUnicos ?? 0}</strong></article>
              <article><span>Intentos totales</span><strong>{statistics.totalIntentos ?? 0}</strong></article>
              <article><span>Intentos en progreso</span><strong>{statistics.intentosEnProgreso ?? 0}</strong></article>
              <article><span>Actividades completadas</span><strong>{statistics.actividadesFinalizadas ?? 0}</strong></article>
              <article><span>Abandonos explícitos</span><strong>{statistics.actividadesAbandonadas ?? 0}</strong></article>
              <article><span>Respuestas enviadas</span><strong>{statistics.respuestasEnviadas ?? 0}</strong></article>
              <article><span>Respuestas correctas</span><strong>{statistics.respuestasCorrectas ?? 0}</strong></article>
              <article><span>Respuestas incorrectas</span><strong>{statistics.respuestasIncorrectas ?? 0}</strong></article>
              <article><span>Aciertos al primer intento</span><strong>{statistics.aciertosPrimerIntento ?? 0}</strong></article>
            </section>

            <section className="activity-tracking-panel" aria-labelledby="activity-question-stats-title">
              <div className="activity-tracking-section-heading">
                <div>
                  <h2 id="activity-question-stats-title">Resultados por pregunta</h2>
                  <p>Datos acumulados de los intentos registrados por el servidor.</p>
                </div>
              </div>
              {statistics.porPregunta.length === 0 ? (
                <p className="activity-tracking-empty">Todavía no hay respuestas para mostrar.</p>
              ) : (
                <div className="table-responsive">
                  <Table hover className="activity-tracking-table" responsive="md">
                    <thead>
                      <tr>
                        <th>Pregunta</th>
                        <th>Respuestas</th>
                        <th>Correctas</th>
                        <th>Incorrectas</th>
                        <th>Al primer intento</th>
                        <th>Participantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statistics.porPregunta.map((item, index) => {
                        return (
                          <tr key={questionKey(item)}>
                            <th scope="row">
                              <span>
                                {item.numeroVersion > 1 ? `Versión ${item.numeroVersion} · ` : ''}
                                Pregunta {index + 1}
                              </span>
                              <small>{item.pregunta}</small>
                            </th>
                            <td>{item.respuestas ?? item.intentos ?? 0}</td>
                            <td>{item.correctas}</td>
                            <td>{item.incorrectas}</td>
                            <td>
                              {item.porcentajeAciertoPrimerIntento ?? 0}% de {item.alumnosUnicos ?? 0} participantes
                            </td>
                            <td>{item.alumnosUnicos}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </section>

            <section className="activity-tracking-panel" aria-labelledby="activity-difficulty-title">
              <div className="activity-tracking-section-heading">
                <div>
                  <h2 id="activity-difficulty-title">Preguntas con más dificultades</h2>
                  <p>Ordenadas por respuestas incorrectas; los datos corresponden a toda la actividad.</p>
                </div>
              </div>
              {questionsWithErrors.length === 0 ? (
                <p className="activity-tracking-empty">Todavía no hay errores registrados en las preguntas.</p>
              ) : (
                <div className="activity-difficulty-list">
                  {questionsWithErrors.map(question => {
                    const index = statistics.porPregunta.indexOf(question)
                    return (
                      <article className="activity-difficulty-card" key={questionKey(question)}>
                        <div>
                          <span className="activity-difficulty-label">
                            {question.numeroVersion > 1 ? `Versión ${question.numeroVersion} · ` : ''}
                            Pregunta {index + 1}
                          </span>
                          <h3><MathContent content={question.pregunta} inline /></h3>
                        </div>
                        <dl>
                          <div><dt>Respuestas incorrectas</dt><dd>{question.incorrectas ?? 0}</dd></div>
                          <div><dt>Participantes</dt><dd>{question.alumnosUnicos ?? 0}</dd></div>
                          <div>
                            <dt>Acierto al primer intento</dt>
                            <dd>{question.porcentajeAciertoPrimerIntento ?? 0}% de {question.alumnosUnicos ?? 0} participantes</dd>
                          </div>
                          <div><dt>Promedio de errores por estudiante</dt><dd>{question.promedioErroresPorAlumno ?? 0}</dd></div>
                        </dl>
                        <Button
                          as="a"
                          href="#activity-option-distribution"
                          size="sm"
                          variant="outline-primary"
                          onClick={() => setSelectedQuestionKey(questionKey(question))}
                          aria-label={`Ver distribución de respuestas de la pregunta ${index + 1}`}
                        >
                          Ver opciones elegidas
                        </Button>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>

            <section
              className="activity-tracking-panel"
              id="activity-option-distribution"
              aria-labelledby="activity-option-distribution-title"
            >
              <div className="activity-tracking-section-heading">
                <div>
                  <h2 id="activity-option-distribution-title">Distribución de respuestas</h2>
                  <p>Conteo de selecciones registradas, incluidos los reintentos; no equivale a estudiantes únicos.</p>
                </div>
              </div>
              {statistics.porPregunta.length === 0 ? (
                <p className="activity-tracking-empty">La distribución estará disponible cuando haya preguntas con respuestas.</p>
              ) : (
                <>
                  <Form.Group className="activity-distribution-select">
                    <Form.Label htmlFor="activity-distribution-question">Pregunta</Form.Label>
                    <Form.Select
                      id="activity-distribution-question"
                      value={selectedDistributionQuestion ? questionKey(selectedDistributionQuestion) : ''}
                      onChange={event => setSelectedQuestionKey(event.target.value)}
                    >
                      {statistics.porPregunta.map((question, index) => (
                        <option key={questionKey(question)} value={questionKey(question)}>
                          {question.numeroVersion > 1 ? `Versión ${question.numeroVersion} · ` : ''}
                          Pregunta {index + 1}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  {selectedDistributionQuestion && (
                    <div className="activity-option-distribution">
                      <h3><MathContent content={selectedDistributionQuestion.pregunta} inline /></h3>
                      <p>
                        Participantes que respondieron: {selectedDistributionQuestion.alumnosUnicos ?? 0}.
                        {' '}Selecciones totales: {selectedOptionCount}.
                      </p>
                      {(selectedDistributionQuestion.opciones ?? []).length === 0 ? (
                        <p className="activity-tracking-empty">El servidor no devolvió opciones para esta pregunta.</p>
                      ) : (
                        <div className="activity-option-bars" role="group" aria-label="Selecciones por opción">
                          {selectedDistributionQuestion.opciones.map(option => {
                            const selections = option.selecciones ?? 0
                            const width = selectedOptionCount
                              ? (selections / selectedOptionCount) * 100
                              : 0
                            return (
                              <div className="activity-option-bar-row" key={String(option.opcionId)}>
                                <div className="activity-option-bar-label">
                                  <span>
                                    <MathContent content={option.texto} inline />
                                    {option.correcta ? ' · Correcta' : ''}
                                  </span>
                                  <strong>{selections} {selections === 1 ? 'selección' : 'selecciones'}</strong>
                                </div>
                                <div
                                  className={`activity-option-bar-track${option.correcta ? ' is-correct' : ''}`}
                                  role="meter"
                                  aria-label={`${option.texto}${option.correcta ? ', respuesta correcta' : ''}: ${selections} de ${selectedOptionCount} selecciones`}
                                  aria-valuemin={0}
                                  aria-valuemax={selectedOptionCount || 1}
                                  aria-valuenow={selections}
                                >
                                  <span style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>

            <section className="activity-tracking-panel" aria-labelledby="activity-participants-title">
              <div className="activity-tracking-section-heading">
                <div>
                  <h2 id="activity-participants-title">Participantes e intentos</h2>
                  <p>Identidad proporcionada por el backend. Los alumnos con más respuestas incorrectas aparecen primero.</p>
                </div>
                <span>{statistics.alumnosUnicos ?? 0}</span>
              </div>
              {statistics.porAlumno.length === 0 && attempts.length === 0 && (
                <p className="activity-tracking-empty">Todavía no hay alumnos participantes en esta actividad.</p>
              )}
              {statistics.porAlumno.length > 0 && (
                <div className="table-responsive">
                  <Table hover className="activity-tracking-table">
                    <thead>
                      <tr>
                        <th>Participante</th>
                        <th>Intentos</th>
                        <th>En progreso</th>
                        <th>Completados</th>
                        <th>Abandonados</th>
                        <th>Correctas</th>
                        <th>Incorrectas</th>
                        <th>Primer intento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentsRankedByErrors.map(item => (
                        <tr key={String(item.alumnoId)}>
                          <th scope="row">{getStudentDisplayName(item.estudiante)}</th>
                          <td>{item.intentos}</td>
                          <td>{item.enProgreso}</td>
                          <td>{item.completados}</td>
                          <td>{item.abandonados}</td>
                          <td>{item.respuestasCorrectas}</td>
                          <td>{item.respuestasIncorrectas}</td>
                          <td>{item.aciertosPrimerIntento}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
              {attempts.length === 0 ? (
                <p className="activity-tracking-empty">Todavía no hay intentos iniciados.</p>
              ) : (
                <div className="activity-attempt-list">
                  {attempts.map(attempt => {
                    return (
                      <article className="activity-attempt-row" key={attempt._id}>
                        <div className="activity-attempt-student-icon" aria-hidden="true">
                          <i className="bi bi-person-circle" />
                        </div>
                        <div className="activity-attempt-details">
                          <strong>
                            {getStudentDisplayName(attempt.estudiante ?? studentsById.get(String(attempt.alumno))?.estudiante)}
                          </strong>
                          <span className={`activity-attempt-state state-${attempt.estado}`}>
                            {stateLabels[attempt.estado] ?? 'Estado no disponible'}
                          </span>
                          <small>
                            {attempt.estadisticas?.respuestasCorrectas ?? 0}
                            {' '}
                            {(attempt.estadisticas?.respuestasCorrectas ?? 0) === 1 ? 'correcta' : 'correctas'}
                            {' · '}
                            {attempt.estadisticas?.respuestasIncorrectas ?? 0}
                            {' '}
                            {(attempt.estadisticas?.respuestasIncorrectas ?? 0) === 1 ? 'incorrecta' : 'incorrectas'}
                            {' · '}
                            {attempt.estadisticas?.aciertosPrimerIntento ?? 0}
                            {' '}
                            {(attempt.estadisticas?.aciertosPrimerIntento ?? 0) === 1 ? 'acierto al' : 'aciertos al'}
                            {' primer intento'}
                          </small>
                        </div>
                        <div className="activity-attempt-meta">
                          <span>Iniciado {attempt.iniciadoEn ? new Date(attempt.iniciadoEn).toLocaleString() : '—'}</span>
                          <Button size="sm" variant="outline-primary" onClick={() => openHistory(attempt)}>
                            Ver interacciones
                          </Button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
              {skip < totalAttempts && (
                <Button className="mt-3" disabled={isLoadingMore} onClick={loadMoreAttempts} variant="outline-secondary">
                  {isLoadingMore
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Cargando…</>
                    : `Cargar más intentos (${attempts.length} de ${totalAttempts})`}
                </Button>
              )}
            </section>
          </>
        )}

        <Modal show={Boolean(selectedAttempt)} onHide={closeHistory} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Interacciones de {participantName}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {student && (
              <p className="activity-history-summary">
                {student.completados} completados · {student.enProgreso} en progreso · {student.abandonados} abandonados
              </p>
            )}
            {isLoadingEvents && (
              <div className="teacher-courses-loading" role="status">
                <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando interacciones…
              </div>
            )}
            {eventsError && (
              <Alert variant="danger" role="alert">
                <p>{eventsError}</p>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  onClick={() => hasMoreEvents ? loadOlderEvents() : openHistory(selectedAttempt)}
                >
                  Reintentar
                </Button>
              </Alert>
            )}
            {!isLoadingEvents && !eventsError && events.length === 0 && (
              <p className="activity-tracking-empty">No hay interacciones registradas en este intento.</p>
            )}
            {!isLoadingEvents && events.length > 0 && (
              <ol className="activity-history-timeline">
                {events.map((event, index) => {
                  const matchedQuestion = event.ejercicio
                    ? questionsByVersionAndId.get(`${String(event.actividadVersion)}:${String(event.ejercicio)}`)
                    : null
                  const selectedOption = matchedQuestion?.opciones
                    ?.find(option => String(option.opcionId) === String(event.opcionSeleccionada))
                  return (
                    <li key={event._id ?? `${event.tipo}-${event.fecha}-${index}`}>
                      <span className="activity-history-marker" aria-hidden="true" />
                      <div>
                        <strong>{eventLabels[event.tipo] ?? 'Interacción registrada'}</strong>
                        {event.ejercicio && (
                          <p>
                            {matchedQuestion ? (
                              <>Pregunta: <MathContent content={matchedQuestion.pregunta} inline /></>
                            ) : 'Pregunta de una versión anterior de la actividad'}
                          </p>
                        )}
                        {selectedOption && (
                        <p>Opción elegida: <MathContent content={selectedOption.texto} inline /></p>
                        )}
                        {event.respuestaApi?.retroalimentacion?.mensaje && (
                        <MathContent
                          className="activity-history-feedback"
                          content={event.respuestaApi.retroalimentacion.mensaje}
                        />
                        )}
                        {event.numeroIntentoPregunta && <p>Intento {event.numeroIntentoPregunta} de esta pregunta</p>}
                        <time dateTime={event.fecha}>{event.fecha ? new Date(event.fecha).toLocaleString() : 'Fecha no disponible'}</time>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
            {hasMoreEvents && (
              <Alert className="mt-3 mb-0" variant="info">
                Se cargaron hasta 200 interacciones por página, según el límite del servidor.
                <Button
                  className="ms-2"
                  disabled={isLoadingOlderEvents}
                  onClick={loadOlderEvents}
                  size="sm"
                  variant="outline-primary"
                >
                  {isLoadingOlderEvents
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Cargando…</>
                    : 'Cargar interacciones anteriores'}
                </Button>
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeHistory}>Cerrar</Button>
          </Modal.Footer>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default TeacherActivityTrackingPage
