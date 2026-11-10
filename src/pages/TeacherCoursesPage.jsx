import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import DashboardLayout from '../components/DashboardLayout'
import { createCourse, deleteCourse, getCourse, getCourses, updateCourse } from '../services/courses'

function CourseCard({ course, onEdit, onDelete, isEditing, isDeleting }) {
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState('')
  const [isCopying, setIsCopying] = useState(false)

  const copyCode = async () => {
    if (!course.codigo_acceso) return
    setCopyError('')
    setIsCopying(true)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(course.codigo_acceso)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError('No se pudo copiar. Seleccioná el código y copialo manualmente.')
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <article className="teacher-course-card">
      <div className="teacher-course-top">
        <span className="teacher-module-icon"><i className="bi bi-collection" aria-hidden="true" /></span>
        <span className="teacher-course-subject">{course.materia}</span>
      </div>
      <h2>{course.curso}</h2>
      <p className="teacher-course-description">{course.descripcion || 'Sin descripción.'}</p>
      <div className="teacher-course-access">
        <div>
          <label htmlFor={`course-code-${course._id}`}>Código de acceso</label>
          <input id={`course-code-${course._id}`} type="text" readOnly value={course.codigo_acceso}
            aria-label={`Código de acceso de ${course.curso}`} onFocus={event => event.target.select()} />
        </div>
        <Button variant="outline-secondary" onClick={copyCode} disabled={isCopying}
          aria-label={`Copiar código de ${course.curso}`}>
          <i className={`bi ${copied ? 'bi-check2' : 'bi-copy'}`} aria-hidden="true" />
          <span aria-live="polite">{copied ? 'Copiado' : 'Copiar'}</span>
        </Button>
      </div>
      {copyError && <p className="teacher-course-copy-error" role="alert">{copyError}</p>}
      <div className="d-flex flex-wrap gap-2 mt-3">
        <Link className="btn btn-outline-success" to={`/teacher/courses/${encodeURIComponent(course._id)}`}>
          <i className="bi bi-journal-text" aria-hidden="true" /> Secciones
        </Link>
        <Button variant="outline-primary" onClick={() => onEdit(course)} disabled={isEditing || isDeleting}>
          {isEditing ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Cargando…</> : 'Editar'}
        </Button>
        <Button variant="outline-danger" onClick={() => onDelete(course)} disabled={isEditing || isDeleting}>
          {isDeleting ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Eliminando…</> : 'Eliminar'}
        </Button>
      </div>
    </article>
  )
}

