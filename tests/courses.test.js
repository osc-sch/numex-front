import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createCourse,
  createCourseSection,
  createSectionPost,
  deleteCourse,
  deleteCourseSection,
  deleteSectionPost,
  getCourse,
  getCourseSections,
  getCourses,
  getEnrolledCourse,
  getEnrolledCourses,
  getSectionPosts,
  getSectionPost,
  joinCourse,
  updateCourse,
  updateCourseSection,
  updateSectionPost,
} from '../src/services/courses.js'

const course = {
  _id: 'course-1', docente: 'teacher-10', curso: '4° A', descripcion: 'Funciones.', materia: 'Matemática',
  codigo_acceso: 'ABCD2345EF', createdAt: '2026-10-20T12:00:00.000Z',
}

test('courses are fetched through the proxy with session cookies and no cached data', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ cursos: [course] }))
  assert.deepEqual(await getCourses(), [course])
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses')
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
  fetchMock.mock.mockImplementation(async () => Response.json({ cursos: [] }))
  assert.deepEqual(await getCourses(), [])
})

test('course creation sends only editable fields and returns the persisted access code', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ curso: course }, { status: 201 }))
  assert.deepEqual(await createCourse({ ...course, id_docente: 99, codigo_acceso: 'ignored' }), course)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), { curso: '4° A', descripcion: 'Funciones.', materia: 'Matemática' })
})

test('a course can be fetched by ID using its authenticated session', async context => {
  const id = 'course/123'
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ curso: course }))
  assert.deepEqual(await getCourse(id), course)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses/course%2F123')
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
})

test('course updates use PUT and only send editable fields', async context => {
  const updatedCourse = { ...course, curso: '5° A' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ curso: updatedCourse }))
  assert.deepEqual(await updateCourse(course._id, updatedCourse), updatedCourse)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/courses/${course._id}`)
  assert.equal(options.method, 'PUT')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), {
    curso: '5° A', descripcion: 'Funciones.', materia: 'Matemática',
  })
})

test('course deletion accepts an empty success response', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
  await deleteCourse(course._id)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/courses/${course._id}`)
  assert.equal(options.method, 'DELETE')
  assert.equal(options.credentials, 'include')
})

test('course list returns the server records unchanged', async context => {
  const response = { cursos: [course] }
  context.mock.method(globalThis, 'fetch', async () => Response.json(response))
  assert.deepEqual(await getCourses(), response.cursos)
})

test('course list reads populated courses and filters by the teacher profile ID', async context => {
  const teacherCourse = {
    ...course,
    _id: 'teacher-course',
    docente: { _id: 'teacher-account-id', tipo_cuenta: 'docente', profile: 'teacher-profile-id' },
  }
  const otherCourse = {
    ...course,
    _id: 'other-course',
    docente: { _id: 'other-account-id', tipo_cuenta: 'docente', profile: 'another-teacher-id' },
  }
  context.mock.method(globalThis, 'fetch', async () => Response.json({
    cursos: [otherCourse, teacherCourse],
  }))
  assert.deepEqual(
    await getCourses({ teacherIds: ['teacher-profile-id'] }),
    [teacherCourse],
  )
})

test('students can join with a normalized code and load enrolled courses', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ curso: course }, { status: 201 }))
  assert.deepEqual(await joinCourse('  abcD2345ef '), course)
  let [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses/join')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
  assert.deepEqual(JSON.parse(options.body), { codigo_acceso: 'ABCD2345EF' })

  fetchMock.mock.mockImplementation(async () => Response.json({ cursos: [course] }))
  assert.deepEqual(await getEnrolledCourses(), [course])
  const [enrolledUrl, enrolledOptions] = fetchMock.mock.calls[1].arguments
  assert.equal(enrolledUrl, '/api/courses/enrolled')
  assert.equal(enrolledOptions.method, 'GET')
  assert.equal(enrolledOptions.credentials, 'include')
  assert.equal(enrolledOptions.cache, 'no-store')
})

test('a student can fetch only an enrolled course by ID', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ curso: course }))
  assert.deepEqual(await getEnrolledCourse('course/123'), course)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses/enrolled/course%2F123')
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
})

