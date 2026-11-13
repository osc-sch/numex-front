import { useEffect, useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MathContent from '../components/MathContent'
import { getActivities } from '../services/activities'
import { getCourseSections, getEnrolledCourse, getSectionPosts } from '../services/courses'
import { getStudentActivityStatus } from '../utils/studentActivityStatus'

const activityStatuses = {
  pendiente: {
    label: 'Pendiente',
    action: 'Comenzar actividad',
    icon: 'bi-circle',
  },
  en_progreso: {
    label: 'En progreso',
    action: 'Continuar actividad',
    icon: 'bi-arrow-repeat',
  },
  completada: {
    label: 'Completada',
    action: 'Volver a abrir',
    icon: 'bi-check-circle-fill',
  },
}

function SectionContents({ courseId, sectionId }) {
  const [posts, setPosts] = useState([])
  const [activities, setActivities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getSectionPosts(courseId, sectionId, { signal: controller.signal }),
      getActivities(courseId, sectionId, { signal: controller.signal }),
    ]).then(([sectionPosts, sectionActivities]) => {
      if (controller.signal.aborted) return
      setPosts(sectionPosts.filter(post => post.tipo !== 'actividad'))
      setActivities(sectionActivities)
      setError('')
    }).catch(requestError => {
      if (!controller.signal.aborted) {
        setError(requestError.message || 'No se pudieron cargar los contenidos.')
      }
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, reloadVersion])

  const contents = [
    ...posts.map((post, index) => ({ item: post, type: 'material', index })),
    ...activities.map((activity, index) => ({ item: activity, type: 'actividad', index })),
  ].sort((left, right) =>
    (left.item.orden ?? 0) - (right.item.orden ?? 0)
    || left.index - right.index)

  if (isLoading && contents.length === 0) {
    return <div className="teacher-courses-loading mt-3" role="status">
      <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando contenidos…
    </div>
  }
  if (error) {
    return <Alert className="mt-3 mb-0" variant="danger" role="alert">
      <p>{error}</p>
      <Button variant="outline-secondary" size="sm" onClick={() => {
        setError('')
        setIsLoading(true)
        setReloadVersion(version => version + 1)
      }}>Reintentar</Button>
    </Alert>
  }
  if (contents.length === 0) {
    return (
      <div className="student-section-content-panel">
        <p className="student-section-no-posts">Todavía no hay contenidos en esta sección.</p>
      </div>
    )
  }

  return (
    <div className="student-section-content-panel">
      <div className="student-section-posts" role="group" aria-label="Contenidos de la sección">
        {contents.map(({ item, type }) => {
          const isActivity = type === 'actividad'
          const status = isActivity ? getStudentActivityStatus(item) : null
          const statusContent = status ? activityStatuses[status] : null
          const wasCompleted = item.progresoAlumno?.completada === true
            || item.progresoAlumno?.estado === 'completada'
          return (
            <Link
              aria-label={isActivity
                ? `${item.titulo}. Estado: ${statusContent.label}. ${statusContent.action}.`
                : `Abrir material: ${item.titulo}`}
              className="student-section-post-card"
              key={item._id}
              to={isActivity
                ? `/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities/${encodeURIComponent(item._id)}`
                : `/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/${encodeURIComponent(item._id)}`}
            >
              <span className="student-section-post-card-icon" aria-hidden="true">
                <i className={`bi ${isActivity ? 'bi-clipboard-check' : 'bi-file-earmark-text'}`} />
              </span>
              <span className="student-section-post-card-type">{isActivity ? 'Actividad' : 'Material'}</span>
              <span className="student-section-post-card-title">
                <MathContent content={item.titulo} inline />
              </span>
              {isActivity && (
                <>
                  <span className={`student-activity-status is-${status}`}>
                    <i className={`bi ${statusContent.icon}`} aria-hidden="true" />
                    <span>{statusContent.label}</span>
                  </span>
                  {status === 'en_progreso' && wasCompleted && (
                    <span className="student-activity-status is-completada">
                      <i className={`bi ${activityStatuses.completada.icon}`} aria-hidden="true" />
                      <span>Completada anteriormente</span>
                    </span>
                  )}
                  <span className="student-activity-action">{statusContent.action}</span>
                </>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StudentCourseDetailPage() {
  const { id } = useParams()
  return <StudentCourseDetail key={id} id={id} />
}

function StudentCourseDetail({ id }) {
  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [expandedSectionId, setExpandedSectionId] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getEnrolledCourse(id, { signal: controller.signal }),
      getCourseSections(id, { signal: controller.signal }),
    ]).then(([courseData, sectionData]) => {
      if (controller.signal.aborted) return
      setCourse(courseData)
      setSections(sectionData)
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar el curso.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [id, reloadVersion])

  const retry = () => {
    setLoadError('')
    setIsLoading(true)
    setReloadVersion(version => version + 1)
  }
  const teacherProfile = course?.docente?.profile
  const teacherName = teacherProfile && typeof teacherProfile === 'object'
    ? [teacherProfile.nombre, teacherProfile.apellido].filter(Boolean).join(' ')
    : course?.docente?.user_name

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-green" aria-labelledby="student-course-detail-title">
        <Link to="/courses" className="teacher-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a mis cursos
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando el curso…
          </div>
        )}

        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
            <Button variant="outline-secondary" onClick={retry}>Reintentar</Button>
          </Alert>
        )}

        {!isLoading && !loadError && course && (
          <>
            <section className="student-course-overview" aria-labelledby="student-course-detail-title">
              <div className="student-course-overview-header">
                <p className="teacher-eyebrow">Curso</p>
                <h1 id="student-course-detail-title"><MathContent content={course.curso} inline /></h1>
                {course.materia && <span className="teacher-course-subject">{course.materia}</span>}
              </div>

              <div className="student-course-overview-body">
                <div className="student-course-detail-icon" aria-hidden="true">
                  <i className="bi bi-journal-text" />
                </div>
                <div>
                  <h2>Descripción del curso</h2>
                  <MathContent content={course.descripcion?.trim() || 'Este curso todavía no tiene una descripción.'} />
                </div>
              </div>

              <div className="student-course-overview-teacher" aria-labelledby="student-course-teacher-title">
                <h2 id="student-course-teacher-title">Docente</h2>
                <p>{teacherName || 'Docente del curso'}</p>
              </div>
            </section>

            <section className="student-course-sections" aria-labelledby="student-course-sections-title">
              <div className="student-enrolled-heading">
                <h2 id="student-course-sections-title">Contenidos del curso</h2>
                <span>{sections.length}</span>
              </div>
              {sections.length === 0 ? (
                <div className="teacher-empty-state">
                  <div className="teacher-empty-illustration" aria-hidden="true">
                    <span /><i className="bi bi-journal-text" /><span />
                  </div>
                  <h2>Todavía no hay contenidos</h2>
                  <p>El docente aún no publicó secciones para este curso.</p>
                </div>
              ) : (
                <div className="student-course-sections-list">
                  {sections.map((section, index) => (
                    <article className="student-course-section" id={section._id} key={section._id}>
                      <span className="student-course-section-order">{String(index + 1).padStart(2, '0')}</span>
                      <div>
                        <h3 className="student-course-section-heading">
                          <button
                            type="button"
                            className="student-course-section-toggle"
                            aria-expanded={expandedSectionId === section._id}
                            aria-controls={`student-section-content-${section._id}`}
                            onClick={() => setExpandedSectionId(current =>
                              current === section._id ? null : section._id)}
                          >
                            <span>{section.nombre}</span>
                            <i
                              className={`bi ${expandedSectionId === section._id ? 'bi-chevron-up' : 'bi-chevron-down'}`}
                              aria-hidden="true"
                            />
                          </button>
                        </h3>
                        <div
                          id={`student-section-content-${section._id}`}
                          hidden={expandedSectionId !== section._id}
                        >
                          {expandedSectionId === section._id && (
                            <SectionContents
                              courseId={id}
                              sectionId={section._id}
                            />
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </section>
    </DashboardLayout>
  )
}

export default StudentCourseDetailPage
