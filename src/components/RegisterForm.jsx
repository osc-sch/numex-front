import { useRef, useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../services/auth'

const accountFields = ['user_name', 'email', 'password', 'confirmPassword']
const personalFields = ['nombre', 'apellido', 'fecha_nacimiento', 'DNI', 'tipo_institucion', 'anio_cursada']

function RegisterForm({ onStepChange }) {
  const navigate = useNavigate()
  const formRef = useRef(null)
  const submitting = useRef(false)
  const [profilePhoto, setProfilePhoto] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [institutionType, setInstitutionType] = useState('')
  const [schoolYear, setSchoolYear] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const changeStep = (step) => {
    setCurrentStep(step)
    onStepChange?.(step)
  }

  const handleUrlSubmit = (event) => {
    event.preventDefault()
    setProfilePhoto(photoUrl.trim())
    setShowPhotoModal(false)
  }

  const handleInstitutionChange = (event) => {
    setInstitutionType(event.target.value)
    setSchoolYear('')
  }

  const validateStep = (step) => {
    const fields = formRef.current.elements
    const names = step === 1 ? accountFields : personalFields

    for (const name of names) fields.namedItem(name).setCustomValidity('')
    for (const name of step === 1 ? ['user_name'] : ['nombre', 'apellido']) {
      if (!fields.namedItem(name).value.trim()) {
        fields.namedItem(name).setCustomValidity('Completá este campo.')
      }
    }
    if (step === 1) {
      const password = fields.namedItem('password')
      if (password.value.length < 8 || !password.value.trim()) {
        password.setCustomValidity('La contraseña debe tener al menos 8 caracteres.')
      } else if (new TextEncoder().encode(password.value).length > 72) {
        password.setCustomValidity('La contraseña es demasiado larga. Usá menos caracteres.')
      }
      if (password.value !== fields.namedItem('confirmPassword').value) {
        fields.namedItem('confirmPassword').setCustomValidity('Las contraseñas no coinciden.')
      }
    }

    const invalidField = names.map(name => fields.namedItem(name)).find(field => !field.checkValidity())
    if (invalidField) {
      changeStep(step)
      requestAnimationFrame(() => invalidField.reportValidity())
      return false
    }
    return true
  }

  const curricularStage = schoolYear
    ? Number(schoolYear) <= 3
      ? institutionType === 'tecnica' ? 'Ciclo Básico Técnico (CBT)' : 'Ciclo Básico (CB)'
      : institutionType === 'tecnica' ? 'Ciclo Superior Técnico (CST)' : 'Ciclo Superior (CS)'
    : ''
  const today = new Date()
  const maxBirthDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const handleRegistrationSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    setError('')
    if (!validateStep(1)) return
    if (currentStep === 1) {
      changeStep(2)
      return
    }
    if (!validateStep(2)) return

    const values = new FormData(formRef.current)
    const registrationData = {
      user_name: values.get('user_name').trim(),
      email: values.get('email').trim().toLowerCase(),
      password: values.get('password'),
      nombre: values.get('nombre').trim(),
      apellido: values.get('apellido').trim(),
      DNI: values.get('DNI').trim(),
      fecha_nacimiento: values.get('fecha_nacimiento'),
      tipo_institucion: institutionType,
      anio_cursada: Number(schoolYear),
      img_profile: profilePhoto || null,
    }

    submitting.current = true
    setIsSubmitting(true)
    try {
      await register(registrationData)
      navigate('/login', { replace: true, state: { registrationSuccess: true, email: registrationData.email } })
    } catch (error) {
      setError(error.message || 'No se pudo crear la cuenta. Intentá nuevamente.')
    } finally {
      submitting.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <Form ref={formRef} className="auth-form" noValidate onSubmit={handleRegistrationSubmit}
        aria-busy={isSubmitting} onChange={(event) => event.target.setCustomValidity?.('')}>
        {error && <Alert variant="danger" role="alert">{error}</Alert>}
        <fieldset disabled={isSubmitting}>
          <div className={`registration-flow registration-step-${currentStep}`}>
            <div className="registration-step registration-step-account" inert={currentStep !== 1}>
              <div className="form-header">
                <span className="brand-mark">NUMEX</span>
                <span className="mini-tag">Matemáticas para secundario</span>
              </div>
              <div className="form-title-block mb-3">
                <h3>Creá tu cuenta</h3>
                <p>Empezá a aprender con ejercicios, desafíos y seguimiento personalizado.</p>
              </div>

              <div className="profile-photo-group">
                <button type="button" className="profile-photo-picker"
                  onClick={() => { setPhotoUrl(profilePhoto); setShowPhotoModal(true) }}
                  aria-label="Elegir foto de perfil">
                  {profilePhoto ? <img src={profilePhoto} alt="Vista previa del perfil" />
                    : <i className="bi bi-person-fill" aria-hidden="true" />}
                </button>
                <span className="profile-photo-caption">Foto de perfil (opcional)</span>
              </div>

              <Form.Group className="mb-3" controlId="formUsername">
                <Form.Label>Nombre de usuario</Form.Label>
                <Form.Control name="user_name" type="text" autoComplete="username" maxLength={100}
                  placeholder="Elegí tu nombre de usuario" required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formEmail">
                <Form.Label>Email</Form.Label>
                <Form.Control name="email" type="email" autoComplete="email" maxLength={254}
                  placeholder="tuemail@ejemplo.com" required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formPassword">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control name="password" type="password" autoComplete="new-password" minLength={8} maxLength={72}
                  placeholder="••••••••" aria-describedby="passwordHelp" required />
                <Form.Text id="passwordHelp">Usá al menos 8 caracteres.</Form.Text>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formConfirmPassword">
                <Form.Label>Confirmar contraseña</Form.Label>
                <Form.Control name="confirmPassword" type="password" autoComplete="new-password" maxLength={72}
                  placeholder="Repetí tu contraseña" required />
              </Form.Group>
              <div className="d-flex flex-column align-items-end gap-2 mt-2">
                <button type="submit" className="step-link">
                  Paso 2 <i className="bi bi-arrow-right" aria-hidden="true" />
                </button>
                <div className="text-center text-muted small fw-semibold">
                  ¿Ya tenés cuenta?{' '}
                  <Link to="/login" className="step-link" style={{ float: 'none', marginTop: 0 }}>Iniciar sesión</Link>
                </div>
              </div>
            </div>

            <div className="registration-step registration-step-personal" inert={currentStep !== 2}>
              <div className="form-header">
                <span className="brand-mark">NUMEX</span>
                <span className="mini-tag">Paso 2 de 2</span>
              </div>
              <div className="form-title-block mb-3">
                <h3>Datos personales</h3>
                <p>Contanos un poco más sobre vos para personalizar tu experiencia.</p>
              </div>
              <div className="profile-tabs" aria-label="Tipo de cuenta">
                <span className="profile-tab active"><i className="bi bi-backpack-fill" aria-hidden="true" /> Alumno</span>
                <button type="button" className="profile-tab" disabled>
                  <i className="bi bi-person-workspace" aria-hidden="true" /> Docente (próximamente)
                </button>
              </div>
              <div className="row g-3">
                <div className="col-md-6">
                  <Form.Group controlId="formName">
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control name="nombre" type="text" autoComplete="given-name" maxLength={100} placeholder="Tu nombre" required />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group controlId="formLastName">
                    <Form.Label>Apellido</Form.Label>
                    <Form.Control name="apellido" type="text" autoComplete="family-name" maxLength={100} placeholder="Tu apellido" required />
                  </Form.Group>
                </div>
              </div>
              <Form.Group className="mb-3" controlId="formBirthDate">
                <Form.Label>Fecha de nacimiento</Form.Label>
                <Form.Control name="fecha_nacimiento" type="date" autoComplete="bday" max={maxBirthDate} required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formDni">
                <Form.Label>DNI</Form.Label>
                <Form.Control name="DNI" type="text" inputMode="numeric" pattern="[0-9]{1,20}" maxLength={20}
                  title="Ingresá solo números, sin puntos ni espacios" placeholder="Tu número de DNI" required />
              </Form.Group>
              <Form.Group className="mb-3" controlId="formInstitutionType">
                <Form.Label>Tipo de institución</Form.Label>
                <Form.Select name="tipo_institucion" value={institutionType} onChange={handleInstitutionChange} required>
                  <option value="" disabled>Elegí el tipo de institución</option>
                  <option value="comun">Escuelas Comunes</option>
                  <option value="tecnica">Escuelas Técnicas</option>
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formSchoolYear">
                <Form.Label>Año escolar</Form.Label>
                <Form.Select name="anio_cursada" value={schoolYear} disabled={!institutionType}
                  onChange={(event) => setSchoolYear(event.target.value)} required>
                  <option value="" disabled>Elegí tu año</option>
                  {[1, 2, 3, 4, 5, 6, ...(institutionType === 'tecnica' ? [7] : [])].map((year) => (
                    <option key={year} value={year}>{year}° año</option>
                  ))}
                </Form.Select>
              </Form.Group>
              <Form.Group className="mb-3" controlId="formCurricularStage">
                <Form.Label>Etapa curricular</Form.Label>
                <Form.Control type="text" value={curricularStage} placeholder="Se completa según el tipo y año" readOnly />
              </Form.Group>
              <button type="button" className="back-step-link" onClick={() => { setError(''); changeStep(1) }}>
                <i className="bi bi-arrow-left" aria-hidden="true" /> Volver al paso 1
              </button>
              <Button className="w-100 create-account-btn" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Spinner size="sm" animation="border" aria-hidden="true" /> Creando cuenta…</> : 'Crear cuenta'}
              </Button>
            </div>
          </div>
        </fieldset>
      </Form>

      <Modal show={showPhotoModal} onHide={() => setShowPhotoModal(false)} centered>
        <Modal.Header closeButton><Modal.Title>Elegir foto de perfil</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleUrlSubmit}>
            <Form.Group className="mb-3" controlId="profilePhotoUrl">
              <Form.Label>URL de la foto</Form.Label>
              <Form.Control type="url" pattern="https?://.+" maxLength={2048} required
                title="Usá una dirección que empiece con http:// o https://"
                placeholder="https://ejemplo.com/mi-foto.jpg" value={photoUrl}
                onChange={(event) => setPhotoUrl(event.target.value)} />
              <Form.Text>Por ahora podés agregar una foto mediante un enlace.</Form.Text>
            </Form.Group>
            <Button type="submit" className="w-100">Usar URL</Button>
            {profilePhoto && <Button type="button" variant="link" className="w-100 mt-2"
              onClick={() => { setProfilePhoto(''); setPhotoUrl(''); setShowPhotoModal(false) }}>Quitar foto</Button>}
          </Form>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default RegisterForm
