import { useMemo } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { createPublicationEditorExtensions } from './publicationEditorExtensions'

function PublicationDocument({ document, className = '' }) {
  const extensions = useMemo(() => createPublicationEditorExtensions(), [])
  const editor = useEditor({
    extensions,
    content: document,
    editable: false,
    immediatelyRender: false,
  }, [document])

  return (
    <div className={`publication-document${className ? ` ${className}` : ''}`}>
      {editor ? <EditorContent editor={editor} /> : null}
    </div>
  )
}

export default PublicationDocument
