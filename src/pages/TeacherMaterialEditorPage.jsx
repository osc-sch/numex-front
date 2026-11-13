import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { useNavigate, useParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import 'mathlive'
import DashboardLayout from '../components/DashboardLayout'
import MathContent from '../components/MathContent'
import { createPublicationEditorExtensions } from '../components/publicationEditorExtensions'
import {
  createSectionPost,
  deleteSectionPostAttachment,
  getCourse,
  getCourseSections,
  getSectionPost,
  getSectionPostAttachmentDownloadUrl,
  updateSectionPost,
  uploadSectionPostAttachment,
} from '../services/courses'
import { decodePublicationContent, encodePublicationContent } from '../utils/publicationContent'

const emptyDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
const MAX_ATTACHMENT_COUNT = 5
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024
const allowedAttachmentExtensions = /\.(pdf|doc|docx|png|jpe?g|gif|webp)$/i

function TeacherMaterialEditorPage() {
  const { courseId, sectionId, postId } = useParams()
  return (
    <MaterialEditor
      key={`${courseId}:${sectionId}:${postId ?? 'new'}`}
      courseId={courseId}
      sectionId={sectionId}
      postId={postId}
    />
  )
}

function MaterialEditor({ courseId, sectionId, postId }) {
  const navigate = useNavigate()
  const [course, setCourse] = useState(null)
  const [section, setSection] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [attachments, setAttachments] = useState([])
  const [selectedFiles, setSelectedFiles] = useState([])
  const [attachmentError, setAttachmentError] = useState('')
  const [removingAttachmentId, setRemovingAttachmentId] = useState('')
  const [visible, setVisible] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [mathModal, setMathModal] = useState({ show: false, type: 'inlineMath' })
  const [mathFormula, setMathFormula] = useState('')
  const [mathError, setMathError] = useState('')
  const [mathKeyboard, setMathKeyboard] = useState({ visible: false, height: 0 })
  const [linkModal, setLinkModal] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')
  const mathFieldRef = useRef(null)
  const [mathFocusPosition, setMathFocusPosition] = useState(null)
  const [mathAction, setMathAction] = useState(null)
  const submitting = useRef(false)
  const [mathInitialValue, setMathInitialValue] = useState('')
  const [savedPostId, setSavedPostId] = useState(postId ?? null)
  const isEditing = Boolean(savedPostId)

  const handleMathNodeClick = useCallback((type, node, pos) => {
    setMathAction({ type, pos })
    setMathFocusPosition(pos + 1)
    setMathInitialValue(node.attrs.latex ?? '')
    setMathFormula(node.attrs.latex ?? '')
    setMathError('')
    setMathModal({ show: true, type })
  }, [])

  const extensions = useMemo(() => createPublicationEditorExtensions(handleMathNodeClick), [handleMathNodeClick])
  const editor = useEditor({
    extensions,
    content: emptyDocument,
    immediatelyRender: false,
    onUpdate: () => setIsDirty(true),
  })

  useEffect(() => {
    editor?.setEditable(!isLoading && !isSaving)
  }, [editor, isLoading, isSaving])

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getCourse(courseId, { signal: controller.signal }),
      getCourseSections(courseId, { signal: controller.signal }),
      ...(postId ? [getSectionPost(courseId, sectionId, postId, { signal: controller.signal })] : []),
    ]).then(([courseData, sections, post]) => {
      if (controller.signal.aborted) return
      const currentSection = sections.find(item => item._id === sectionId)
      if (!currentSection) throw new Error('No se encontró la sección de este curso.')
      if (post && post.tipo !== 'material') {
        throw new Error('Esta página solo permite editar materiales teóricos.')
      }

      setCourse(courseData)
      setSection(currentSection)
      if (post) {
        setTitle(post.titulo ?? '')
        setDescription(post.descripcion ?? '')
        setUrl(post.url ?? '')
        setVisible(post.visible ?? true)
        setAttachments(post.adjuntos ?? [])
        const parsed = decodePublicationContent(post.contenido ?? '')
        editor?.commands.setContent(parsed.content, {
          contentType: parsed.type === 'markdown' ? 'markdown' : 'json',
          emitUpdate: false,
        })
      } else {
        editor?.commands.setContent(emptyDocument, { emitUpdate: false })
      }
      setIsDirty(false)
      setLoadError('')
    }).catch(error => {
      if (!controller.signal.aborted) setLoadError(error.message || 'No se pudo cargar el material.')
    }).finally(() => {
      if (!controller.signal.aborted) setIsLoading(false)
    })
    return () => controller.abort()
  }, [courseId, sectionId, postId, editor])

  useEffect(() => {
    if (!mathModal.show || !mathFieldRef.current) return undefined
    const field = mathFieldRef.current
    field.value = mathInitialValue
    const onInput = () => setMathFormula(field.value)
    field.addEventListener('input', onInput)
    field.focus()
    return () => field.removeEventListener('input', onInput)
  }, [mathModal.show, mathInitialValue])

  useEffect(() => {
    if (!mathModal.show) return undefined
    const keyboard = window.mathVirtualKeyboard
    if (!keyboard) return undefined

    const updateKeyboardLayout = () => {
      setMathKeyboard({
        visible: keyboard.visible,
        height: keyboard.visible ? keyboard.boundingRect.height : 0,
      })
    }

    let keyboardObserver
    const attachKeyboardObserver = () => {
      const keyboardElement = document.querySelector('.ML__keyboard')
      if (!keyboardElement || keyboardObserver) return
      keyboardObserver = new MutationObserver(updateKeyboardLayout)
      keyboardObserver.observe(keyboardElement, { attributes: true, attributeFilter: ['class'] })
      updateKeyboardLayout()
    }

    const observer = new MutationObserver(attachKeyboardObserver)
    observer.observe(document.body, { childList: true })
    attachKeyboardObserver()
    updateKeyboardLayout()
    return () => {
      observer.disconnect()
      keyboardObserver?.disconnect()
    }
  }, [mathModal.show])

  useEffect(() => {
    if (!isDirty) return undefined
    const warnOnExit = event => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnOnExit)
    return () => window.removeEventListener('beforeunload', warnOnExit)
  }, [isDirty])

  const askToLeave = () => {
    if (!isDirty || window.confirm('Hay cambios sin guardar. ¿Querés salir de todas formas?')) {
      navigate(`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts`)
    }
  }

  const closeMathEditor = () => {
    window.mathVirtualKeyboard?.hide()
    setMathKeyboard({ visible: false, height: 0 })
    setMathModal(current => ({ ...current, show: false }))
  }

  const openMathEditor = type => {
    const selection = editor?.state.selection
    const from = selection?.from ?? 1
    setMathAction(selection
      ? { type, from: selection.from, to: selection.to }
      : { type, from: 1, to: 1 })
    setMathFocusPosition(from)
    setMathInitialValue('')
    setMathFormula('')
    setMathError('')
    setMathModal({ show: true, type })
  }

  const saveMath = () => {
    const latex = mathFieldRef.current?.value?.trim() ?? mathFormula.trim()
    if (!latex) {
      setMathError('Escribí una expresión matemática antes de insertarla.')
      return
    }
    const action = mathAction
    if (!editor || !action) return

    if (action.pos !== undefined) {
      const command = action.type === 'inlineMath' ? 'updateInlineMath' : 'updateBlockMath'
      editor.commands[command]({ latex, pos: action.pos })
      setMathFocusPosition(action.pos + 1)
    } else {
      const chain = editor.chain()
        .focus()
        .setTextSelection({ from: action.from, to: action.to })
        .deleteSelection()
      const command = mathModal.type === 'inlineMath' ? 'insertInlineMath' : 'insertBlockMath'
      chain[command]({ latex }).run()
      if (mathModal.type === 'inlineMath') {
        editor.commands.setTextSelection(action.from + 1)
      }
      setMathFocusPosition(editor.state.selection.from)
    }
    setIsDirty(true)
    closeMathEditor()
  }

  const deleteMath = () => {
    const action = mathAction
    if (!editor || action?.pos === undefined) return
    const command = action.type === 'inlineMath' ? 'deleteInlineMath' : 'deleteBlockMath'
    editor.commands[command]({ pos: action.pos })
    setMathFocusPosition(action.pos)
    setIsDirty(true)
    closeMathEditor()
  }

  const openLinkEditor = () => {
    const currentHref = editor?.getAttributes('link').href ?? ''
    setLinkUrl(currentHref)
    setLinkError('')
    setLinkModal(true)
  }

  const saveLink = event => {
    event.preventDefault()
    let parsedUrl
    try {
      parsedUrl = new URL(linkUrl.trim())
    } catch {
      setLinkError('Ingresá una URL completa que empiece con https:// o http://.')
      return
    }
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      setLinkError('Solo se permiten enlaces HTTP o HTTPS.')
      return
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: parsedUrl.toString() }).run()
    setIsDirty(true)
    setLinkModal(false)
  }

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run()
    setIsDirty(true)
    setLinkModal(false)
  }

  const handleSelectAttachments = event => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    setAttachmentError('')
    if (attachments.length + selectedFiles.length + files.length > MAX_ATTACHMENT_COUNT) {
      setAttachmentError(`Podés adjuntar hasta ${MAX_ATTACHMENT_COUNT} archivos por material.`)
      return
    }

    const invalidFile = files.find(file =>
      !allowedAttachmentExtensions.test(file.name) || file.size > MAX_ATTACHMENT_SIZE || file.size === 0)
    if (invalidFile) {
      setAttachmentError(
        !allowedAttachmentExtensions.test(invalidFile.name)
          ? 'Solo se permiten archivos PDF, Word, PNG, JPG, GIF o WEBP.'
          : `Cada archivo debe pesar menos de 10 MB y no puede estar vacío: ${invalidFile.name}`,
      )
      return
    }

    setSelectedFiles(current => [...current, ...files])
    if (files.length) setIsDirty(true)
  }

  const removeSelectedAttachment = file =>
    setSelectedFiles(current => current.filter(selected => selected !== file))

  const removeSavedAttachment = async attachment => {
    if (!savedPostId || removingAttachmentId) return
    setRemovingAttachmentId(attachment._id)
    setAttachmentError('')
    try {
      await deleteSectionPostAttachment(courseId, sectionId, savedPostId, attachment._id)
      setAttachments(current => current.filter(item => item._id !== attachment._id))
    } catch (error) {
      setAttachmentError(error.message || `No se pudo eliminar ${attachment.nombre}.`)
    } finally {
      setRemovingAttachmentId('')
    }
  }

  const handleSave = async event => {
    event.preventDefault()
    if (!editor || submitting.current) return
    submitting.current = true
    setIsSaving(true)
    setSaveError('')
    try {
      const serializedContent = encodePublicationContent(editor.getJSON())
      if (serializedContent.length > 50000) {
        throw new Error('El documento supera el límite de 50.000 caracteres. Reducí el contenido para poder guardarlo.')
      }
      const payload = {
        titulo: title.trim(),
        descripcion: description.trim(),
        contenido: serializedContent,
        url: url.trim(),
      }
      const requestPayload = isEditing
        ? { ...payload, visible }
        : { tipo: 'material', ...payload }
      console.log(
        `JSON enviado al ${isEditing ? 'actualizar' : 'crear'} publicación:`,
        JSON.stringify(requestPayload, null, 2),
      )
      const post = isEditing
        ? await updateSectionPost(courseId, sectionId, savedPostId, requestPayload)
        : await createSectionPost(courseId, sectionId, requestPayload)
      setSavedPostId(post._id)
      for (const file of selectedFiles) {
        const attachment = await uploadSectionPostAttachment(
          courseId,
          sectionId,
          post._id,
          file,
        )
        setAttachments(current => [...current, attachment])
        setSelectedFiles(current => current.filter(selected => selected !== file))
      }
      setIsDirty(false)
      navigate(`/teacher/courses/${encodeURIComponent(courseId)}/sections/${encodeURIComponent(sectionId)}/posts`, {
        replace: true,
        state: { notice: `El material “${post.titulo}” se ${isEditing ? 'actualizó' : 'creó'} correctamente.` },
      })
    } catch (error) {
      setSaveError(error.message || 'No se pudo guardar el material.')
    } finally {
      submitting.current = false
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout eyebrow="Mis cursos">
      <section className="teacher-section-page teacher-tone-blue material-editor-page" aria-labelledby="material-editor-title">
        <button type="button" className="teacher-back-link material-editor-back" onClick={askToLeave}>
          <i className="bi bi-arrow-left" aria-hidden="true" /> Volver a las publicaciones
        </button>

        {isLoading && (
          <div className="teacher-courses-loading" role="status">
            <Spinner size="sm" animation="border" aria-hidden="true" /> Cargando material…
          </div>
        )}
        {loadError && <Alert variant="danger" role="alert">{loadError}</Alert>}

        {!isLoading && !loadError && course && section && (
          <Form onSubmit={handleSave}>
            <header className="teacher-section-heading teacher-course-sections-heading material-editor-heading">
              <div>
                <p className="teacher-eyebrow">{course.curso} · {course.materia} · {section.nombre}</p>
                <h1 id="material-editor-title">{isEditing ? 'Editar material de lectura' : 'Nuevo material de lectura'}</h1>
                <p>Escribí y dale formato al contenido. Los cambios se guardan en la publicación cuando confirmes.</p>
              </div>
              <div className="material-editor-heading-actions">
                {isEditing && (
                  <Form.Check
                    checked={visible}
                    id="material-visible"
                    label="Visible para alumnos"
                    onChange={event => {
                      setVisible(event.target.checked)
                      setIsDirty(true)
                    }}
                    type="switch"
                  />
                )}
                <Button variant="outline-secondary" onClick={askToLeave} type="button">Cancelar</Button>
                <Button disabled={isSaving || !editor} type="submit">
                  {isSaving
                    ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Guardando…</>
                    : 'Guardar material'}
                </Button>
              </div>
            </header>

            {saveError && <Alert variant="danger" role="alert">{saveError}</Alert>}
            {isDirty && <p className="material-editor-unsaved" role="status">Tenés cambios sin guardar.</p>}

            <div className="material-editor-metadata">
              <Form.Group controlId="material-title">
                <Form.Label>Título</Form.Label>
                <Form.Control
                  maxLength={150}
                  onChange={event => {
                    setTitle(event.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Ej.: Introducción a las fracciones"
                  required
                  value={title}
                />
              </Form.Group>
              <Form.Group controlId="material-description">
                <Form.Label>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  maxLength={5000}
                  onChange={event => {
                    setDescription(event.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="Un resumen breve del material"
                  rows={2}
                  value={description}
                />
              </Form.Group>
            </div>

            <div className="material-editor-shell">
              <div className="material-editor-toolbar" role="toolbar" aria-label="Formato del contenido">
                <div className="material-toolbar-group">
                  <Button title="Párrafo" aria-label="Párrafo" variant="light" onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().setParagraph().run()}>
                    <i className="bi bi-paragraph" aria-hidden="true" />
                  </Button>
                  <Button title="Título" aria-label="Título" variant="light" onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>
                    <i className="bi bi-type-h2" aria-hidden="true" />
                  </Button>
                  <Button title="Subtítulo" aria-label="Subtítulo" variant="light" onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>
                    <i className="bi bi-type-h3" aria-hidden="true" />
                  </Button>
                  <Button title="Negrita" aria-label="Negrita" variant={editor?.isActive('bold') ? 'primary' : 'light'} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleBold().run()}>
                    <i className="bi bi-type-bold" aria-hidden="true" />
                  </Button>
                  <Button title="Cursiva" aria-label="Cursiva" variant={editor?.isActive('italic') ? 'primary' : 'light'} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleItalic().run()}>
                    <i className="bi bi-type-italic" aria-hidden="true" />
                  </Button>
                </div>
                <div className="material-toolbar-group">
                  <Button title="Lista con viñetas" aria-label="Lista con viñetas" variant={editor?.isActive('bulletList') ? 'primary' : 'light'} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleBulletList().run()}>
                    <i className="bi bi-list-ul" aria-hidden="true" />
                  </Button>
                  <Button title="Lista numerada" aria-label="Lista numerada" variant={editor?.isActive('orderedList') ? 'primary' : 'light'} onMouseDown={event => event.preventDefault()} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>
                    <i className="bi bi-list-ol" aria-hidden="true" />
                  </Button>
                  <Button title="Insertar o editar enlace" aria-label="Insertar o editar enlace" variant={editor?.isActive('link') ? 'primary' : 'light'} onMouseDown={event => event.preventDefault()} onClick={openLinkEditor}>
                    <i className="bi bi-link-45deg" aria-hidden="true" />
                  </Button>
                </div>
                <div className="material-toolbar-group">
                  <Button title="Insertar fórmula en línea" aria-label="Insertar fórmula en línea" variant="light" onMouseDown={event => event.preventDefault()} onClick={() => openMathEditor('inlineMath')}>
                    <i className="bi bi-calculator" aria-hidden="true" /> Fórmula
                  </Button>
                  <Button title="Insertar fórmula centrada" aria-label="Insertar fórmula centrada" variant="light" onMouseDown={event => event.preventDefault()} onClick={() => openMathEditor('blockMath')}>
                    <i className="bi bi-superscript" aria-hidden="true" /> Bloque
                  </Button>
                </div>
              </div>
              <EditorContent editor={editor} className="material-editor-content" />
              <p className="material-editor-hint">Podés seleccionar cualquier fórmula para editarla. El contenido se guarda como documento estructurado, no como HTML.</p>
            </div>

            <div className="material-editor-metadata material-editor-resource">
              <Form.Group controlId="material-attachments">
                <Form.Label>Archivos adjuntos</Form.Label>
                <Form.Control
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp"
                  disabled={isSaving || attachments.length + selectedFiles.length >= MAX_ATTACHMENT_COUNT}
                  multiple
                  onChange={handleSelectAttachments}
                  type="file"
                />
                <Form.Text>
                  PDF, Word o imágenes; máximo 10 MB por archivo y {MAX_ATTACHMENT_COUNT} archivos por material.
                  Se subirán al guardar.
                </Form.Text>
              </Form.Group>
              {attachmentError && <Alert className="mb-0" variant="danger" role="alert">{attachmentError}</Alert>}
              {(attachments.length > 0 || selectedFiles.length > 0) && (
                <ul className="material-attachment-list">
                  {attachments.map(attachment => (
                    <li key={attachment._id}>
                      <a
                        href={getSectionPostAttachmentDownloadUrl(courseId, sectionId, savedPostId, attachment._id)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        <i className="bi bi-paperclip" aria-hidden="true" /> {attachment.nombre}
                      </a>
                      <span>{(attachment.tamano / (1024 * 1024)).toFixed(2)} MB</span>
                      <Button
                        aria-label={`Eliminar ${attachment.nombre}`}
                        disabled={Boolean(removingAttachmentId) || isSaving}
                        onClick={() => removeSavedAttachment(attachment)}
                        size="sm"
                        type="button"
                        variant="outline-danger"
                      >
                        {removingAttachmentId === attachment._id
                          ? <Spinner size="sm" animation="border" aria-label="Eliminando archivo" />
                          : <i className="bi bi-trash" aria-hidden="true" />}
                      </Button>
                    </li>
                  ))}
                  {selectedFiles.map((file, index) => (
                    <li key={`${file.name}:${file.lastModified}:${index}`} className="is-pending">
                      <span><i className="bi bi-clock" aria-hidden="true" /> {file.name}</span>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB · Pendiente</span>
                      <Button
                        aria-label={`Quitar ${file.name}`}
                        onClick={() => removeSelectedAttachment(file)}
                        size="sm"
                        type="button"
                        variant="outline-secondary"
                      >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="material-editor-metadata material-editor-resource">
              <Form.Group controlId="material-url">
                <Form.Label>Enlace a un recurso externo (opcional)</Form.Label>
                <Form.Control
                  maxLength={2048}
                  onChange={event => {
                    setUrl(event.target.value)
                    setIsDirty(true)
                  }}
                  placeholder="https://..."
                  type="url"
                  value={url}
                />
              </Form.Group>
            </div>
          </Form>
        )}

        <Modal
          show={mathModal.show}
          onHide={closeMathEditor}
          onExited={() => editor?.commands.focus(mathFocusPosition ?? undefined)}
          backdrop="static"
          centered
          dialogClassName={`material-math-dialog${mathKeyboard.visible ? ' keyboard-open' : ''}`}
          enforceFocus={false}
          keyboard={false}
          style={{ '--math-keyboard-height': `${mathKeyboard.height}px` }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{mathAction?.pos !== undefined ? 'Editar fórmula' : 'Insertar fórmula'}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>Usá el teclado matemático para crear la expresión. No hace falta escribir comandos LaTeX.</p>
            <math-field ref={mathFieldRef} className="material-math-field" virtual-keyboard-mode="manual" />
            <div className="d-flex flex-wrap gap-2 my-3">
              <Button variant="outline-primary" onClick={() => {
                if (window.mathVirtualKeyboard) window.mathVirtualKeyboard.show()
                else setMathError('No se pudo abrir el teclado matemático.')
              }}>
                <i className="bi bi-keyboard" aria-hidden="true" /> Abrir teclado matemático
              </Button>
              {mathAction?.pos !== undefined && (
                <Button variant="outline-danger" onClick={deleteMath}>
                  <i className="bi bi-trash" aria-hidden="true" /> Eliminar fórmula
                </Button>
              )}
            </div>
            <div className="material-math-preview" aria-live="polite">
              <span>Vista previa</span>
              <MathContent
                content={mathFormula
                  ? mathModal.type === 'blockMath' ? `$$${mathFormula}$$` : `$${mathFormula}$`
                  : 'La fórmula aparecerá aquí.'}
              />
            </div>
            {mathError && <Alert className="mt-3 mb-0" variant="danger" role="alert">{mathError}</Alert>}
            <Form.Check
              className="mt-3"
              checked={mathModal.type === 'blockMath'}
              id="material-math-block"
              label="Mostrar como fórmula independiente centrada"
              onChange={event => setMathModal(current => ({
                ...current,
                type: event.target.checked ? 'blockMath' : 'inlineMath',
              }))}
              type="checkbox"
              disabled={mathAction?.pos !== undefined}
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeMathEditor}>Cancelar</Button>
            <Button onClick={saveMath}>Insertar fórmula</Button>
          </Modal.Footer>
        </Modal>

        <Modal show={linkModal} onHide={() => setLinkModal(false)} centered>
          <Form onSubmit={saveLink}>
            <Modal.Header closeButton><Modal.Title>Enlace</Modal.Title></Modal.Header>
            <Modal.Body>
              <Form.Group controlId="material-link-url">
                <Form.Label>Dirección web</Form.Label>
                <Form.Control
                  autoFocus
                  onChange={event => setLinkUrl(event.target.value)}
                  placeholder="https://..."
                  required
                  type="url"
                  value={linkUrl}
                />
              </Form.Group>
              {linkError && <Alert className="mt-3 mb-0" variant="danger" role="alert">{linkError}</Alert>}
            </Modal.Body>
            <Modal.Footer>
              {editor?.isActive('link') && <Button variant="outline-danger" onClick={removeLink} type="button">Quitar enlace</Button>}
              <Button variant="outline-secondary" onClick={() => setLinkModal(false)} type="button">Cancelar</Button>
              <Button type="submit">Guardar enlace</Button>
            </Modal.Footer>
          </Form>
        </Modal>
      </section>
    </DashboardLayout>
  )
}

export default TeacherMaterialEditorPage
