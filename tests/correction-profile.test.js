import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { parseCorrectionProfile } from '../src/utils/correctionProfile.js'

const response = JSON.parse(readFileSync(
  new URL('./fixtures/correction-profile.json', import.meta.url), 'utf8'
))

test('reads the supplied n8n array and preserves the 14 topic scores and single practice item', () => {
  const original = structuredClone(response)
  const profile = parseCorrectionProfile(response, response[0].test_id)

  assert.deepEqual(profile, response[0])
  assert.deepEqual(parseCorrectionProfile(profile), profile)
  assert.equal(profile.temas.length, 14)
  assert.equal(profile.temas[0].dominio_pct, 62.1)
  assert.equal(profile.practica_diaria.cantidad_recomendada, 5)
  assert.equal(profile.practica_diaria.cola_inicial.length, 1)
  assert.deepEqual(response, original)
})

test('preserves zero and complete mastery without confusing either with missing data', () => {
  const profile = structuredClone(response[0])
  profile.temas[0].dominio_pct = 0
  profile.temas[1].dominio_pct = 100
  assert.deepEqual(parseCorrectionProfile(profile), profile)
})

test('does not attach a profile from a different test', () => {
  assert.equal(parseCorrectionProfile(response, 'OTHER_TEST'), null)
})

test('rejects acknowledgements, invalid percentages and incomplete practice items', () => {
  const invalidPercentage = structuredClone(response[0])
  invalidPercentage.temas[0].dominio_pct = 162.1
  const missingSkill = structuredClone(response[0])
  delete missingSkill.practica_diaria.cola_inicial[0].habilidad

  for (const payload of [null, [], [response[0], response[0]], { ok: true }, invalidPercentage, missingSkill]) {
    assert.equal(parseCorrectionProfile(payload), null)
  }
})

test('accepts an empty topic breakdown and practice queue without inventing content', () => {
  const profile = structuredClone(response[0])
  profile.temas = []
  profile.practica_diaria = { cantidad_recomendada: 0, cola_inicial: [] }
  assert.deepEqual(parseCorrectionProfile(profile), profile)
})
