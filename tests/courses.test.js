import assert from 'node:assert/strict'
import test from 'node:test'
import { CourseError, createCourse, getCourses, getEnrolledCourses, joinCourse } from '../src/services/courses.js'

const course = {
  id: 1, id_docente: 10, curso: '4° A', descripcion: 'Funciones.', materia: 'Matemática',
  codigo_acceso: 'ABCD2345EF', created_at: '2026-10-20T12:00:00.000Z',
}

test('courses are fetched through the proxy with session cookies and no cached data', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ courses: [course] }))
  assert.deepEqual(await getCourses(), [course])
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses')
  assert.equal(options.method, 'GET')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
  fetchMock.mock.mockImplementation(async () => Response.json({ courses: [] }))
  assert.deepEqual(await getCourses(), [])
})

test('course creation sends only editable fields and returns the persisted access code', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ course }, { status: 201 }))
  assert.deepEqual(await createCourse({ ...course, id_docente: 99, codigo_acceso: 'ignored' }), course)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.deepEqual(JSON.parse(options.body), { curso: '4° A', descripcion: 'Funciones.', materia: 'Matemática' })
})

test('students can join with a normalized code and load enrolled courses', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ course }, { status: 201 }))
  assert.deepEqual(await joinCourse('  abcD2345ef '), course)
  let [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/courses/join')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
  assert.deepEqual(JSON.parse(options.body), { codigo_acceso: 'ABCD2345EF' })

  fetchMock.mock.mockImplementation(async () => Response.json({ courses: [course] }))
  assert.deepEqual(await getEnrolledCourses(), [course])
  const [enrolledUrl, enrolledOptions] = fetchMock.mock.calls[1].arguments
  assert.equal(enrolledUrl, '/api/courses/enrolled')
  assert.equal(enrolledOptions.method, 'GET')
  assert.equal(enrolledOptions.credentials, 'include')
  assert.equal(enrolledOptions.cache, 'no-store')
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

test('malformed data and unconfirmed creations are not presented as success', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch')
  for (const payload of [{}, { courses: null }, { courses: [{}] }, { courses: [{ ...course, codigo_acceso: null }] }]) {
    fetchMock.mock.mockImplementation(async () => Response.json(payload))
    await assert.rejects(getCourses(), CourseError)
  }
  for (const payload of [{}, { course: { ...course, id: null } }, { course: { ...course, codigo_acceso: 'invalid' } }]) {
    fetchMock.mock.mockImplementation(async () => Response.json(payload, { status: 201 }))
    await assert.rejects(createCourse(course), /Recargá Mis cursos/)
  }
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 204 }))
  await assert.rejects(createCourse(course), CourseError)
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
