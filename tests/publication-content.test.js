import assert from 'node:assert/strict'
import test from 'node:test'
import {
  decodePublicationContent,
  encodePublicationContent,
  TIPTAP_DOCUMENT_PREFIX,
} from '../src/utils/publicationContent.js'

test('round-trips structured Tiptap content and preserves LaTeX backslashes', () => {
  const document = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Una fracción: ' },
          { type: 'inlineMath', attrs: { latex: String.raw`\frac{a}{b}` } },
        ],
      },
      { type: 'blockMath', attrs: { latex: String.raw`\int_0^1 x^2\,dx` } },
    ],
  }

  const stored = encodePublicationContent(document)
  assert.ok(stored.startsWith(TIPTAP_DOCUMENT_PREFIX))
  assert.deepEqual(decodePublicationContent(stored), { type: 'json', content: document })
})

test('keeps existing Markdown content as Markdown', () => {
  const markdown = String.raw`## Ecuación

La respuesta es $\sqrt{x}$ y $$x^2 + 1$$.`
  assert.deepEqual(decodePublicationContent(markdown), { type: 'markdown', content: markdown })
})

test('does not expose malformed or unsafe structured content as a Tiptap document', () => {
  const unsafeDocuments = [
    { type: 'doc', content: [{ type: 'html', content: '<script>alert(1)</script>' }] },
    {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [
        { type: 'link', attrs: { href: 'javascript:alert(1)' } },
      ] }] }],
    },
  ]

  for (const document of unsafeDocuments) {
    assert.equal(decodePublicationContent(encodePublicationContent(document)).type, 'markdown')
  }
  assert.equal(decodePublicationContent(`${TIPTAP_DOCUMENT_PREFIX}{`).type, 'markdown')
})
