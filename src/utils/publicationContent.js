export const TIPTAP_DOCUMENT_PREFIX = 'NUMEX_TIPTAP_V1\n'

const allowedNodes = new Set([
  'doc',
  'paragraph',
  'heading',
  'text',
  'hardBreak',
  'bulletList',
  'orderedList',
  'listItem',
  'inlineMath',
  'blockMath',
  'blockquote',
  'codeBlock',
  'horizontalRule',
])
const allowedMarks = new Set(['bold', 'italic', 'link', 'code', 'strike'])

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

const hasOnlyKeys = (value, keys) =>
  isRecord(value) && Object.keys(value).every(key => keys.includes(key))

const isSafeLink = href => {
  if (typeof href !== 'string' || href.length > 2048) return false
  try {
    return ['http:', 'https:'].includes(new URL(href, 'https://numex.invalid').protocol)
  } catch {
    return false
  }
}

const validateMark = mark => {
  if (!isRecord(mark) || !allowedMarks.has(mark.type)) return false
  if (mark.type !== 'link') return hasOnlyKeys(mark, ['type'])
  return hasOnlyKeys(mark, ['type', 'attrs']) &&
    isRecord(mark.attrs) &&
    typeof mark.attrs.href === 'string' &&
    isSafeLink(mark.attrs.href) &&
    Object.keys(mark.attrs).every(key => ['href', 'target', 'rel', 'class', 'title'].includes(key)) &&
    (mark.attrs.target === undefined || mark.attrs.target === null ||
      ['_blank', '_self'].includes(mark.attrs.target)) &&
    (mark.attrs.rel === undefined || mark.attrs.rel === null ||
      ['noopener noreferrer', 'noopener noreferrer nofollow'].includes(mark.attrs.rel)) &&
    (mark.attrs.class === undefined || mark.attrs.class === null) &&
    (mark.attrs.title === undefined || mark.attrs.title === null ||
      (typeof mark.attrs.title === 'string' && mark.attrs.title.length <= 500))
}

const validateNode = (node, state, depth = 0) => {
  if (!isRecord(node) || !allowedNodes.has(node.type) || depth > 20 || ++state.count > 3000) {
    return false
  }

  if (node.type === 'text') {
    return hasOnlyKeys(node, ['type', 'text', 'marks']) &&
      typeof node.text === 'string' &&
      (node.marks === undefined ||
        (Array.isArray(node.marks) && node.marks.length <= 3 && node.marks.every(validateMark)))
  }
  if (node.type === 'inlineMath' || node.type === 'blockMath') {
    return hasOnlyKeys(node, ['type', 'attrs']) &&
      isRecord(node.attrs) &&
      Object.keys(node.attrs).length === 1 &&
      typeof node.attrs.latex === 'string' &&
      node.attrs.latex.length <= 10000 &&
      !/<\/?[a-z][^>]*>/i.test(node.attrs.latex) &&
      !/\b(?:javascript|data|vbscript)\s*:/i.test(node.attrs.latex)
  }
  if (node.type === 'hardBreak') return hasOnlyKeys(node, ['type'])
  if (node.type === 'horizontalRule') return hasOnlyKeys(node, ['type'])
  if (node.type === 'codeBlock') {
    return hasOnlyKeys(node, ['type', 'attrs', 'content']) &&
      (node.attrs === undefined ||
        (isRecord(node.attrs) &&
          Object.keys(node.attrs).every(key => key === 'language') &&
          (node.attrs.language === undefined || node.attrs.language === null ||
            (typeof node.attrs.language === 'string' && node.attrs.language.length <= 100)))) &&
      (node.content === undefined ||
        (Array.isArray(node.content) &&
          node.content.length <= 3000 &&
          node.content.every(child => isRecord(child) &&
            child.type === 'text' &&
            typeof child.text === 'string' &&
            hasOnlyKeys(child, ['type', 'text']))))
  }
  if (node.type === 'heading') {
    if (!hasOnlyKeys(node, ['type', 'attrs', 'content']) ||
      !isRecord(node.attrs) ||
      Object.keys(node.attrs).some(key => key !== 'level') ||
      ![1, 2, 3].includes(node.attrs.level)) return false
  } else if (node.type === 'orderedList') {
    if (!hasOnlyKeys(node, ['type', 'attrs', 'content']) ||
      (node.attrs !== undefined &&
        (!isRecord(node.attrs) ||
          Object.keys(node.attrs).some(key => !['start', 'type'].includes(key)) ||
          (node.attrs.start !== undefined && (!Number.isInteger(node.attrs.start) || node.attrs.start < 1)) ||
          (node.attrs.type !== undefined && node.attrs.type !== null &&
            !['1', 'a', 'A', 'i', 'I'].includes(node.attrs.type))))) return false
  } else if (['doc', 'paragraph', 'bulletList', 'listItem', 'blockquote'].includes(node.type)) {
    if (!hasOnlyKeys(node, ['type', 'content'])) return false
  }

  if (!Array.isArray(node.content)) {
    return ['paragraph', 'heading'].includes(node.type) && node.content === undefined
  }
  return node.content.every(child => validateNode(child, state, depth + 1))
}

export function decodePublicationContent(value) {
  if (typeof value !== 'string' || !value.startsWith(TIPTAP_DOCUMENT_PREFIX)) {
    return { type: 'markdown', content: typeof value === 'string' ? value : '' }
  }

  try {
    const document = JSON.parse(value.slice(TIPTAP_DOCUMENT_PREFIX.length))
    if (hasOnlyKeys(document, ['type', 'content']) &&
      document.type === 'doc' &&
      Array.isArray(document.content) &&
      document.content.length <= 1000 &&
      validateNode(document, { count: 0 })) {
      return { type: 'json', content: document }
    }
  } catch {
    return { type: 'markdown', content: value }
  }
  return { type: 'markdown', content: value }
}

export function encodePublicationContent(document) {
  return `${TIPTAP_DOCUMENT_PREFIX}${JSON.stringify(document)}`
}
