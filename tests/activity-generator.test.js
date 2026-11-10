import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DEFAULT_ACTIVITY_GENERATION_PROMPT,
  getGeneratedActivities,
  toActivityDraft,
} from '../src/utils/activityGenerator.js'
import {
  buildActivityGenerationPrompt,
  getActivityGeneratorWebhookUrl,
  generateActivityFromFiles,
} from '../src/services/activityGenerator.js'

test('activity generation prompt defaults and declares the editor JSON contract', () => {
  const prompt = buildActivityGenerationPrompt('')
  assert.ok(prompt.startsWith(DEFAULT_ACTIVITY_GENERATION_PROMPT))
  assert.match(prompt, /"tipo": "opcion_unica"/)
  assert.match(prompt, /"indiceCorrecta": 0/)
  assert.match(prompt, /al menos dos opciones/)
})

test('generated activity results support objects, JSON strings and arrays', () => {
  const activity = {
    titulo: 'Fracciones',
    descripcion: 'Repaso',
    ejercicios: [],
  }
  assert.deepEqual(getGeneratedActivities({ titulo: activity.titulo, ejercicios: [] }).activities, [
    { titulo: activity.titulo, ejercicios: [] },
  ])
  assert.deepEqual(getGeneratedActivities({ resultado: JSON.stringify(activity) }).activities, [activity])
  assert.deepEqual(getGeneratedActivities({ resultado: [activity, { json: activity }] }).activities, [activity, activity])
  assert.equal(getGeneratedActivities({ error_parseo: true, resultado: 'texto' }).parseError, true)
  assert.match(getGeneratedActivities({ resultado: 'no json' }).error, /JSON/)
})

test('generated activities become editor drafts with fresh client IDs and the correct option selected', () => {
  let id = 0
  const draft = toActivityDraft({
    titulo: 'Operaciones',
    ejercicios: [{
      enunciado: '¿Cuánto es 2 + 2?',
      opciones: [{ texto: '3' }, { texto: '4' }],
      indiceCorrecta: 1,
    }],
  }, () => `new-${id++}`)

  assert.equal(draft.titulo, 'Operaciones')
  assert.equal(draft.ejercicios[0].tipo, 'opcion_unica')
  assert.equal(draft.ejercicios[0].correctOptionId, 'new-1')
  assert.equal(draft.ejercicios[0].opciones[1].clientId, 'new-1')
  assert.equal(draft.ejercicios[0]._id, undefined)
})

test('files and prompt are posted as named multipart fields without a manual content type', async context => {
  const file = new Blob(['contenido'], { type: 'text/plain' })
  Object.defineProperty(file, 'name', { value: 'unidad.txt' })
  const expectedWebhookUrl = getActivityGeneratorWebhookUrl()
  const fetchMock = context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, expectedWebhookUrl)
    assert.equal(options.method, 'POST')
    assert.equal(options.headers, undefined)
    assert.ok(options.body instanceof FormData)
    assert.equal(options.body.get('archivo1').name, 'unidad.txt')
    assert.match(options.body.get('prompt'), /"ejercicios"/)
    return Response.json({ success: true, data: { titulo: 'Unidad', ejercicios: [] } })
  })

  const data = await generateActivityFromFiles({ files: [file], prompt: 'Crea ejercicios' })
  assert.deepEqual(data, { titulo: 'Unidad', ejercicios: [] })
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('generation reports non-success HTTP and malformed webhook responses', async context => {
  const fetchMock = context.mock.method(globalThis, 'fetch', async () => Response.json(
    { message: 'Webhook no disponible' },
    { status: 503 },
  ))
  await assert.rejects(
    generateActivityFromFiles({ files: [new Blob(['x'])], prompt: 'Genera' }),
    /Webhook no disponible/,
  )

  fetchMock.mock.mockImplementation(async () => Response.json({ success: false, data: null }))
  await assert.rejects(
    generateActivityFromFiles({ files: [new Blob(['x'])], prompt: 'Genera' }),
    /respuesta incompleta/,
  )
})