function TeacherCoursesPage() {
  const { user, profile } = useAuth()
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [editingCourse, setEditingCourse] = useState(null)
  const [isEditingCourse, setIsEditingCourse] = useState(null)
  const [draft, setDraft] = useState({ curso: '', descripcion: '', materia: '' })
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [actionError, setActionError] = useState('')
  const [deletingCourse, setDeletingCourse] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const teacherIds = [
      user?.id_profile_docente,
      user?.id_profile,
      profile?.id,
      user?.id,
    ].filter(id => id != null)
    getCourses({ signal: controller.signal, teacherIds }).then(data => {
      if (controller.signal.aborted) return
      setCourses(Array.isArray(data) ? data : [])
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudieron cargar tus cursos.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [profile?.id, refreshVersion, user?.id, user?.id_profile, user?.id_profile_docente])

  const reloadCourses = () => {
    setIsLoading(true)
    setLoadError('')
    setRefreshVersion(value => value + 1)
  }

  const openForm = () => {
    setEditingCourse(null)
    setDraft({ curso: '', descripcion: '', materia: '' })
    setFormError('')
    setShowForm(true)
  }

  const closeForm = () => {
    if (!submitting.current) setShowForm(false)
  }

  const openEditForm = async course => {
    setActionError('')
    setEditingCourse(course)
    setIsEditingCourse(course._id)
    try {
      const currentCourse = await getCourse(course._id)
      setDraft({
        curso: currentCourse.curso,
        descripcion: currentCourse.descripcion,
        materia: currentCourse.materia,
      })
      setFormError('')
      setShowForm(true)
    } catch (error) {
      setActionError(error.message || 'No se pudo cargar el curso para editarlo.')
    } finally {
      setIsEditingCourse(null)
    }
  }

  const handleSave = async event => {
    event.preventDefault()
    if (submitting.current) return
    const form = event.currentTarget
    for (const name of ['curso', 'materia']) {
      form.elements.namedItem(name).setCustomValidity(draft[name].trim() ? '' : 'Completá este campo.')
    }
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    submitting.current = true
    setIsSubmitting(true)
    setFormError('')
    try {
      const data = {
        curso: draft.curso.trim(),
        descripcion: draft.descripcion.trim(),
        materia: draft.materia.trim(),
      }
      const course = editingCourse
        ? await updateCourse(editingCourse._id, data)
        : await createCourse(data)
      setCourses(current => editingCourse
        ? current.map(item => item._id === course._id ? course : item)
        : [course, ...current.filter(item => item._id !== course._id)])
      setSuccess(editingCourse
        ? `El curso “${course.curso}” se actualizó correctamente.`
        : `El curso “${course.curso}” se creó correctamente. Su código de acceso ya está disponible.`)
      setShowForm(false)
    } catch (error) {
      setFormError(error.message || 'No se pudo guardar el curso. Intentá nuevamente.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingCourse || isDeleting) return
    setIsDeleting(true)
    setActionError('')
    try {
      await deleteCourse(deletingCourse._id)
      setCourses(current => current.filter(course => course._id !== deletingCourse._id))
      setSuccess(`El curso “${deletingCourse.curso}” se eliminó correctamente.`)
      setDeletingCourse(null)
    } catch (error) {
      setActionError(error.message || 'No se pudo eliminar el curso. Intentá nuevamente.')
    } finally {
      setIsDeleting(false)
    }
  }

  const updateDraft = event => {
    const { name, value } = event.target
    event.target.setCustomValidity('')
    setDraft(current => ({ ...current, [name]: value }))
  }

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-blue" aria-labelledby="teacher-courses-title">
        <header className="teacher-section-heading">
          <div>
            <p className="teacher-eyebrow">Espacio docente</p>
            <h1 id="teacher-courses-title">Mis cursos</h1>
            <p>Organizá tus espacios de trabajo. Cada curso tiene su propio código de acceso.</p>
          </div>
          <Button onClick={openForm} disabled={isLoading}>
            <i className="bi bi-plus-lg" aria-hidden="true" /> Crear curso
          </Button>
        </header>

        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')} role="status">{success}</Alert>}
        {actionError && <Alert variant="danger" dismissible onClose={() => setActionError('')} role="alert">{actionError}</Alert>}
        {loadError && (
          <Alert variant="danger" role="alert">
            <p>{loadError}</p>
            <Button variant="outline-secondary" onClick={reloadCourses}>Reintentar</Button>
          </Alert>
        )}
        {isLoading && <div className="teacher-courses-loading" role="status">
          <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando tus cursos…
        </div>}
        {!isLoading && !loadError && courses.length === 0 && (
          <div className="teacher-empty-state">
            <div className="teacher-empty-illustration" aria-hidden="true"><span /><i className="bi bi-collection" /><span /></div>
            <h2>Tu primer curso empieza acá</h2>
            <p>Agregá el nombre, la materia y una descripción. El código de acceso se genera automáticamente al guardar.</p>
            <Button onClick={openForm}><i className="bi bi-plus-lg" aria-hidden="true" /> Crear mi primer curso</Button>
          </div>
        )}
        {courses.length > 0 && (
          <div className="teacher-courses-grid">
            {courses.map(course => (
              <CourseCard
                key={course._id}
                course={course}
                onEdit={openEditForm}
                onDelete={setDeletingCourse}
                isEditing={isEditingCourse === course._id}
                isDeleting={isDeleting && deletingCourse?._id === course._id}
              />
            ))}
          </div>
        )}
      </section>

      <Modal show={showForm} onHide={closeForm} centered className="dashboard-modal teacher-course-modal"
        backdrop={isSubmitting ? 'static' : true} keyboard={!isSubmitting}>
        <Modal.Header closeButton={!isSubmitting}><Modal.Title>{editingCourse ? 'Editar curso' : 'Crear curso'}</Modal.Title></Modal.Header>
        <Form noValidate onSubmit={handleSave} aria-busy={isSubmitting}>
          <Modal.Body>
            <p className="teacher-course-form-intro">
              {editingCourse ? 'Actualizá el nombre, la materia o la descripción del curso.' : 'Dale un nombre a tu espacio y contá qué van a trabajar.'}
            </p>
            {formError && <Alert variant="danger" role="alert">{formError}</Alert>}
            <fieldset disabled={isSubmitting}>
              <Form.Group className="mb-3" controlId="courseName">
                <Form.Label>Curso</Form.Label>
                <Form.Control autoFocus name="curso" value={draft.curso} onChange={updateDraft}
                  placeholder="Por ejemplo: 4° año A" maxLength={100} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="courseSubject">
                <Form.Label>Materia</Form.Label>
                <Form.Control name="materia" value={draft.materia} onChange={updateDraft}
                  placeholder="Por ejemplo: Matemática" maxLength={100} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="courseDescription">
                <Form.Label>Descripción <span className="text-muted fw-normal">(opcional)</span></Form.Label>
                <Form.Control as="textarea" rows={4} name="descripcion" value={draft.descripcion}
                  onChange={updateDraft} placeholder="Temas, objetivos o una breve presentación del curso."
                  maxLength={2000} aria-describedby="courseDescriptionHelp" />
                <Form.Text id="courseDescriptionHelp">Hasta 2000 caracteres.</Form.Text>
              </Form.Group>
              {!editingCourse && <div className="teacher-course-code-note">
                <i className="bi bi-key" aria-hidden="true" />
                <div><strong>Código de acceso automático</strong><p>Al guardar, tu curso recibirá un código único. Podrás verlo y copiarlo desde Mis cursos.</p></div>
              </div>}
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeForm} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Guardando…</>
                : editingCourse ? 'Guardar cambios' : 'Crear curso'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(deletingCourse)} onHide={() => !isDeleting && setDeletingCourse(null)}
        centered className="dashboard-modal" backdrop={isDeleting ? 'static' : true} keyboard={!isDeleting}>
        <Modal.Header closeButton={!isDeleting}>
          <Modal.Title>Eliminar curso</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>¿Seguro que querés eliminar “{deletingCourse?.curso}”? Esta acción no se puede deshacer.</p>
          {actionError && <Alert variant="danger" role="alert">{actionError}</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setDeletingCourse(null)} disabled={isDeleting}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Eliminando…</> : 'Eliminar curso'}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default TeacherCoursesPage
