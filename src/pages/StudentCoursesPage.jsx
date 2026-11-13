import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'
import { getEnrolledCourses, joinCourse } from '../services/courses'

function StudentCoursesPage() {
  const [courses, setCourses] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [codigoAcceso, setCodigoAcceso] = useState('')
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const submitting = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getEnrolledCourses({ signal: controller.signal }).then(data => {
      if (controller.signal.aborted) return
      setCourses(data)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudieron cargar tus cursos.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [])

  const handleJoin = async event => {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    setIsSubmitting(true)
    setFormError('')
    setSuccess('')
    try {
      const course = await joinCourse(codigoAcceso)
      setCourses(current => [course, ...current.filter(item => item._id !== course._id)])
      setCodigoAcceso('')
      setSuccess(`Te uniste a “${course.curso}” correctamente.`)
      setShowJoinModal(false)
    } catch (error) {
      setFormError(error.message || 'No se pudo ingresar al curso. Intentá nuevamente.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  const openJoinModal = () => {
    setFormError('')
    setShowJoinModal(true)
  }

  const closeJoinModal = () => {
    if (isSubmitting) return
    setFormError('')
    setShowJoinModal(false)
  }

  const reloadCourses = async () => {
    setIsLoading(true)
    setLoadError('')
    try {
      setCourses(await getEnrolledCourses())
    } catch (error) {
      setLoadError(error.message || 'No se pudieron cargar tus cursos.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-green" aria-labelledby="student-courses-title">
        <header className="teacher-section-heading">
          <div>
            <p className="teacher-eyebrow">Mi aprendizaje</p>
            <h1 id="student-courses-title">Mis cursos</h1>
            <p>Ingresá el código que te compartió tu docente para unirte a su clase.</p>
          </div>
          <Button onClick={openJoinModal}>
            <i className="bi bi-key-fill me-2" aria-hidden="true" />
            Unirme a un curso
          </Button>
        </header>

        {success && <Alert variant="success" role="status">{success}</Alert>}

        <section className="student-enrolled-courses" aria-labelledby="student-enrolled-courses-title">
          <div className="student-enrolled-heading">
            <h2 id="student-enrolled-courses-title">Cursos en los que participás</h2>
            {!isLoading && !loadError && <span>{courses.length}</span>}
          </div>
          {loadError && (
            <Alert variant="danger" role="alert">
              <p>{loadError}</p>
              <Button variant="outline-secondary" onClick={reloadCourses}>Reintentar</Button>
            </Alert>
          )}
          {isLoading && (
            <div className="teacher-courses-loading" role="status">
              <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando tus cursos…
            </div>
          )}
          {!isLoading && !loadError && courses.length === 0 && (
            <div className="teacher-empty-state">
              <div className="teacher-empty-illustration" aria-hidden="true">
                <span /><i className="bi bi-collection" /><span />
              </div>
              <h2>Todavía no estás en ningún curso</h2>
              <p>Cuando tengas un código de acceso, usá el botón «Unirme a un curso» para ingresar a la clase.</p>
              <Button className="mt-2" onClick={openJoinModal}>
                <i className="bi bi-key-fill me-2" aria-hidden="true" />
                Unirme a un curso
              </Button>
            </div>
          )}
          {courses.length > 0 && (
            <div className="teacher-courses-grid">
              {courses.map(course => (
                <Link
                  className="student-course-card-link"
                  key={course._id}
                  to={`/courses/${encodeURIComponent(course._id)}`}
                >
                  <article className="teacher-course-card">
                    <div className="teacher-course-top">
                      <span className="teacher-module-icon"><i className="bi bi-collection" aria-hidden="true" /></span>
                      <span className="teacher-course-subject">{course.materia}</span>
                    </div>
                    <h3>{course.curso}</h3>
                    <p className="teacher-course-description">{course.descripcion || 'Sin descripción.'}</p>
                    <span className="student-course-open-link">
                      Ver curso <i className="bi bi-arrow-right" aria-hidden="true" />
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>

      <Modal
        show={showJoinModal}
        onHide={closeJoinModal}
        centered
        className="dashboard-modal student-course-join-modal"
        backdrop={isSubmitting ? 'static' : true}
        keyboard={!isSubmitting}
      >
        <Modal.Header closeButton={!isSubmitting}>
          <Modal.Title>Unirme a un curso</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleJoin}>
          <Modal.Body>
            <p className="student-course-join-intro">
              Ingresá el código que te compartió tu docente. No distingue entre mayúsculas y minúsculas.
            </p>
            {formError && <Alert variant="danger" role="alert">{formError}</Alert>}
            <fieldset disabled={isSubmitting} className="border-0 p-0 m-0">
              <Form.Group controlId="courseAccessCode">
                <Form.Label>Código de acceso</Form.Label>
                <Form.Control
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={12}
                  minLength={10}
                  name="codigo_acceso"
                  onChange={event => {
                    setCodigoAcceso(event.target.value.replace(/\s/g, '').toUpperCase())
                    setFormError('')
                    setSuccess('')
                  }}
                  pattern="[A-Fa-f0-9]{10,12}"
                  placeholder="Ejemplo: ABCDEF2345"
                  required
                  value={codigoAcceso}
                  aria-describedby="course-access-code-help"
                />
                <Form.Text id="course-access-code-help">Pedile el código a tu docente.</Form.Text>
              </Form.Group>
            </fieldset>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeJoinModal} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Uniéndome…</>
                : <><i className="bi bi-box-arrow-in-right me-1" aria-hidden="true" /> Unirme</>}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </DashboardLayout>
  )
}

export default StudentCoursesPage
