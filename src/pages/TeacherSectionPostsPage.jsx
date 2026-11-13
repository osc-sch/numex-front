import { useEffect, useState } from 'react'
import { Alert, Button, Modal, Spinner } from 'react-bootstrap'
import { Link, useLocation, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import MathContent from '../components/MathContent'
import PublicationContent from '../components/PublicationContent'
import {
  deleteSectionPost,
  getCourse,
  getCourseSections,
  getSectionPosts,
  updateSectionPost,
} from '../services/courses'

function TeacherSectionPostsPage() {
  const { courseId, sectionId } = useParams()
  return <SectionPostsPage key={`${courseId}:${sectionId}`} courseId={courseId} sectionId={sectionId} />
}

function SectionPostsPage({ courseId, sectionId }) {
  const location = useLocation()
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState(location.state?.notice ?? '')
  const [deletingPost, setDeletingPost] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      getSectionPosts(courseId, sectionId, { signal: controller.signal }),
    ]).then(([courseData, sections, publicationData]) => {
      if (controller.signal.aborted) return
      const currentSection = sections.find(item => item._id === sectionId)
      if (!currentSection) throw new Error('No se encontró la sección de este curso.')
      setCourse(courseData)
      setSection(currentSection)
      setPosts(publicationData)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudieron cargar las publicaciones.')
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

  const toggleVisibility = async post => {
    setActionError('')
    try {
      const updated = await updateSectionPost(courseId, sectionId, post._id, { visible: !post.visible })
      setPosts(current => current.map(item => item._id === updated._id ? updated : item))
      setSuccess(`La publicación ahora está ${updated.visible ? 'visible' : 'oculta'} para los alumnos.`)
    } catch (error) {
      setActionError(error.message || 'No se pudo cambiar la visibilidad de la publicación.')
    }
  }

  const handleDelete = async () => {
    if (!deletingPost || isDeleting) return
    setIsDeleting(true)
    setActionError('')
    try {
      await deleteSectionPost(courseId, sectionId, deletingPost._id)
      setPosts(current => current.filter(post => post._id !== deletingPost._id))
      setSuccess(`La publicación “${deletingPost.titulo}” se eliminó correctamente.`)
      setDeletingPost(null)
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la publicación.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-blue" aria-labelledby="teacher-section-posts-title">
        <Link to={`/teacher/courses/${encodeURIComponent(courseId)}`} className="teacher-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a las secciones
        </Link>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando publicaciones…
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
                <p className="teacher-eyebrow">{course.curso} · {course.materia}</p>
                <h1 id="teacher-section-posts-title">{section.nombre}</h1>
                <p>{section.descripcion || 'Publicaciones de esta sección.'}</p>
              </div>
              <div className="teacher-section-header-actions">
                <Button
                  as={Link}
                  to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/activities`}
                  variant="outline-primary"
                >
                  <i className="bi bi-clipboard-check" aria-hidden="true" /> Actividades
                </Button>
                <Button
                  as={Link}
                  to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/new`}
                >
                  <i className="bi bi-plus-lg" aria-hidden="true" /> Nueva publicación
                </Button>
              </div>
            </header>

            {actionError && <Alert variant="danger" role="alert">{actionError}</Alert>}
            {success && <Alert variant="success" role="status">{success}</Alert>}

            {posts.length === 0 ? (
              <div className="teacher-empty-state">
                <div className="teacher-empty-illustration" aria-hidden="true">
                  <span /><i className="bi bi-file-earmark-plus" /><span />
                </div>
                <h2>Esta sección todavía no tiene publicaciones</h2>
                <p>Compartí materiales o actividades con los alumnos del curso.</p>
                <Button
                  as={Link}
                  to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/new`}
                >
                  Crear primera publicación
                </Button>
              </div>
            ) : (
              <div className="teacher-section-posts-list">
                {posts.map((post, index) => (
                  <article className={`teacher-section-post${post.visible ? '' : ' is-hidden'}`} key={post._id}>
                    <span className="teacher-course-section-order">{String(index + 1).padStart(2, '0')}</span>
                    <div className="teacher-section-post-content">
                      <div className="teacher-section-post-heading">
                        <span className={`student-section-post-type ${post.tipo === 'actividad' ? 'is-activity' : ''}`}>
                          {post.tipo === 'actividad' ? 'Actividad' : 'Material'}
                        </span>
                        <span className={`teacher-section-visibility${post.visible ? '' : ' is-hidden'}`}>
                          {post.visible ? 'Visible' : 'Oculta'}
                        </span>
                      </div>
                      <h2><MathContent content={post.titulo} inline /></h2>
                      {post.descripcion && (
                        <div className="student-section-post-description">
                          <MathContent content={post.descripcion} />
                        </div>
                      )}
                      {post.contenido && (
                        <PublicationContent content={post.contenido} className="student-section-post-content" />
                      )}
                      {post.url && <a href={post.url} target="_blank" rel="noreferrer">Abrir recurso</a>}
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        {post.tipo === 'material' && (
                          <Button
                            as={Link}
                            to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/${encodeURIComponent(post._id)}/edit`}
                            variant="outline-primary"
                            size="sm"
                          >
                            Editar
                          </Button>
                        )}
                        <Button variant="outline-secondary" size="sm" onClick={() => toggleVisibility(post)}>
                          {post.visible ? 'Ocultar a alumnos' : 'Mostrar a alumnos'}
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => setDeletingPost(post)}>Eliminar</Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <Modal show={Boolean(deletingPost)} onHide={() => !isDeleting && setDeletingPost(null)} centered>
          <Modal.Header closeButton={!isDeleting}>
            <Modal.Title>Eliminar publicación</Modal.Title>
          </Modal.Header>
          <Modal.Body>¿Seguro que querés eliminar “{deletingPost?.titulo}”?</Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setDeletingPost(null)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting
                ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Eliminando…</>
                : 'Eliminar'}
            </Button>
          </Modal.Footer>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default TeacherSectionPostsPage
