import assert from 'node:assert/strict'
import test from 'node:test'
import { getStudentDisplayName } from '../src/utils/studentDisplayName.js'

test('student names prefer the full name and fall back to username', () => {
  assert.equal(getStudentDisplayName({ nombreCompleto: '  Ana Pérez ', username: 'aperez' }), 'Ana Pérez')
  assert.equal(getStudentDisplayName({ nombre: 'Ana', apellido: 'Pérez', username: 'aperez' }), 'Ana Pérez')
  assert.equal(getStudentDisplayName({ username: 'aperez' }), 'aperez')
  assert.equal(getStudentDisplayName(null), 'Alumno')
})
