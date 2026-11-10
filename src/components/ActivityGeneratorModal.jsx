import { useMemo, useState } from 'react'
import { Alert, Button, Form, Modal, Nav, Spinner, Tab } from 'react-bootstrap'
import { generateActivityFromFiles } from '../services/activityGenerator'
import { DEFAULT_ACTIVITY_GENERATION_PROMPT, getGeneratedActivities } from '../utils/activityGenerator'

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_FILE_TYPES = '.pdf,.txt,.docx,.png,.jpg,.jpeg,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif'
function formatFileSize(size) {
  return size >= 1024 * 1024
    ? `${(size / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`
}

function isSupportedFile(file) {
  const extension = file.name.split('.').at(-1)?.toLowerCase()
  return ['pdf', 'txt', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif'].includes(extension)
    || file.type.startsWith('image/')
}

function JsonValue({ value, label }) {
  if (Array.isArray(value)) {
    return (
      <section className="activity-ai-json-array">
        {label && <h4>{label}</h4>}
        {value.length
          ? <ol>{value.map((item, index) => <li key={index}><JsonValue value={item} /></li>)}</ol>
          : <p>Lista vacía</p>}
      </section>
    )
  }
  if (value && typeof value === 'object') {
    return (
      <dl className="activity-ai-json-object">
        {Object.entries(value).map(([key, item]) => (
          <div key={key}>
            <dt>{key}</dt>
            <dd><JsonValue value={item} /></dd>
          </div>
        ))}
      </dl>
    )
  }
  return <span className="activity-ai-json-value">{value === null ? 'null' : String(value)}</span>
}

function ActivityGeneratorModal({ show, onHide, onImport }) {
  const [files, setFiles] = useState([])
  const [prompt, setPrompt] = useState('')
  const [fileError, setFileError] = useState('')
  const [requestError, setRequestError] = useState('')
  const [result, setResult] = useState(null)
  const [isSending, setIsSending] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState('view')
  const [copyMessage, setCopyMessage] = useState('')
  const [importMessage, setImportMessage] = useState('')
  const [importMessageVariant, setImportMessageVariant] = useState('success')

  const generated = useMemo(() => result ? getGeneratedActivities(result) : null, [result])
  const rawJson = result ? JSON.stringify(result, null, 2) : ''
  const effectivePrompt = prompt.trim() || DEFAULT_ACTIVITY_GENERATION_PROMPT

  const addFiles = selectedFiles => {
    const accepted = []
    const errors = []
    for (const file of selectedFiles) {
      if (!isSupportedFile(file)) {
        errors.push(`${file.name}: formato no admitido.`)
      } else if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: supera el máximo de 20 MB.`)
      } else {
        accepted.push(file)
      }
    }
    setFiles(current => {
      const existing = new Set(current.map(file => `${file.name}:${file.size}:${file.lastModified}`))
      return [...current, ...accepted.filter(file => {
        const key = `${file.name}:${file.size}:${file.lastModified}`
        if (existing.has(key)) return false
        existing.add(key)
        return true
      })]
    })
    setFileError(errors.join(' '))
    setRequestError('')
  }

  const removeFile = index => setFiles(current => current.filter((_, fileIndex) => fileIndex !== index))

  const resetModal = () => {
    setFiles([])
    setPrompt('')
    setFileError('')
    setRequestError('')
    setResult(null)
    setIsDragging(false)
    setActiveTab('view')
    setCopyMessage('')
    setImportMessage('')
    setImportMessageVariant('success')
  }

  const closeAfterImport = () => {
    resetModal()
    onHide()
  }

  const sendFiles = async () => {
    if (!files.length || !effectivePrompt || isSending) return
    setIsSending(true)
    setRequestError('')
    setResult(null)
    setCopyMessage('')
    setImportMessage('')
    setImportMessageVariant('success')
    try {
      const data = await generateActivityFromFiles({ files, prompt: effectivePrompt })
      setResult(data)
      setActiveTab('view')
      const importableActivities = getGeneratedActivities(data).activities
      if (importableActivities.length === 1) {
        const imported = onImport(importableActivities[0])
        if (imported === false) {
          setImportMessage('No se reemplazaron los campos actuales.')
          setImportMessageVariant('warning')
        } else {
          closeAfterImport()
        }
      } else if (importableActivities.length > 1) {
        setImportMessage('La respuesta contiene varias actividades. Elegí cuál cargar en el editor.')
        setImportMessageVariant('info')
      } else if (!data.error_parseo) {
        setImportMessage('No se encontró una actividad con el formato esperado para completar el editor.')
        setImportMessageVariant('warning')
      }
    } catch (error) {
      setRequestError(error.message || 'No se pudo analizar los archivos.')
    } finally {
      setIsSending(false)
    }
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(rawJson)
      setCopyMessage('JSON copiado.')
    } catch {
      setCopyMessage('No se pudo copiar. Seleccioná el contenido del panel y copialo manualmente.')
    }
  }

  const downloadJson = () => {
    if (!result) return
    const blob = new Blob([rawJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'resultado.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const close = () => {
    if (isSending) return
    resetModal()
    onHide()
  }

  return (
    <Modal show={show} onHide={close} centered size="xl" scrollable>
      <Modal.Header closeButton={!isSending}>
        <Modal.Title>Crear actividad con ayuda de IA</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info">
          Los archivos y la instrucción se enviarán al servicio de IA externo configurado. No subas documentos con información personal o confidencial.
        </Alert>

        <Form.Group className="mb-3">
          <Form.Label htmlFor="activity-ai-files">Archivos (PDF, TXT, DOCX o imágenes; máximo 20 MB cada uno)</Form.Label>
          <label
            className={`activity-ai-dropzone${isDragging ? ' is-dragging' : ''}`}
            htmlFor="activity-ai-files"
            onDragEnter={event => { event.preventDefault(); setIsDragging(true) }}
            onDragOver={event => event.preventDefault()}
            onDragLeave={event => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsDragging(false)
            }}
            onDrop={event => {
              event.preventDefault()
              setIsDragging(false)
              addFiles(Array.from(event.dataTransfer.files))
            }}
          >
            <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
            <span>Arrastrá archivos acá o hacé clic para seleccionarlos</span>
            <small>Podés agregar varios archivos.</small>
          </label>
          <Form.Control
            id="activity-ai-files"
            className="visually-hidden"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            multiple
            onChange={event => {
              addFiles(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
            aria-describedby="activity-ai-file-list"
          />
          {fileError && <p className="activity-ai-error" role="alert">{fileError}</p>}
          <ul className="activity-ai-file-list" id="activity-ai-file-list">
            {files.map((file, index) => (
              <li key={`${file.name}:${file.size}:${file.lastModified}`}>
                <span><i className="bi bi-file-earmark" aria-hidden="true" /> {file.name}</span>
                <small>{formatFileSize(file.size)}</small>
                <Button
                  aria-label={`Quitar ${file.name}`}
                  disabled={isSending}
                  onClick={() => removeFile(index)}
                  size="sm"
                  variant="outline-danger"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </Form.Group>

        <Form.Group className="mb-3" controlId="activity-ai-prompt">
          <Form.Label>Instrucción para la IA</Form.Label>
          <Form.Control
            as="textarea"
            onChange={event => setPrompt(event.target.value)}
            placeholder="Ej.: Resume los documentos y crea preguntas de selección única sobre los conceptos principales."
            rows={4}
            value={prompt}
          />
          <Form.Text>
            Si dejás este campo vacío, se usará la instrucción de crear una actividad con los datos de todos los archivos.
          </Form.Text>
        </Form.Group>

        {requestError && (
          <Alert variant="danger" role="alert">
            <p>{requestError}</p>
            <Button disabled={isSending || files.length === 0} onClick={sendFiles} size="sm" variant="outline-danger">
              Reintentar
            </Button>
          </Alert>
        )}

        {isSending && (
          <div className="activity-ai-loading" role="status" aria-live="polite">
            <Spinner animation="border" aria-hidden="true" />
            <span>Analizando archivos… Puede tardar entre 10 y 60 segundos.</span>
          </div>
        )}

        {result && (
          <section className="activity-ai-result" aria-label="Respuesta del servicio de IA">
            {result.error_parseo === true && (
              <Alert variant="warning">
                La IA no devolvió JSON válido. Este es el resultado en texto plano:
                <pre className="activity-ai-plain-result">{String(result.resultado ?? '')}</pre>
              </Alert>
            )}
            {importMessage && <Alert variant={importMessageVariant} role="status">{importMessage}</Alert>}
            {!generated?.parseError && !generated?.error && generated?.activities?.length > 1 && (
              <div className="activity-ai-import-options">
                {generated.activities.map((item, index) => (
                  <Button
                    key={`${item.titulo}-${index}`}
                    onClick={() => {
                      const imported = onImport(item)
                      if (imported === false) {
                        setImportMessage('No se reemplazaron los campos actuales.')
                        setImportMessageVariant('warning')
                      } else {
                        closeAfterImport()
                      }
                    }}
                    size="sm"
                    variant="outline-primary"
                  >
                    Cargar “{item.titulo}”
                  </Button>
                ))}
              </div>
            )}
            {!generated?.parseError && generated?.error && (
              <Alert variant="warning">{generated.error}</Alert>
            )}
            <Tab.Container activeKey={activeTab} onSelect={key => key && setActiveTab(key)}>
              <Nav variant="tabs" aria-label="Formato de la respuesta">
                <Nav.Item><Nav.Link eventKey="view">Vista</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="json">JSON</Nav.Link></Nav.Item>
              </Nav>
              <Tab.Content className="activity-ai-tab-content">
                <Tab.Pane eventKey="view">
                  {result.error_parseo === true
                    ? <pre className="activity-ai-plain-result">{String(result.resultado ?? '')}</pre>
                    : <JsonValue value={result} />}
                </Tab.Pane>
                <Tab.Pane eventKey="json">
                  <div className="activity-ai-json-actions">
                    <Button onClick={copyJson} size="sm" variant="outline-secondary">Copiar</Button>
                    <Button onClick={downloadJson} size="sm" variant="outline-primary">Descargar resultado.json</Button>
                  </div>
                  <pre className="activity-ai-json-raw">{rawJson}</pre>
                  {copyMessage && <p className="activity-ai-copy-message" role="status">{copyMessage}</p>}
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </section>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button disabled={isSending} onClick={close} variant="outline-secondary">Cerrar</Button>
        <Button disabled={!files.length || !effectivePrompt || isSending} onClick={sendFiles}>
          {isSending
            ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Analizando…</>
            : 'Enviar'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ActivityGeneratorModal
