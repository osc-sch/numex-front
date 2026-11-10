import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import ActivityGeneratorModal from '../components/ActivityGeneratorModal'
import DashboardLayout from '../components/DashboardLayout'
import { createActivity, getActivity, updateActivity as updateActivityRequest } from '../services/activities'
import { getCourse, getCourseSections } from '../services/courses'
import { toActivityDraft } from '../utils/activityGenerator'

let temporaryIdSequence = 0
const temporaryId = () => `new-${Date.now()}-${temporaryIdSequence++}`
const emptyActivity = () => ({ titulo: '', descripcion: '', estado: 'borrador', ejercicios: [] })

function activityToDraft(activity) {
  return {
    titulo: activity.titulo ?? '',
    descripcion: activity.descripcion ?? '',
    estado: activity.estado ?? 'borrador',
    ejercicios: (activity.ejercicios ?? []).map(exercise => ({
      clientId: temporaryId(),
      _id: exercise._id,
      tipo: exercise.tipo ?? 'opcion_unica',
      enunciado: exercise.enunciado ?? '',
      explicacionGeneral: exercise.explicacionGeneral ?? '',
      opciones: (exercise.opciones ?? []).map(option => ({
        clientId: temporaryId(),
        _id: option._id,
        texto: option.texto ?? '',
        pista: option.pista ?? '',
        explicacionError: option.explicacionError ?? '',
      })),
      correctOptionId: exercise.opciones?.find(option => option._id === exercise.respuestaCorrecta)?._id ?? null,
    })),
  }
}

function exerciseIsValid(exercise) {
  return Boolean(
    exercise.enunciado.trim()
    && exercise.enunciado.length <= 10000
    && exercise.explicacionGeneral.length <= 5000
    && exercise.opciones.length >= 2
    && exercise.opciones.every(option =>
      option.texto.trim()
      && option.texto.length <= 2000
      && option.pista.length <= 2000
      && option.explicacionError.length <= 5000)
    && exercise.opciones.some(option => option.clientId === exercise.correctOptionId),
  )
}

function buildExercises(exercises) {
  return exercises.map(exercise => ({
    ...(exercise._id ? { _id: exercise._id } : {}),
    tipo: exercise.tipo,
    enunciado: exercise.enunciado.trim(),
    explicacionGeneral: exercise.explicacionGeneral.trim(),
    opciones: exercise.opciones.map(option => ({
      ...(option._id ? { _id: option._id } : {}),
      texto: option.texto.trim(),
      pista: option.pista.trim(),
      explicacionError: option.explicacionError.trim(),
    })),
    indiceCorrecta: exercise.opciones.findIndex(option => option.clientId === exercise.correctOptionId),
  }))
}

