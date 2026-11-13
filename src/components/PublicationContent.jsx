import { lazy, Suspense, useMemo } from 'react'
import MathContent from './MathContent'
import { decodePublicationContent } from '../utils/publicationContent'

const PublicationDocument = lazy(() => import('./PublicationDocument'))

function PublicationContent({ content, className = '' }) {
  const parsed = useMemo(() => decodePublicationContent(content), [content])
  if (parsed.type === 'markdown') {
    return <MathContent className={className} content={parsed.content} />
  }

  return (
    <Suspense fallback={<div className={`publication-document${className ? ` ${className}` : ''}`} role="status">Cargando contenido…</div>}>
      <PublicationDocument className={className} document={parsed.content} />
    </Suspense>
  )
}

export default PublicationContent
