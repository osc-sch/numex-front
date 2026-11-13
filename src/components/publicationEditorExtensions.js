import Link from '@tiptap/extension-link'
import Mathematics from '@tiptap/extension-mathematics'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'

const isSafeLink = href => {
  try {
    return ['http:', 'https:'].includes(new URL(href, 'https://numex.invalid').protocol)
  } catch {
    return false
  }
}

export function createPublicationEditorExtensions(onMathNodeClick) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: false,
    }),
    Link.configure({
      autolink: false,
      linkOnPaste: false,
      openOnClick: false,
      protocols: ['http', 'https'],
      isAllowedUri: href => isSafeLink(href),
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Mathematics.configure({
      katexOptions: { throwOnError: false, trust: false },
      inlineOptions: { onClick: (node, pos) => onMathNodeClick?.('inlineMath', node, pos) },
      blockOptions: { onClick: (node, pos) => onMathNodeClick?.('blockMath', node, pos) },
    }),
    Markdown,
  ]
}
