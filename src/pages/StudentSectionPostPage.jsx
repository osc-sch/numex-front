import { useEffect, useState } from 'react'
import { Alert, Button, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { getCourseSections, getEnrolledCourse, getSectionPost } from '../services/courses'

function StudentSectionPostPage() {
  const { courseId, sectionId, postId } = useParams()
  return <StudentPostDetail key={`${courseId}:${sectionId}:${postId}`} courseId={courseId} sectionId={sectionId} postId={postId} />
}

function StudentPostDetail({ courseId, sectionId, postId }) {
  const [details, setDetails] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getEnrolledCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      getSectionPost(courseId, sectionId, postId, { signal: controller.signal }),
    ]).then(([course, sections, post]) => {
      if (controller.signal.aborted) return
      const section = sections.find(item => item._id === sectionId)
      if (!section) throw new Error('No se encontró la sección de esta publicación.')
      setDetails({ course, section, post })
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar la publicación.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, postId, reloadVersion])

  const retry = () => {
    setLoadError('')
    setIsLoading(true)
    setReloadVersion(version => version + 1)
  }
  const isActivity = details?.post.tipo === 'actividad'
  const coursePath = `/courses/${encodeURIComponent(courseId)}`

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-green" aria-labelledby="student-post-title">
        <nav className="student-post-breadcrumbs" aria-label="Ruta de navegación">
          <Link to="/courses">Mis cursos</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <Link to={coursePath}>{details?.course.curso || 'Curso'}</Link>
          <i className="bi bi-chevron-right" aria-hidden="true" />
          <Link to={`${coursePath}#${encodeURIComponent(sectionId)}`}>
            {details?.section.nombre || 'Sección'}
          </Link>
        </nav>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando publicación…
          </div>
        )}

        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
            <Button variant="outline-secondary" onClick={retry}>Reintentar</Button>
          </Alert>
        )}

        {!isLoading && !loadError && details && (
          <article className={`student-post-detail${isActivity ? ' is-activity' : ''}`}>
            <div className="student-post-detail-icon" aria-hidden="true">
              <i className={`bi ${isActivity ? 'bi-clipboard-check' : 'bi-file-earmark-text'}`} />
            </div>
            <span className={`student-section-post-type${isActivity ? ' is-activity' : ''}`}>
              {isActivity ? 'Actividad' : 'Material'}
            </span>
            <h1 id="student-post-title">{details.post.titulo}</h1>
            <p className="student-post-detail-context">
              {details.course.curso} · {details.section.nombre}
            </p>

            {details.post.descripcion && (
              <section className="student-post-detail-description" aria-labelledby="student-post-description-title">
                <h2 id="student-post-description-title">{isActivity ? 'Consigna' : 'Descripción'}</h2>
                <p>{details.post.descripcion}</p>
              </section>
            )}

            {details.post.contenido && (
              <section className="student-post-detail-content" aria-labelledby="student-post-content-title">
                <h2 id="student-post-content-title">{isActivity ? 'Instrucciones' : 'Contenido'}</h2>
                <div>{details.post.contenido}</div>
              </section>
            )}

            {details.post.url && (
              <a className="student-post-resource-link" href={details.post.url} target="_blank" rel="noreferrer">
                <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
                Abrir recurso externo
              </a>
            )}

            <Link to={`${coursePath}#${encodeURIComponent(sectionId)}`} className="teacher-back-link">
              <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a los contenidos del curso
            </Link>
          </article>
        )}
      </section>
    </DashboardLayout>
  )
}

export default StudentSectionPostPage
