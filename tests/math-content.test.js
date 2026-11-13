import assert from 'node:assert/strict'
import test from 'node:test'
import process from 'node:process'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'

test('MathContent renders Markdown, inline and block math, and handles unsafe or invalid input', async () => {
  const vite = await createServer({
    appType: 'custom',
    configFile: false,
    logLevel: 'silent',
    root: process.cwd(),
    server: { middlewareMode: true },
  })

  try {
    const { default: MathContent } = await vite.ssrLoadModule('/src/components/MathContent.jsx')
    const content = String.raw`## Ecuaciones

- Factoriza $x^2 + 3x + 2$.
- Raíz: $\sqrt{x}$; integral: $\int_0^1 x^2\,dx$; suma: $\sum_{i=1}^{n} i$.

$$
\frac{a}{b} = x^2
$$`
    const markup = renderToStaticMarkup(React.createElement(MathContent, { content }))

    assert.match(markup, /<h2>Ecuaciones<\/h2>/)
    assert.match(markup, /<ul>/)
    assert.match(markup, /class="katex"/)
    assert.match(markup, /class="katex-display"/)
    assert.match(markup, /x\^2/)

    const inlineMarkup = renderToStaticMarkup(React.createElement(MathContent, {
      content: String.raw`$x^2$ y $\frac{a}{b}$`,
      inline: true,
    }))
    assert.match(inlineMarkup, /class="math-content is-inline"/)
    assert.doesNotMatch(inlineMarkup, /<p>/)

    const invalidMarkup = renderToStaticMarkup(React.createElement(MathContent, {
      content: String.raw`$\notARealCommand{x}$`,
    }))
    assert.match(invalidMarkup, /mathcolor="#cc0000"/)

    const unsafeMarkup = renderToStaticMarkup(React.createElement(MathContent, {
      content: String.raw`<script>alert(1)</script> and $\href{javascript:alert(1)}{link}$`,
    }))
    assert.doesNotMatch(unsafeMarkup, /<script\b/i)
    assert.doesNotMatch(unsafeMarkup, /href="javascript:/i)
  } finally {
    await vite.close()
  }
})
