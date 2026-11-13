import assert from 'node:assert/strict'
import test from 'node:test'
import { getSession, login, logout } from '../src/services/auth.js'
import { getLoginDestination } from '../src/auth/loginDestination.js'

const session = {
  user: { id: 1, id_profile: 2, user_name: 'alumno', email: 'alumno@example.com', id_rol: 3 },
  profile: { id: 2, nombre: 'Ana', anio_cursada: 3, test_diagnostic_completed: false },
}

test('login sends credentials using the cookie-based auth API', async (context) => {
  const credentials = { user_name: 'alumno@example.com', password: ' Clave con espacios ' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({ user: session.user }))
  await login(credentials)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/auth/login')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(options.body), credentials)
})

test('login accepts an empty success response because the session is stored in the cookie', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
  assert.deepEqual(await login({ user_name: 'alumno', password: 'Clave válida' }), {})
  assert.equal(fetchMock.mock.calls[0].arguments[1].credentials, 'include')
})

test('login propagates rejected credentials and connection failures without exposing the password', async (context) => {
  const credentials = { user_name: 'alumno', password: 'private-test-value' }
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(
    { message: 'Credenciales inválidas' }, { status: 401 }
  ))
  await assert.rejects(login(credentials), { name: 'AuthError', status: 401, message: 'Credenciales inválidas' })
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(login(credentials), { name: 'AuthError', status: 0 })
})

test('session recovery sends cookies and returns the matching user and profile', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(session))
  assert.deepEqual(await getSession(), session)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/auth/profile')
  assert.equal(options.credentials, 'include')
  assert.equal(options.cache, 'no-store')
})

test('session recovery accepts matching Mongo-style string IDs from the API', async (context) => {
  const id = '6af10ba16fd5f65dcf449bdd'
  const mongoSession = {
    user: { id, id_rol: 3, id_profile: id, user_name: 'alumno', email: 'alumno@example.com' },
    profile: { id, nombre: 'Ana', anio_cursada: 4, test_diagnostic_completed: false },
  }
  context.mock.method(globalThis, 'fetch', async () => Response.json(mongoSession))
  assert.deepEqual(await getSession(), mongoSession)
})

test('an expired session becomes anonymous, while server errors remain recoverable errors', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(
    { message: 'Sesión inválida o expirada' }, { status: 401 }
  ))
  assert.equal(await getSession(), null)
  fetchMock.mock.mockImplementation(async () => Response.json({ message: 'Servicio no disponible' }, { status: 503 }))
  await assert.rejects(getSession(), { status: 503 })
  fetchMock.mock.mockImplementation(async () => Response.json({ message: 'Cannot GET /api/auth/profile' }, { status: 404 }))
  await assert.rejects(getSession(), { status: 404 })
})

test('session recovery preserves either boolean diagnostic state from the backend', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(session))
  for (const completed of [false, true]) {
    const response = { ...session, profile: { ...session.profile, test_diagnostic_completed: completed } }
    fetchMock.mock.mockImplementation(async () => Response.json(response))
    assert.equal((await getSession()).profile.test_diagnostic_completed, completed)
  }
})

test('session recovery accepts a missing diagnostic state and rejects only invalid non-boolean values', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(session))
  const sessionWithoutDiagnostic = { ...session, profile: { ...session.profile } }
  delete sessionWithoutDiagnostic.profile.test_diagnostic_completed
  fetchMock.mock.mockImplementation(async () => Response.json(sessionWithoutDiagnostic))
  assert.deepEqual(await getSession(), sessionWithoutDiagnostic)

  for (const value of [null, 0, 1, 'false', 'true']) {
    fetchMock.mock.mockImplementation(async () => Response.json({
      ...session, profile: { ...session.profile, test_diagnostic_completed: value },
    }))
    await assert.rejects(getSession(), /recuperar tu perfil/)
  }
})

test('session recovery rejects incomplete or mismatched account data', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({}))
  for (const data of [
    {}, { user: session.user }, { ...session, profile: {} },
    { ...session, user: { ...session.user, id: 0 } },
    { ...session, user: { ...session.user, id: ' ' } },
    { ...session, profile: { ...session.profile, id: 9 } },
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json(data))
    await assert.rejects(getSession(), /recuperar tu perfil/)
  }
})

test('teachers recover their own profile without a student diagnostic state', async (context) => {
  const teacherSession = {
    user: { ...session.user, id: 'teacher-1', id_rol: 2, id_profile: null, id_profile_docente: 'profile-12' },
    profile: { id: 'profile-12', nombre: 'Docente', anio_cursada: 4 },
  }
  context.mock.method(globalThis, 'fetch', async () => Response.json(teacherSession))
  assert.deepEqual(await getSession(), teacherSession)
})

test('teachers can use the shared id_profile relation returned by the API', async (context) => {
  const id = '6af10ba16fd5f65dcf449bdd'
  const teacherSession = {
    user: { id, id_rol: 2, id_profile: id, user_name: 'docente', email: 'docente@example.com' },
    profile: { id, nombre: 'Docente', anio_cursada: 4 },
  }
  context.mock.method(globalThis, 'fetch', async () => Response.json(teacherSession))
  assert.deepEqual(await getSession(), teacherSession)
})

test('teacher sessions reject missing or mismatched profile links', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json({}))
  for (const user of [
    { ...session.user, id_rol: 2, id_profile: null, id_profile_docente: null },
    { ...session.user, id_rol: 2, id_profile: null, id_profile_docente: 99 },
    { ...session.user, id_rol: 2, id_profile: 99, id_profile_docente: null },
    { ...session.user, id_rol: 2, id_profile: session.profile.id, id_profile_docente: 99 },
  ]) {
    fetchMock.mock.mockImplementation(async () => Response.json({ user, profile: session.profile }))
    await assert.rejects(getSession(), /recuperar tu perfil/)
  }
})

test('session requests retain their timeout even when the caller provides a cleanup signal', async (context) => {
  const cleanup = new AbortController()
  const deadline = new AbortController()
  context.mock.method(AbortSignal, 'timeout', milliseconds => {
    assert.equal(milliseconds, 15000)
    return deadline.signal
  })
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(session))
  await getSession({ signal: cleanup.signal })
  const combined = fetchMock.mock.calls[0].arguments[1].signal
  assert.equal(combined.aborted, false)
  deadline.abort(new DOMException('Timed out', 'TimeoutError'))
  assert.equal(combined.aborted, true)
  assert.equal(combined.reason.name, 'TimeoutError')
})

test('session requests can be cancelled when the provider unmounts', async (context) => {
  const cleanup = new AbortController()
  context.mock.method(globalThis, 'fetch', async (_url, { signal }) => {
    cleanup.abort()
    signal.throwIfAborted()
  })
  await assert.rejects(getSession({ signal: cleanup.signal }), { name: 'AbortError' })
})

test('logout clears the server session through a credentialed POST', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
  await logout()
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/auth/logout')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
})

test('post-login destinations preserve internal routes and reject external URLs and auth loops', () => {
  assert.equal(getLoginDestination('/library?tema=algebra#ejercicios'), '/library?tema=algebra#ejercicios')
  assert.equal(getLoginDestination('/progress'), '/progress')
  for (const from of [
    undefined, null, {}, '', 'https://example.com', '//example.com', '/\\example.com',
    'javascript:alert(1)', '/login', '/login?from=/', '/register#form', '/library/../login',
  ]) {
    assert.equal(getLoginDestination(from), '/')
  }
})
