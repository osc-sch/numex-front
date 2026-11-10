import assert from 'node:assert/strict'
import test from 'node:test'
import { getStudentActivityStatus } from '../src/utils/studentActivityStatus.js'

test('activity status comes from the server-provided student progress', () => {
  assert.equal(getStudentActivityStatus({ progresoAlumno: { estado: 'pendiente' } }), 'pendiente')
  assert.equal(getStudentActivityStatus({ progresoAlumno: { estado: 'en_progreso' } }), 'en_progreso')
  assert.equal(getStudentActivityStatus({ progresoAlumno: { estado: 'completada' } }), 'completada')
  assert.equal(
    getStudentActivityStatus({ progresoAlumno: { estado: 'en_progreso', completada: true } }),
    'en_progreso',
  )
  assert.equal(getStudentActivityStatus({}), 'pendiente')
})
