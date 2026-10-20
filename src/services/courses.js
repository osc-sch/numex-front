export class CourseError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'CourseError'
    this.status = status
  }
}

async function request({ body, path = '', signal } = {}) {
  let response
  try {
    response = await fetch(`/api/courses${path}`, {
      method: body ? 'POST' : 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const messages = data?.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new CourseError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data?.message || 'No se pudo completar la solicitud. Intentá nuevamente.',
      response.status,
    )
  }
  return data
}

function isCourse(course) {
  return Number.isInteger(course?.id) && course.id > 0
    && Number.isInteger(course.id_docente) && course.id_docente > 0
    && typeof course.curso === 'string' && course.curso.trim().length > 0
    && typeof course.materia === 'string' && course.materia.trim().length > 0
    && typeof course.descripcion === 'string'
    && typeof course.codigo_acceso === 'string' && /^[A-HJ-NP-Z2-9]{10}$/.test(course.codigo_acceso)
}

export async function getCourses(options) {
  const data = await request(options)
  if (!Array.isArray(data?.courses) || !data.courses.every(isCourse)) {
    throw new CourseError('El servidor devolvió una lista de cursos inválida.', 502)
  }
  return data.courses
}

export async function createCourse({ curso, descripcion, materia }) {
  const data = await request({ body: { curso, descripcion, materia } })
  if (!isCourse(data?.course)) {
    throw new CourseError('No se pudo confirmar la creación. Recargá Mis cursos antes de volver a intentarlo.', 502)
  }
  return data.course
}

export async function joinCourse(codigo_acceso) {
  const data = await request({
    path: '/join',
    body: { codigo_acceso: codigo_acceso.trim().toUpperCase() },
  })
  if (!isCourse(data?.course)) {
    throw new CourseError('No se pudo confirmar la inscripción al curso. Intentá nuevamente.', 502)
  }
  return data.course
}

export async function getEnrolledCourses(options) {
  const data = await request({ ...options, path: '/enrolled' })
  if (!Array.isArray(data?.courses) || !data.courses.every(isCourse)) {
    throw new CourseError('El servidor devolvió una lista de cursos inválida.', 502)
  }
  return data.courses
}
