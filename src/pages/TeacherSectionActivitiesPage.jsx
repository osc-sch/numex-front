import { useEffect, useState } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'
import { Link, useLocation, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MathContent from '../components/MathContent'
import { deleteActivity, getActivities } from '../services/activities'
import { getCourse, getCourseSections } from '../services/courses'

function TeacherSectionActivitiesPage() {
  const { courseId, sectionId } = useParams()
  return <SectionActivities key={`${courseId}:${sectionId}`} courseId={courseId} sectionId={sectionId} />
}

function SectionActivities({ courseId, sectionId }) {
  const location = useLocation()
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [activityToDelete, setActivityToDelete] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState(location.state?.notice ?? '')

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      getActivities(courseId, sectionId, { signal: controller.signal }),
    ]).then(([courseData, sections, activityData]) => {
      if (controller.signal.aborted) return
      const currentSection = sections.find(item => item._id === sectionId)
      if (!currentSection) throw new Error('No se encontró la sección de este curso.')
      setCourse(courseData)
      setSection(currentSection)
      setActivities(activityData)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudieron cargar las actividades.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, reloadVersion])

  const reload = () => {
    setLoadError('')
    setIsLoading(true)
    setReloadVersion(version => version + 1)
  }

  const confirmDelete = async () => {
    if (!activityToDelete || isDeleting) return
    setIsDeleting(true)
    setActionError('')
    try {
      await deleteActivity(courseId, sectionId, activityToDelete._id)
      setActivities(current => current.filter(activity => activity._id !== activityToDelete._id))
      setSuccess(`La actividad “${activityToDelete.titulo}” se eliminó.`)
      setActivityToDelete(null)
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la actividad.')
    } finally {
      setIsDeleting(false)
    }
  }

  const editorUrl = activityId =>
    `/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/${encodeURIComponent(activityId)}/edit`
  const trackingUrl = activityId =>
    `/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/${encodeURIComponent(activityId)}/tracking`

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-blue" aria-labelledby="teacher-activities-title">
        <Link
          to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts`}
          className="teacher-back-link"
        >
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a publicaciones
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando actividades…
          </div>
        )}
        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
            <Button variant="outline-secondary" onClick={reload}>Reintentar</Button>
          </Alert>
        )}

        {!isLoading && !loadError && course && section && (
          <>
            <header className="teacher-section-heading teacher-course-sections-heading">
              <div>
                <p className="teacher-eyebrow">{course.curso} · {section.nombre}</p>
                <h1 id="teacher-activities-title">Actividades</h1>
                <p>Creá ejercicios de selección única y decidí cuándo publicarlos.</p>
              </div>
              <Button as={Link} to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/new`}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Nueva actividad
              </Button>
            </header>

            {actionError && <Alert variant="danger" role="alert">{actionError}</Alert>}
            {success && <Alert variant="success" role="status">{success}</Alert>}

            {activities.length === 0 ? (
              <div className="teacher-empty-state">
                <div className="teacher-empty-illustration" aria-hidden="true">
                  <span /><i className="bi bi-clipboard2-plus" /><span />
                </div>
                <h2>Todavía no hay actividades</h2>
                <p>Creá una actividad para que tus alumnos puedan practicar.</p>
                <Button as={Link} to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/new`}>
                  Crear primera actividad
                </Button>
              </div>
            ) : (
              <div className="teacher-activities-list">
                {activities.map(activity => (
                  <article className="teacher-activity-card" key={activity._id}>
                    <div className="teacher-activity-card-icon" aria-hidden="true">
                      <i className="bi bi-clipboard-check" />
                    </div>
                    <div className="teacher-activity-card-main">
                      <div className="teacher-activity-card-heading">
                        <h2><MathContent content={activity.titulo} inline /></h2>
                        <span className={`activity-status-badge ${activity.estado === 'publicado' ? 'is-published' : ''}`}>
                          {activity.estado === 'publicado' ? 'Publicada' : 'Borrador'}
                        </span>
                      </div>
                      <MathContent content={activity.descripcion || 'Sin descripción.'} />
                      <span className="teacher-activity-question-count">
                        {activity.ejercicios?.length ?? 0} {(activity.ejercicios?.length ?? 0) === 1 ? 'pregunta' : 'preguntas'}
                      </span>
                    </div>
                    <div className="teacher-activity-actions">
                      <Button
                        as={Link}
                        to={trackingUrl(activity._id)}
                        variant="outline-secondary"
                      >
                        Seguimiento
                      </Button>
                      <Button as={Link} to={editorUrl(activity._id)} variant="outline-primary">Editar</Button>
                      <Button variant="outline-danger" onClick={() => setActivityToDelete(activity)}>Eliminar</Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <Modal show={Boolean(activityToDelete)} onHide={() => !isDeleting && setActivityToDelete(null)} centered>
          <Modal.Header closeButton={!isDeleting}>
            <Modal.Title>Eliminar actividad</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            ¿Seguro que querés eliminar “{activityToDelete?.titulo}”? Esta acción no se puede deshacer.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setActivityToDelete(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting
                ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Eliminando…</>
                : 'Eliminar actividad'}
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default TeacherSectionActivitiesPage