test('course sections can be read, created, updated and deleted using their API routes', async context => {
  const section = { _id: 'section-1', nombre: 'Funciones', descripcion: 'Contenido.', visible: true, orden: 0 }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ secciones: [section] }))
  assert.deepEqual(await getCourseSections(course._id), [section])
  let [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/courses/${course._id}/sections`)
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')

  fetchMock.mock.mockImplementation(async () => Response.json({ seccion: section }, { status: 201 }))
  assert.deepEqual(await createCourseSection(course._id, { nombre: section.nombre, descripcion: section.descripcion }), section)
  const [, createOptions] = fetchMock.mock.calls[1].arguments
  assert.equal(createOptions.method, 'POST')
  assert.deepEqual(JSON.parse(createOptions.body), { nombre: 'Funciones', descripcion: 'Contenido.' })

  const updatedSection = { ...section, visible: false }
  fetchMock.mock.mockImplementation(async () => Response.json({ seccion: updatedSection }))
  assert.deepEqual(await updateCourseSection(course._id, section._id, { visible: false }), updatedSection)
  const [updateUrl, updateOptions] = fetchMock.mock.calls[2].arguments
  assert.equal(updateUrl, `/api/courses/${course._id}/sections/${section._id}`)
  assert.equal(updateOptions.method, 'PUT')
  assert.deepEqual(JSON.parse(updateOptions.body), { visible: false })

  fetchMock.mock.mockImplementation(async () => Response.json({ message: 'Seccion eliminada correctamente' }))
  await deleteCourseSection(course._id, section._id)
  assert.equal(fetchMock.mock.calls[3].arguments[1].method, 'DELETE')
})

test('section publications support the documented list and write routes', async context => {
  const sectionId = 'section-1'
  const postId = 'post-1'
  const post = {
    _id: postId,
    tipo: 'material',
    titulo: 'Números reales',
    descripcion: 'Apuntes de la unidad',
    contenido: '# Números reales',
    url: 'https://example.com/material',
    visible: true,
    orden: 0,
  }
  const collectionUrl = `/api/courses/${course._id}/sections/${sectionId}/posts`
  const itemUrl = `${collectionUrl}/${postId}`
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ publicaciones: [post] }))

  assert.deepEqual(await getSectionPosts(course._id, sectionId), [post])
  assert.equal(fetchMock.mock.calls[0].arguments[0], collectionUrl)
  assert.equal(fetchMock.mock.calls[0].arguments[1].method, 'GET')

  fetchMock.mock.mockImplementation(async () => Response.json({ publicacion: post }, { status: 201 }))
  assert.deepEqual(await createSectionPost(course._id, sectionId, {
    tipo: post.tipo,
    titulo: post.titulo,
    descripcion: post.descripcion,
    contenido: post.contenido,
    url: post.url,
  }), post)
  const [, createOptions] = fetchMock.mock.calls[1].arguments
  assert.equal(createOptions.method, 'POST')
  assert.equal(createOptions.credentials, 'include')
  assert.deepEqual(JSON.parse(createOptions.body), {
    tipo: post.tipo,
    titulo: post.titulo,
    descripcion: post.descripcion,
    contenido: post.contenido,
    url: post.url,
  })

  const updatedPost = { ...post, visible: false }
  fetchMock.mock.mockImplementation(async () => Response.json({ publicacion: updatedPost }))
  assert.deepEqual(await updateSectionPost(course._id, sectionId, postId, { visible: false }), updatedPost)
  const [updateUrl, updateOptions] = fetchMock.mock.calls[2].arguments
  assert.equal(updateUrl, itemUrl)
  assert.equal(updateOptions.method, 'PUT')
  assert.deepEqual(JSON.parse(updateOptions.body), { visible: false })

  fetchMock.mock.mockImplementation(async () => Response.json({ message: 'Publicacion eliminada correctamente' }))
  await deleteSectionPost(course._id, sectionId, postId)
  assert.equal(fetchMock.mock.calls[3].arguments[0], itemUrl)
  assert.equal(fetchMock.mock.calls[3].arguments[1].method, 'DELETE')
})

test('a student can fetch a single section publication through the detail route', async context => {
  const post = { _id: 'post-1', tipo: 'actividad', titulo: 'Resolver', contenido: 'Consigna' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ publicacion: post }))
  assert.deepEqual(await getSectionPost(course._id, 'section-1', post._id), post)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/courses/${course._id}/sections/section-1/posts/${post._id}`)
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
})

test('course requests report validation, permissions and network failures', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({
    errors: [{ msg: 'Ingresá la materia' }, { msg: 'Ingresá la materia' }],
  }, { status: 400 }))
  await assert.rejects(createCourse({}), { name: 'CourseError', status: 400, message: 'Ingresá la materia' })
  fetchMock.mock.mockImplementation(async () => Response.json({ message: 'Solo docentes' }, { status: 403 }))
  await assert.rejects(getCourses(), { status: 403, message: 'Solo docentes' })
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(getCourses(), { status: 0 })
})

test('courses are passed through unchanged even if optional fields are absent', async context => {
  const responseCourse = { _id: 'course-2', curso: '4° B', materia: 'Matemática' }
  context.mock.method(globalThis, 'fetch', async () => Response.json({ courses: [responseCourse] }))
  assert.deepEqual(await getCourses(), [responseCourse])
})

test('leaving the courses page cancels the pending list request', async context => {
  const controller = new AbortController()
  context.mock.method(globalThis, 'fetch', (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true })
  }))
  const request = getCourses({ signal: controller.signal })
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
})
