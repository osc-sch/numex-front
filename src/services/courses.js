export class CourseError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'CourseError'
    this.status = status
  }
}

export async function getCourses({ signal, teacherIds } = {}) {
  let response
  try {
    response = await fetch('/api/courses', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseError(
      data.message || `No se pudieron cargar los cursos (HTTP ${response.status}).`,
      response.status,
    )
  }
  const payload = data ?? {}
  const courses = Array.isArray(payload) ? payload : payload.cursos ?? payload.courses ?? []
  const ownerIds = [...new Set((teacherIds ?? []).filter(id => id != null).map(String))]
  if (!ownerIds.length) return courses
  return courses.filter(course => {
    const docente = course?.docente
    const docenteIds = docente && typeof docente === 'object'
      ? [docente._id, docente.profile]
      : [docente]
    return docenteIds.some(id => id != null && ownerIds.includes(String(id)))
  })
}

export async function getCourse(id, { signal } = {}) {
  let response
  try {
    response = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseError(
      data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  if (!Object.keys(data).length) {
    throw new CourseError('El servidor devolvió una respuesta inválida.', response.status)
  }
  return data.curso ?? data.course ?? data
}

export async function createCourse({ curso, descripcion, materia }) {
  let response
  try {
    response = await fetch('/api/courses', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, descripcion, materia }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = data.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new CourseError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  if (!Object.keys(data).length) {
    throw new CourseError('El servidor devolvió una respuesta inválida.', response.status)
  }
  return data.curso ?? data.course ?? data
}

export async function updateCourse(id, { curso, descripcion, materia }) {
  let response
  try {
    response = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'PUT',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ curso, descripcion, materia }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = data.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new CourseError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  if (!Object.keys(data).length) {
    throw new CourseError('El servidor devolvió una respuesta inválida.', response.status)
  }
  return data.curso ?? data.course ?? data
}

export async function deleteCourse(id) {
  let response
  try {
    response = await fetch(`/api/courses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      credentials: 'include',
      cache: 'no-store',
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new CourseError(
      data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
}

export async function joinCourse(codigo_acceso) {
  let response
  try {
    response = await fetch('/api/courses/join', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo_acceso: codigo_acceso.trim().toUpperCase() }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = data.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new CourseError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  if (!Object.keys(data).length) {
    throw new CourseError('El servidor devolvió una respuesta inválida.', response.status)
  }
  return data.curso ?? data.course ?? data
}

export async function getEnrolledCourses({ signal } = {}) {
  let response
  try {
    response = await fetch('/api/courses/enrolled', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseError(
      data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  return Array.isArray(data) ? data : data.cursos ?? data.courses ?? []
}

export async function getEnrolledCourse(id, { signal } = {}) {
  let response
  try {
    response = await fetch(`/api/courses/enrolled/${encodeURIComponent(id)}`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseError(
      data.message || `La API respondió con HTTP ${response.status}. Revisá la configuración del servidor e intentá nuevamente.`,
      response.status,
    )
  }
  if (!Object.keys(data).length) {
    throw new CourseError('El servidor devolvió una respuesta inválida.', response.status)
  }
  return data.curso ?? data.course ?? data
}

export async function getCourseSections(courseId, { signal } = {}) {
  let response
  try {
    response = await fetch(`/api/courses/${encodeURIComponent(courseId)}/sections`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new CourseError(
      data.message || `No se pudieron cargar las secciones (HTTP ${response.status}).`,
      response.status,
    )
  }
  return Array.isArray(data) ? data : data.secciones ?? []
}

async function requestSection(path, { method, body, signal } = {}) {
  let response
  try {
    response = await fetch(path, {
      method,
      credentials: 'include',
      cache: 'no-store',
      ...(body ? {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      } : {}),
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new CourseError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const messages = data.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new CourseError(
      messages?.length ? [...new Set(messages)].join('. ')
        : data.message || `La API respondió con HTTP ${response.status}. Intentá nuevamente.`,
      response.status,
    )
  }
  return data
}

export async function createCourseSection(courseId, { nombre, descripcion }) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections`,
    { method: 'POST', body: { nombre, descripcion } },
  )
  if (!data.seccion) {
    throw new CourseError('El servidor devolvió una respuesta inválida.')
  }
  return data.seccion
}

export async function updateCourseSection(courseId, sectionId, changes) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`,
    { method: 'PUT', body: changes },
  )
  if (!data.seccion) {
    throw new CourseError('El servidor devolvió una respuesta inválida.')
  }
  return data.seccion
}

export async function deleteCourseSection(courseId, sectionId) {
  await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}`,
    { method: 'DELETE' },
  )
}

export async function getSectionPosts(courseId, sectionId, { signal } = {}) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts`,
    { method: 'GET', signal },
  )
  return Array.isArray(data) ? data : data.publicaciones ?? []
}

export async function getSectionPost(courseId, sectionId, postId, { signal } = {}) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/${encodeURIComponent(postId)}`,
    { method: 'GET', signal },
  )
  if (!data.publicacion) {
    throw new CourseError('El servidor devolvió una respuesta inválida.')
  }
  return data.publicacion
}

export async function createSectionPost(courseId, sectionId, post) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts`,
    { method: 'POST', body: post },
  )
  if (!data.publicacion) {
    throw new CourseError('El servidor devolvió una respuesta inválida.')
  }
  return data.publicacion
}

export async function updateSectionPost(courseId, sectionId, postId, changes) {
  const data = await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/${encodeURIComponent(postId)}`,
    { method: 'PUT', body: changes },
  )
  if (!data.publicacion) {
    throw new CourseError('El servidor devolvió una respuesta inválida.')
  }
  return data.publicacion
}

export async function deleteSectionPost(courseId, sectionId, postId) {
  await requestSection(
    `/api/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts/${encodeURIComponent(postId)}`,
    { method: 'DELETE' },
  )
}
