import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  createSectionPost,
  deleteSectionPost,
  getCourse,
  getCourseSections,
  getSectionPosts,
  updateSectionPost,
} from '../services/courses'

const emptyDraft = {
  tipo: 'material',
  titulo: '',
  descripcion: '',
  contenido: '',
  url: '',
  visible: true,
}

function TeacherSectionPostsPage() {
  const { courseId, sectionId } = useParams()
  return <SectionPostsPage key={`${courseId}:${sectionId}`} courseId={courseId} sectionId={sectionId} />
}

function SectionPostsPage({ courseId, sectionId }) {
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [posts, setPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingPost, setDeletingPost] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const submitting = useRef(false)

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

  const openCreateForm = () => {
    setEditingPost(null)
    setDraft(emptyDraft)
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = post => {
    setEditingPost(post)
    setDraft({
      tipo: post.tipo,
      titulo: post.titulo,
      descripcion: post.descripcion ?? '',
      contenido: post.contenido ?? '',
      url: post.url ?? '',
      visible: post.visible,
    })
    setFormError('')
    setShowForm(true)
  }

  const handleSave = async event => {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setIsSubmitting(true)
    setFormError('')
    setActionError('')
    try {
      const common = {
        titulo: draft.titulo.trim(),
        descripcion: draft.descripcion.trim(),
        contenido: draft.contenido,
        url: draft.url.trim(),
      }
      const post = editingPost
        ? await updateSectionPost(courseId, sectionId, editingPost._id, {
          ...common,
          visible: draft.visible,
        })
        : await createSectionPost(courseId, sectionId, {
          tipo: draft.tipo,
          ...common,
        })
      setPosts(current => editingPost
        ? current.map(item => item._id === post._id ? post : item)
        : [...current, post].sort((a, b) => a.orden - b.orden || a._id.localeCompare(b._id)))
      setSuccess(`La publicación “${post.titulo}” se ${editingPost ? 'actualizó' : 'creó'} correctamente.`)
      setShowForm(false)
    } catch (error) {
      setFormError(error.message || 'No se pudo guardar la publicación.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
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

  const updateDraft = event => {
    const { name, value, type, checked } = event.target
    setDraft(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
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
                <Button onClick={openCreateForm}>
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
                <Button onClick={openCreateForm}>Crear primera publicación</Button>
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
                      <h2>{post.titulo}</h2>
                      {post.descripcion && <p className="student-section-post-description">{post.descripcion}</p>}
                      {post.contenido && <div className="student-section-post-content">{post.contenido}</div>}
                      {post.url && <a href={post.url} target="_blank" rel="noreferrer">Abrir recurso</a>}
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <Button variant="outline-primary" size="sm" onClick={() => openEditForm(post)}>Editar</Button>
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

        <Modal show={showForm} onHide={() => !isSubmitting && setShowForm(false)} size="lg" centered>
          <Form onSubmit={handleSave}>
            <Modal.Header closeButton={!isSubmitting}>
              <Modal.Title>{editingPost ? 'Editar publicación' : 'Nueva publicación'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {formError && <Alert variant="danger" role="alert">{formError}</Alert>}
              {!editingPost && (
                <Form.Group className="mb-3" controlId="postType">
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select name="tipo" onChange={updateDraft} value={draft.tipo}>
                    <option value="material">Material</option>
                    <option value="actividad">Actividad</option>
                  </Form.Select>
                </Form.Group>
              )}
              <Form.Group className="mb-3" controlId="postTitle">
                <Form.Label>Título</Form.Label>
                <Form.Control
                  autoFocus
                  maxLength={150}
                  name="titulo"
                  onChange={updateDraft}
                  required
                  value={draft.titulo}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="postDescription">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  maxLength={5000}
                  name="descripcion"
                  onChange={updateDraft}
                  rows={2}
                  value={draft.descripcion}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="postContent">
                <Form.Label>{draft.tipo === 'actividad' ? 'Consigna' : 'Contenido'}</Form.Label>
                <Form.Control
                  as="textarea"
                  maxLength={50000}
                  name="contenido"
                  onChange={updateDraft}
                  rows={8}
                  value={draft.contenido}
                />
                <Form.Text>Podés usar texto o Markdown; no se admite HTML.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3" controlId="postUrl">
                <Form.Label>Enlace a un recurso (opcional)</Form.Label>
                <Form.Control
                  maxLength={2048}
                  name="url"
                  onChange={updateDraft}
                  placeholder="https://..."
                  type="url"
                  value={draft.url}
                />
              </Form.Group>
              {editingPost && (
                <Form.Check
                  checked={draft.visible}
                  id="postVisible"
                  label="Visible para los alumnos"
                  name="visible"
                  onChange={updateDraft}
                  type="switch"
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={() => setShowForm(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Guardando…</>
                  : 'Guardar publicación'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

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
