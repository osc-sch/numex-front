import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import {
  createCourseSection,
  deleteCourseSection,
  getCourse,
  getCourseSections,
  updateCourseSection,
} from '../services/courses'

const emptyDraft = { nombre: '', descripcion: '', visible: true }

function TeacherCourseSectionsPage() {
  const { id } = useParams()
  return <CourseSections key={id} courseId={id} />
}

function CourseSections({ courseId }) {
  const [course, setCourse] = useState(null)
  const [sections, setSections] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadVersion, setReloadVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingSection, setEditingSection] = useState(null)
  const [draft, setDraft] = useState(emptyDraft)
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [deletingSection, setDeletingSection] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
    ]).then(([courseData, sectionData]) => {
      if (controller.signal.aborted) return
      setCourse(courseData)
      setSections(sectionData)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudieron cargar las secciones.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, reloadVersion])

  const reload = () => {
    setIsLoading(true)
    setLoadError('')
    setReloadVersion(version => version + 1)
  }

  const openCreateForm = () => {
    setEditingSection(null)
    setDraft(emptyDraft)
    setFormError('')
    setShowForm(true)
  }

  const openEditForm = section => {
    setEditingSection(section)
    setDraft({
      nombre: section.nombre,
      descripcion: section.descripcion ?? '',
      visible: section.visible,
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
      const data = {
        nombre: draft.nombre.trim(),
        descripcion: draft.descripcion.trim(),
        ...(editingSection ? { visible: draft.visible } : {}),
      }
      const section = editingSection
        ? await updateCourseSection(courseId, editingSection._id, data)
        : await createCourseSection(courseId, data)
      setSections(current => editingSection
        ? current.map(item => item._id === section._id ? section : item)
        : [...current, section].sort((a, b) => a.orden - b.orden))
      setSuccess(editingSection
        ? `La sección “${section.nombre}” se actualizó correctamente.`
        : `La sección “${section.nombre}” se creó correctamente.`)
      setShowForm(false)
    } catch (error) {
      setFormError(error.message || 'No se pudo guardar la sección.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const toggleVisibility = async section => {
    setActionError('')
    try {
      const updated = await updateCourseSection(courseId, section._id, { visible: !section.visible })
      setSections(current => current.map(item => item._id === updated._id ? updated : item))
      setSuccess(`La sección ahora está ${updated.visible ? 'visible' : 'oculta'} para los alumnos.`)
    } catch (error) {
      setActionError(error.message || 'No se pudo cambiar la visibilidad de la sección.')
    }
  }

  const handleDelete = async () => {
    if (!deletingSection || isDeleting) return
    setIsDeleting(true)
    setActionError('')
    try {
      await deleteCourseSection(courseId, deletingSection._id)
      setSections(current => current.filter(section => section._id !== deletingSection._id))
      setSuccess(`La sección “${deletingSection.nombre}” se eliminó correctamente.`)
      setDeletingSection(null)
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar la sección.')
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
      <section className="teacher-section-page teacher-tone-blue" aria-labelledby="teacher-course-sections-title">
        <Link to="/teacher/courses" className="teacher-back-link">
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
            <Button variant="outline-secondary" onClick={reload}>Reintentar</Button>
          </Alert>
        )}

        {!isLoading && !loadError && course && (
          <>
            <header className="teacher-section-heading teacher-course-sections-heading">
              <div>
                <p className="teacher-eyebrow">Contenido del curso</p>
                <h1 id="teacher-course-sections-title">{course.curso}</h1>
                <p>{course.materia}{course.descripcion ? ` · ${course.descripcion}` : ''}</p>
              </div>
              <Button onClick={openCreateForm}>
                <i className="bi bi-plus-lg" aria-hidden="true" /> Nueva sección
              </Button>
            </header>

            {actionError && <Alert variant="danger" role="alert">{actionError}</Alert>}
            {success && <Alert variant="success" role="status">{success}</Alert>}

            {sections.length === 0 ? (
              <div className="teacher-empty-state">
                <div className="teacher-empty-illustration" aria-hidden="true">
                  <span /><i className="bi bi-journal-plus" /><span />
                </div>
                <h2>Este curso todavía no tiene secciones</h2>
                <p>Creá la primera sección para compartir contenido con tus alumnos.</p>
                <Button onClick={openCreateForm}>Crear primera sección</Button>
              </div>
            ) : (
              <div className="teacher-course-sections-list">
                {sections.map((section, index) => (
                  <article className={`teacher-course-section${section.visible ? '' : ' is-hidden'}`} key={section._id}>
                    <span className="teacher-course-section-order">{String(index + 1).padStart(2, '0')}</span>
                    <div className="teacher-course-section-content">
                      <div className="teacher-course-section-title">
                        <h2>{section.nombre}</h2>
                        <span className={`teacher-section-visibility${section.visible ? '' : ' is-hidden'}`}>
                          {section.visible ? 'Visible' : 'Oculta'}
                        </span>
                      </div>
                      <p>{section.descripcion || 'Sin descripción.'}</p>
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <Link
                          className="btn btn-outline-success btn-sm"
                          to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(section._id)}/posts`}
                        >
                          <i className="bi bi-file-earmark-text" aria-hidden="true" /> Publicaciones
                        </Link>
                        <Link
                          className="btn btn-outline-primary btn-sm"
                          to={`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(section._id)}/activities`}
                        >
                          <i className="bi bi-clipboard-check" aria-hidden="true" /> Actividades
                        </Link>
                      </div>
                      <div className="d-flex flex-wrap gap-2 mt-3">
                        <Button variant="outline-primary" size="sm" onClick={() => openEditForm(section)}>
                          Editar
                        </Button>
                        <Button variant="outline-secondary" size="sm" onClick={() => toggleVisibility(section)}>
                          {section.visible ? 'Ocultar a alumnos' : 'Mostrar a alumnos'}
                        </Button>
                        <Button variant="outline-danger" size="sm" onClick={() => setDeletingSection(section)}>
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        <Modal show={showForm} onHide={() => !isSubmitting && setShowForm(false)} centered>
          <Form onSubmit={handleSave}>
            <Modal.Header closeButton={!isSubmitting}>
              <Modal.Title>{editingSection ? 'Editar sección' : 'Nueva sección'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              {formError && <Alert variant="danger" role="alert">{formError}</Alert>}
              <Form.Group className="mb-3" controlId="sectionName">
                <Form.Label>Nombre</Form.Label>
                <Form.Control
                  autoFocus
                  maxLength={100}
                  name="nombre"
                  onChange={updateDraft}
                  required
                  value={draft.nombre}
                />
              </Form.Group>
              <Form.Group className="mb-3" controlId="sectionDescription">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  maxLength={500}
                  name="descripcion"
                  onChange={updateDraft}
                  rows={4}
                  value={draft.descripcion}
                />
                <Form.Text>{draft.descripcion.length}/500 caracteres</Form.Text>
              </Form.Group>
              {editingSection && (
                <Form.Check
                  checked={draft.visible}
                  id="sectionVisible"
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
                  : 'Guardar sección'}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        <Modal show={Boolean(deletingSection)} onHide={() => !isDeleting && setDeletingSection(null)} centered>
          <Modal.Header closeButton={!isDeleting}>
            <Modal.Title>Eliminar sección</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            ¿Seguro que querés eliminar “{deletingSection?.nombre}”? Los alumnos ya no podrán verla.
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setDeletingSection(null)} disabled={isDeleting}>
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

export default TeacherCourseSectionsPage
