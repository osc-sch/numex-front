import { useEffect, useRef, useState } from 'react'
import { Alert, Button, Form, Spinner } from 'react-bootstrap'
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
      setCourses(current => [course, ...current.filter(item => item.id !== course.id)])
      setCodigoAcceso('')
      setSuccess(`Te uniste a “${course.curso}” correctamente.`)
    } catch (error) {
      setFormError(error.message || 'No se pudo ingresar al curso. Intentá nuevamente.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
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
        </header>

        <section className="student-course-join" aria-labelledby="student-course-join-title">
          <div className="student-course-join-icon" aria-hidden="true">
            <i className="bi bi-key-fill" />
          </div>
          <div className="student-course-join-content">
            <h2 id="student-course-join-title">Unirme a un curso</h2>
            <p>El código tiene 10 caracteres y no distingue entre mayúsculas y minúsculas.</p>
            <Form onSubmit={handleJoin}>
              <Form.Group controlId="courseAccessCode">
                <Form.Label>Código de acceso</Form.Label>
                <div className="student-course-join-controls">
                  <Form.Control
                    autoComplete="off"
                    autoCapitalize="characters"
                    maxLength={10}
                    minLength={10}
                    name="codigo_acceso"
                    onChange={event => {
                      setCodigoAcceso(event.target.value.replace(/\s/g, '').toUpperCase())
                      setFormError('')
                      setSuccess('')
                    }}
                    pattern="[A-HJ-NP-Z2-9]{10}"
                    placeholder="Ejemplo: ABCDEF2345"
                    required
                    value={codigoAcceso}
                    aria-describedby="course-access-code-help"
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting
                      ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Uniéndome…</>
                      : <><i className="bi bi-box-arrow-in-right" aria-hidden="true" /> Unirme</>}
                  </Button>
                </div>
                <Form.Text id="course-access-code-help">Pedile el código a tu docente.</Form.Text>
              </Form.Group>
            </Form>
            {formError && <Alert variant="danger" className="mt-3 mb-0" role="alert">{formError}</Alert>}
            {success && <Alert variant="success" className="mt-3 mb-0" role="status">{success}</Alert>}
          </div>
        </section>

        <section aria-labelledby="student-enrolled-courses-title">
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
              <p>Cuando tengas un código de acceso, ingresalo arriba para unirte a la clase.</p>
            </div>
          )}
          {courses.length > 0 && (
            <div className="teacher-courses-grid">
              {courses.map(course => (
                <article className="teacher-course-card" key={course.id}>
                  <div className="teacher-course-top">
                    <span className="teacher-module-icon"><i className="bi bi-collection" aria-hidden="true" /></span>
                    <span className="teacher-course-subject">{course.materia}</span>
                  </div>
                  <h3>{course.curso}</h3>
                  <p className="teacher-course-description">{course.descripcion || 'Sin descripción.'}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </DashboardLayout>
  )
}

export default StudentCoursesPage