function MultipleChoiceEditor({ exercise, index, exerciseCount, error, onChange, onDelete, onDuplicate, onMove }) {
  const updateExercise = changes => onChange({ ...exercise, ...changes })
  const updateOption = (optionId, changes) => updateExercise({
    opciones: exercise.opciones.map(option => option.clientId === optionId ? { ...option, ...changes } : option),
  })

  const addOption = () => updateExercise({
    opciones: [...exercise.opciones, { clientId: temporaryId(), texto: '', pista: '', explicacionError: '' }],
  })

  const deleteOption = optionId => updateExercise({
    opciones: exercise.opciones.filter(option => option.clientId !== optionId),
    correctOptionId: exercise.correctOptionId === optionId ? null : exercise.correctOptionId,
  })

  const moveOption = (optionIndex, direction) => {
    const targetIndex = optionIndex + direction
    if (targetIndex < 0 || targetIndex >= exercise.opciones.length) return
    const opciones = [...exercise.opciones]
    ;[opciones[optionIndex], opciones[targetIndex]] = [opciones[targetIndex], opciones[optionIndex]]
    updateExercise({ opciones })
  }

  return (
    <article className="activity-question-editor">
      <header className="activity-question-editor-header">
        <div>
          <span className="activity-question-number">Pregunta {index + 1}</span>
          <span className="activity-exercise-type"><i className="bi bi-ui-radios" aria-hidden="true" /> Selección única</span>
        </div>
        <div className="activity-question-actions">
          <Button aria-label={`Subir pregunta ${index + 1}`} disabled={index === 0} onClick={() => onMove(-1)} size="sm" variant="outline-secondary">
            <i className="bi bi-arrow-up" aria-hidden="true" />
          </Button>
          <Button aria-label={`Bajar pregunta ${index + 1}`} disabled={index === exerciseCount - 1} onClick={() => onMove(1)} size="sm" variant="outline-secondary">
            <i className="bi bi-arrow-down" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <Form.Group className="mb-3" controlId={`question-${exercise.clientId}`}>
        <Form.Label>Enunciado</Form.Label>
        <Form.Control
          as="textarea"
          isInvalid={Boolean(error?.enunciado)}
          maxLength={10000}
          onChange={event => updateExercise({ enunciado: event.target.value })}
          placeholder="Escribí la pregunta"
          rows={2}
          value={exercise.enunciado}
        />
        <Form.Control.Feedback type="invalid">{error?.enunciado}</Form.Control.Feedback>
      </Form.Group>

      <Form.Group controlId={`explanation-${exercise.clientId}`}>
        <Form.Label>Explicación general <span className="activity-optional-label">(opcional)</span></Form.Label>
        <Form.Control
      as="textarea"
      isInvalid={Boolean(error?.explicacionGeneral)}
      maxLength={5000}
      onChange={event => updateExercise({ explicacionGeneral: event.target.value })}
      placeholder="Podés agregar una explicación para mostrar cuando respondan correctamente"
      rows={2}
      value={exercise.explicacionGeneral}
        />
        <Form.Control.Feedback type="invalid">{error?.explicacionGeneral}</Form.Control.Feedback>
      </Form.Group>

      <fieldset className="activity-options-fieldset">
        <legend>Opciones de respuesta</legend>
        {exercise.opciones.map((option, optionIndex) => (
          <div className="activity-option-editor" key={option.clientId}>
            <Form.Check
              aria-label={`Marcar opción ${optionIndex + 1} como correcta`}
              checked={exercise.correctOptionId === option.clientId}
              label={exercise.correctOptionId === option.clientId ? 'Correcta' : 'Marcar correcta'}
              name={`correct-${exercise.clientId}`}
              onChange={() => updateExercise({ correctOptionId: option.clientId })}
              type="radio"
            />
            <Form.Control
              aria-label={`Texto de la opción ${optionIndex + 1}`}
              isInvalid={Boolean(error?.options?.[option.clientId]?.texto)}
              maxLength={2000}
              onChange={event => updateOption(option.clientId, { texto: event.target.value })}
              placeholder={`Opción ${optionIndex + 1}`}
              value={option.texto}
            />
            <Form.Control
              aria-label={`Pista para la opción ${optionIndex + 1} si es incorrecta`}
              as="textarea"
              className="activity-option-feedback"
              isInvalid={Boolean(error?.options?.[option.clientId]?.pista)}
              maxLength={2000}
              onChange={event => updateOption(option.clientId, { pista: event.target.value })}
              placeholder="Pista breve tras el primer error"
              rows={2}
              value={option.pista}
            />
            <Form.Control
              aria-label={`Explicación para la opción ${optionIndex + 1} si es incorrecta`}
              as="textarea"
              className="activity-option-feedback"
              isInvalid={Boolean(error?.options?.[option.clientId]?.explicacionError)}
              maxLength={5000}
              onChange={event => updateOption(option.clientId, { explicacionError: event.target.value })}
              placeholder="Explicación más detallada tras errores posteriores"
              rows={2}
              value={option.explicacionError}
            />
            <div className="activity-option-actions">
              <Button
                aria-label={`Subir opción ${optionIndex + 1}`}
                disabled={optionIndex === 0}
                onClick={() => moveOption(optionIndex, -1)}
                size="sm"
                variant="outline-secondary"
              >
                <i className="bi bi-arrow-up" aria-hidden="true" />
              </Button>
              <Button
                aria-label={`Bajar opción ${optionIndex + 1}`}
                disabled={optionIndex === exercise.opciones.length - 1}
                onClick={() => moveOption(optionIndex, 1)}
                size="sm"
                variant="outline-secondary"
              >
                <i className="bi bi-arrow-down" aria-hidden="true" />
              </Button>
              <Button
                aria-label={`Eliminar opción ${optionIndex + 1}`}
                onClick={() => deleteOption(option.clientId)}
                size="sm"
                variant="outline-danger"
              >
                <i className="bi bi-trash" aria-hidden="true" />
              </Button>
            </div>
            {error?.options?.[option.clientId]?.texto && (
              <span className="activity-field-error">{error.options[option.clientId].texto}</span>
            )}
            {error?.options?.[option.clientId]?.pista && (
              <span className="activity-field-error">{error.options[option.clientId].pista}</span>
            )}
            {error?.options?.[option.clientId]?.explicacionError && (
              <span className="activity-field-error">{error.options[option.clientId].explicacionError}</span>
            )}
          </div>
        ))}
        {error?.optionsCount && <p className="activity-field-error">{error.optionsCount}</p>}
        {error?.correct && <p className="activity-field-error">{error.correct}</p>}
        <Button className="mt-2" onClick={addOption} size="sm" variant="outline-primary">
          <i className="bi bi-plus-lg" aria-hidden="true" /> Agregar opción
        </Button>
      </fieldset>

      <footer className="activity-question-editor-footer">
        <Button onClick={onDuplicate} size="sm" variant="outline-secondary">
          <i className="bi bi-copy" aria-hidden="true" /> Duplicar pregunta
        </Button>
        <Button onClick={onDelete} size="sm" variant="outline-danger">
          <i className="bi bi-trash" aria-hidden="true" /> Eliminar pregunta
        </Button>
      </footer>
    </article>
  )
}

