import assert from 'node:assert/strict'
import test from 'node:test'
import { AuthError, register } from '../src/services/auth.js'

const payload = {
  user_name: 'alumno', email: 'alumno@example.com', password: 'Clave de prueba 2026!',
  nombre: 'Ana', apellido: 'Pérez', DNI: '01234567', fecha_nacimiento: '2010-05-10',
  tipo_institucion: 'tecnica', anio_cursada: 7, img_profile: null,
}
const success = { user: { id: 10, id_rol: 3, id_profile: 20 }, profile: { id: 20 } }

test('register sends JSON through the auth proxy and returns the created student', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(success, { status: 201 }))
  assert.deepEqual(await register(payload), success)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/auth/register')
  assert.equal(options.method, 'POST')
  assert.equal(options.credentials, 'include')
  assert.equal(options.headers['Content-Type'], 'application/json')
  assert.deepEqual(JSON.parse(options.body), payload)
})

test('register surfaces duplicate and validation errors for display in the form', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(
    { message: 'El DNI ya está registrado' }, { status: 409 }
  ))
  await assert.rejects(register(payload), { name: 'AuthError', status: 409, message: 'El DNI ya está registrado' })
  fetchMock.mock.mockImplementation(async () => Response.json({ errors: [
    { msg: 'Ingresá un email válido' }, { msg: 'Ingresá un email válido' }, { msg: 'El DNI debe ser texto' },
  ] }, { status: 400 }))
  await assert.rejects(register(payload), {
    status: 400, message: 'Ingresá un email válido. El DNI debe ser texto',
  })
})

test('register rejects server and network failures and allows an explicit retry', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response('Bad gateway', { status: 502 }))
  await assert.rejects(register(payload), { name: 'AuthError', status: 502 })
  fetchMock.mock.mockImplementation(async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(register(payload), { name: 'AuthError', status: 0 })
  fetchMock.mock.mockImplementation(async () => Response.json(success, { status: 201 }))
  assert.deepEqual(await register(payload), success)
})

test('register does not report success for an empty response or an unconfirmed creation', async (context) => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }))
  await assert.rejects(register(payload), AuthError)
  for (const response of [{ message: 'ok' }, { user: { id: 1 } }, { ...success, profile: { id: null } }]) {
    fetchMock.mock.mockImplementation(async () => Response.json(response))
    await assert.rejects(register(payload), /confirmar el registro/)
  }
})