function UnsupportedExerciseEditor({ exercise, onDelete }) {
  return (
    <article className="activity-question-editor">
      <Alert className="mb-0" variant="warning">
        Este tipo de ejercicio todavía no se puede editar en esta versión.
      </Alert>
      <Button className="justify-self-start" onClick={onDelete} size="sm" variant="outline-danger">
        <i className="bi bi-trash" aria-hidden="true" /> Eliminar ejercicio
      </Button>
      <span className="visually-hidden">Tipo de ejercicio: {exercise.tipo}</span>
    </article>
  )
}

function TeacherActivityEditorPage() {
  const { courseId, sectionId, activityId } = useParams()
  return (
    <ActivityEditor
      key={`${courseId}:${sectionId}:${activityId ?? 'new'}`}
      courseId={courseId}
      sectionId={sectionId}
      activityId={activityId}
    />
  )
}

function ActivityEditor({ courseId, sectionId, activityId }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [activity, setActivity] = useState(emptyActivity)
  const [baseline, setBaseline] = useState('')
  const [errors, setErrors] = useState({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [notice, setNotice] = useState(location.state?.notice ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const submitting = useRef(false)
  const restoringHistory = useRef(false)
  const dirty = useMemo(() => JSON.stringify(activity) !== baseline, [activity, baseline])
  const dirtyRef = useRef(false)
  const cancelUrl = `/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities`
  const unsavedDraft = location.state?.unsavedDraft

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    const controller = new AbortController()
    const requests = [
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      ...(activityId ? [getActivity(courseId, sectionId, activityId, { signal: controller.signal })] : []),
    ]
    Promise.all(requests).then(([courseData, sections, loadedActivity]) => {
      if (controller.signal.aborted) return
      const currentSection = sections.find(item => item._id === sectionId)
      if (!currentSection) throw new Error('No se encontró la sección de este curso.')
      const persistedDraft = loadedActivity ? activityToDraft(loadedActivity) : emptyActivity()
      const initialActivity = loadedActivity && unsavedDraft
        ? {
          ...unsavedDraft,
          titulo: loadedActivity.titulo,
          descripcion: loadedActivity.descripcion,
          estado: loadedActivity.estado,
        }
        : persistedDraft
      setCourse(courseData)
      setSection(currentSection)
      setActivity(initialActivity)
      setBaseline(JSON.stringify(persistedDraft))
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar el editor.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, activityId, unsavedDraft])

  useEffect(() => {
    const onBeforeUnload = event => {
      if (!dirtyRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const onInternalNavigation = event => {
      if (!dirtyRef.current || !(event.target instanceof Element)) return
      const link = event.target.closest('a[href]')
      const navigationButton = event.target.closest('nav[aria-label="Navegación principal"] button, button[aria-label^="Cerrar sesión"]')
      if ((!link || link.target === '_blank') && !navigationButton) return
      if (link) {
        const destination = new URL(link.href, window.location.href)
        if (destination.origin !== window.location.origin || destination.pathname === location.pathname) return
      }
      if (!window.confirm('Tenés cambios sin guardar. ¿Querés salir del editor y descartarlos?')) {
        event.preventDefault()
        event.stopImmediatePropagation()
        return
      }
      dirtyRef.current = false
    }
    const onHistoryNavigation = event => {
      if (restoringHistory.current) {
        restoringHistory.current = false
        return
      }
      if (!dirtyRef.current) return
      if (window.confirm('Tenés cambios sin guardar. ¿Querés salir del editor y descartarlos?')) {
        dirtyRef.current = false
        return
      }
      event.stopImmediatePropagation()
      restoringHistory.current = true
      window.history.forward()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('popstate', onHistoryNavigation, true)
    document.addEventListener('click', onInternalNavigation, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onHistoryNavigation, true)
      document.removeEventListener('click', onInternalNavigation, true)
    }
  }, [location.pathname])

  const updateActivity = changes => {
    setActivity(current => ({ ...current, ...changes }))
    setErrors({})
    setSaveError('')
  }

  const importGeneratedActivity = generated => {
    const hasExistingContent = Boolean(
      activity.titulo.trim()
      || activity.descripcion.trim()
      || activity.ejercicios.length,
    )
    if (
      hasExistingContent
      && !window.confirm('La respuesta de la IA reemplazará el título, la descripción y las preguntas actuales. ¿Querés continuar?')
    ) return false

    const draft = toActivityDraft(generated, temporaryId)
    updateActivity({
      titulo: draft.titulo.slice(0, 150),
      descripcion: draft.descripcion.slice(0, 5000),
      ejercicios: draft.ejercicios,
    })
    setNotice('La actividad generada se cargó como borrador. Revisá las preguntas y respuestas antes de guardar o publicar.')
    return true
  }

  const addExercise = () => {
    setActivity(current => ({
      ...current,
      ejercicios: [...current.ejercicios, {
        clientId: temporaryId(),
        tipo: 'opcion_unica',
        enunciado: '',
        explicacionGeneral: '',
        opciones: [
          { clientId: temporaryId(), texto: '', pista: '', explicacionError: '' },
          { clientId: temporaryId(), texto: '', pista: '', explicacionError: '' },
        ],
        correctOptionId: null,
      }],
    }))
    setErrors({})
  }

  const updateExercise = (exerciseId, changes) => {
    setActivity(current => ({
      ...current,
      ejercicios: current.ejercicios.map(exercise => exercise.clientId === exerciseId ? changes : exercise),
    }))
    setErrors(current => {
      const next = { ...current }
      delete next[exerciseId]
      return next
    })
  }

  const moveExercise = (index, direction) => {
    const targetIndex = index + direction
    setActivity(current => {
      if (targetIndex < 0 || targetIndex >= current.ejercicios.length) return current
      const ejercicios = [...current.ejercicios]
      ;[ejercicios[index], ejercicios[targetIndex]] = [ejercicios[targetIndex], ejercicios[index]]
      return { ...current, ejercicios }
    })
  }

  const duplicateExercise = exercise => {
    const clonedOptions = exercise.opciones.map(option => ({ clientId: temporaryId(), texto: option.texto }))
    const correctIndex = exercise.opciones.findIndex(option => option.clientId === exercise.correctOptionId)
    const clone = {
      clientId: temporaryId(),
      tipo: exercise.tipo,
      enunciado: exercise.enunciado,
      explicacionGeneral: exercise.explicacionGeneral,
      opciones: clonedOptions.map((option, index) => ({
        ...option,
        pista: exercise.opciones[index].pista,
        explicacionError: exercise.opciones[index].explicacionError,
      })),
      correctOptionId: correctIndex >= 0 ? clonedOptions[correctIndex].clientId : null,
    }
    setActivity(current => {
      const index = current.ejercicios.findIndex(item => item.clientId === exercise.clientId)
      const ejercicios = [...current.ejercicios]
      ejercicios.splice(index + 1, 0, clone)
      return { ...current, ejercicios }
    })
  }

  const validateForPublish = () => {
    const nextErrors = {}
    if (!activity.titulo.trim()) nextErrors.titulo = 'Ingresá el título de la actividad.'
    else if (activity.titulo.trim().length > 150) nextErrors.titulo = 'El título no puede superar los 150 caracteres.'
    if (activity.descripcion.length > 5000) nextErrors.descripcion = 'La descripción no puede superar los 5000 caracteres.'
    if (!activity.ejercicios.length) nextErrors.ejercicios = 'Agregá al menos una pregunta para publicar.'

    activity.ejercicios.forEach(exercise => {
      const exerciseErrors = {}
      if (!exercise.enunciado.trim()) exerciseErrors.enunciado = 'Escribí el enunciado de la pregunta.'
      else if (exercise.enunciado.length > 10000) exerciseErrors.enunciado = 'El enunciado supera los 10000 caracteres.'
      if (exercise.explicacionGeneral.length > 5000) {
        exerciseErrors.explicacionGeneral = 'La explicación general no puede superar los 5000 caracteres.'
      }
      if (exercise.opciones.length < 2) exerciseErrors.optionsCount = 'Agregá al menos dos opciones.'
      const optionErrors = {}
      exercise.opciones.forEach(option => {
        const optionError = {}
        if (!option.texto.trim()) optionError.texto = 'Escribí el texto de la opción.'
        else if (option.texto.length > 2000) optionError.texto = 'La opción supera los 2000 caracteres.'
        if (option.pista.length > 2000) optionError.pista = 'La pista no puede superar los 2000 caracteres.'
        if (option.explicacionError.length > 5000) {
          optionError.explicacionError = 'La explicación no puede superar los 5000 caracteres.'
        }
        if (Object.keys(optionError).length) optionErrors[option.clientId] = optionError
      })
      if (Object.keys(optionErrors).length) exerciseErrors.options = optionErrors
      if (!exercise.opciones.some(option => option.clientId === exercise.correctOptionId)) {
        exerciseErrors.correct = 'Marcá una opción como correcta.'
      }
      if (Object.keys(exerciseErrors).length) nextErrors[exercise.clientId] = exerciseErrors
    })

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSave = async state => {
    if (submitting.current) return
    if (!activity.titulo.trim()) {
      setErrors({ titulo: 'Ingresá el título de la actividad.' })
      return
    }
    if (activity.titulo.trim().length > 150 || activity.descripcion.length > 5000) {
      setErrors({
        ...(activity.titulo.trim().length > 150 ? { titulo: 'El título no puede superar los 150 caracteres.' } : {}),
        ...(activity.descripcion.length > 5000 ? { descripcion: 'La descripción no puede superar los 5000 caracteres.' } : {}),
      })
      return
    }
    if (state === 'publicado' && !validateForPublish()) return

    const exercisesAreValid = activity.ejercicios.every(exerciseIsValid)
    if (state === 'borrador' && activity.ejercicios.length > 0 && !exercisesAreValid) {
      setNotice('El borrador guardará el título y la descripción. Para guardar preguntas, completá todas sus opciones y respuestas correctas.')
    } else {
      setNotice('')
    }

    const payload = {
      titulo: activity.titulo.trim(),
      descripcion: activity.descripcion.trim(),
      estado: state,
      ...(exercisesAreValid ? { ejercicios: buildExercises(activity.ejercicios) } : {}),
    }
    submitting.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      const saved = activityId
        ? await updateActivityRequest(courseId, sectionId, activityId, payload)
        : await createActivity(courseId, sectionId, payload)
      dirtyRef.current = false
      navigate(cancelUrl, {
        replace: true,
        state: {
          notice: exercisesAreValid
            ? `La actividad “${saved.titulo}” se ${state === 'publicado' ? 'publicó' : 'guardó'} correctamente.`
            : `El borrador “${saved.titulo}” se guardó, pero las preguntas incompletas no se conservaron. Completalas y volvé a guardarlas.`,
        },
      })
    } catch (error) {
      setSaveError(error.message || 'No se pudo guardar la actividad.')
    } finally {
      submitting.current = false
      setIsSaving(false)
    }
  }

  const cancel = () => {
    if (dirty && !window.confirm('Tenés cambios sin guardar. ¿Querés salir del editor y descartarlos?')) return
    dirtyRef.current = false
    navigate(cancelUrl)
  }

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-blue activity-editor-page" aria-labelledby="activity-editor-title">
        <Link to={cancelUrl} className="teacher-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a actividades
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando editor…
          </div>
        )}
        {loadError && <Alert variant="danger" role="alert">{loadError}</Alert>}

        {!isLoading && !loadError && course && section && (
          <>
            <header className="activity-editor-heading">
              <div>
                <p className="teacher-eyebrow">{course.curso} · {section.nombre}</p>
                <h1 id="activity-editor-title">{activityId ? 'Editar actividad' : 'Crear actividad'}</h1>
              </div>
              <div className="activity-editor-heading-actions">
                <Button onClick={() => setShowGenerator(true)} variant="outline-primary">
                  <i className="bi bi-stars" aria-hidden="true" /> Crear con IA
                </Button>
                <span className={`activity-status-badge ${activity.estado === 'publicado' ? 'is-published' : ''}`}>
                  {activity.estado === 'publicado' ? 'Publicada' : 'Borrador'}
                </span>
              </div>
            </header>

            {notice && <Alert variant="success" role="status" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
            {saveError && <Alert variant="danger" role="alert">{saveError}</Alert>}

            <section className="activity-editor-metadata" aria-label="Datos de la actividad">
              <Form.Group className="mb-3" controlId="activityTitle">
                <Form.Label>Título</Form.Label>
                <Form.Control
                  autoFocus
                  isInvalid={Boolean(errors.titulo)}
                  maxLength={150}
                  onChange={event => updateActivity({ titulo: event.target.value })}
                  placeholder="Ej.: Repaso de matemática"
                  value={activity.titulo}
                />
                <Form.Control.Feedback type="invalid">{errors.titulo}</Form.Control.Feedback>
              </Form.Group>
              <Form.Group controlId="activityDescription">
                <Form.Label>Descripción <span className="activity-optional-label">(opcional)</span></Form.Label>
                <Form.Control
                  as="textarea"
                  isInvalid={Boolean(errors.descripcion)}
                  maxLength={5000}
                  onChange={event => updateActivity({ descripcion: event.target.value })}
                  placeholder="Contales a tus alumnos qué van a practicar"
                  rows={3}
                  value={activity.descripcion}
                />
                <Form.Control.Feedback type="invalid">{errors.descripcion}</Form.Control.Feedback>
              </Form.Group>
            </section>

            <div className="activity-exercises-heading">
              <div>
                <h2>Preguntas</h2>
                <p>Elegí una opción correcta en cada pregunta. Podés agregar tantas opciones como necesites.</p>
              </div>
              <span>{activity.ejercicios.length}</span>
            </div>

            {errors.ejercicios && <Alert variant="danger" role="alert">{errors.ejercicios}</Alert>}

            <div className="activity-question-list">
              {activity.ejercicios.map((exercise, index) => (
                exercise.tipo === 'opcion_unica' ? (
                  <MultipleChoiceEditor
                    error={errors[exercise.clientId]}
                    exercise={exercise}
                    exerciseCount={activity.ejercicios.length}
                    index={index}
                    key={exercise.clientId}
                    onChange={changes => updateExercise(exercise.clientId, changes)}
                    onDelete={() => updateActivity({
                      ejercicios: activity.ejercicios.filter(item => item.clientId !== exercise.clientId),
                    })}
                    onDuplicate={() => duplicateExercise(exercise)}
                    onMove={direction => moveExercise(index, direction)}
                  />
                ) : (
                  <UnsupportedExerciseEditor
                    exercise={exercise}
                    key={exercise.clientId}
                    onDelete={() => updateActivity({
                      ejercicios: activity.ejercicios.filter(item => item.clientId !== exercise.clientId),
                    })}
                  />
                )
              ))}
            </div>

            <Button className="activity-add-question" onClick={addExercise} variant="outline-primary">
              <i className="bi bi-plus-lg" aria-hidden="true" /> Agregar pregunta
            </Button>

            <footer className="activity-editor-footer">
              <div className="activity-editor-unsaved" aria-live="polite">
                {dirty && <span><i className="bi bi-circle-fill" aria-hidden="true" /> Cambios sin guardar</span>}
              </div>
              <div className="activity-editor-actions">
                <Button onClick={cancel} variant="outline-secondary" disabled={isSaving}>Cancelar</Button>
                <Button onClick={() => handleSave('borrador')} variant="outline-primary" disabled={isSaving}>
                  {isSaving
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Guardando…</>
                    : 'Guardar borrador'}
                </Button>
                <Button onClick={() => handleSave('publicado')} disabled={isSaving}>
                  {isSaving
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Publicando…</>
                    : activity.estado === 'publicado' ? 'Guardar y publicar' : 'Publicar actividad'}
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
      <ActivityGeneratorModal
        onHide={() => setShowGenerator(false)}
        onImport={importGeneratedActivity}
        show={showGenerator}
      />
    </DashboardLayout>
  )
}

export default TeacherActivityEditorPage
