import { Link } from 'react-router-dom'
import { useAuth } from '../auth/authContext'
import DashboardLayout from '../components/DashboardLayout'
import { teacherSections } from '../data/teacherWorkspace'

function TeacherHomePage() {
  const { user, profile } = useAuth()
  const displayName = profile?.nombre || user.user_name

  return (
    <DashboardLayout eyebrow="Inicio">
      <section className="teacher-hero" aria-labelledby="teacher-welcome-title">
        <div className="teacher-hero-copy">
          <span className="teacher-eyebrow"><i className="bi bi-person-workspace" aria-hidden="true" /> Espacio docente</span>
          <h1 id="teacher-welcome-title">Hola, {displayName}.</h1>
          <p>Enseñar es acompañar.<br />Este es tu espacio para hacerlo.</p>
          <Link to="/library" className="btn teacher-library-button">
            <i className="bi bi-journal-text" aria-hidden="true" /> Explorar biblioteca
            <i className="bi bi-arrow-up-right" aria-hidden="true" />
          </Link>
        </div>
        <div className="teacher-board" aria-hidden="true">
          <div className="teacher-board-top"><span /><span /><span /></div>
          <div className="teacher-board-content">
            <span className="teacher-board-caption">Una idea. Muchas formas de aprender.</span>
            <div className="teacher-board-formula">y = mx + b</div>
            <svg viewBox="0 0 260 120" fill="none">
              <path d="M20 95H245M50 110V10" stroke="currentColor" strokeOpacity=".3" />
              <path d="M30 90L225 25" stroke="#6ee7b7" strokeWidth="3" strokeLinecap="round" />
              <circle cx="90" cy="70" r="5" fill="#6ee7b7" />
              <circle cx="165" cy="45" r="5" fill="#6ee7b7" />
              <path d="M90 70V95M165 45V95" stroke="currentColor" strokeOpacity=".25" strokeDasharray="4 5" />
            </svg>
            <div className="teacher-board-note"><i className="bi bi-lightbulb" /> Aprender, conectar, compartir.</div>
          </div>
        </div>
      </section>

      <div className="teacher-context" aria-label="Tu perfil docente">
        <span><i className="bi bi-mortarboard" aria-hidden="true" /> Matemática · Nivel secundario</span>
        {profile?.anio_cursada && <span><i className="bi bi-bookmark" aria-hidden="true" /> Año de referencia: {profile.anio_cursada}°</span>}
        {profile?.ciclo && <span><i className="bi bi-diagram-3" aria-hidden="true" /> {profile.ciclo}</span>}
      </div>

      <div className="teacher-home-grid">
        <section className="teacher-workspace-section" aria-labelledby="teacher-workspace-title">
          <header className="teacher-section-heading">
            <div>
              <h2 id="teacher-workspace-title">Tu espacio de trabajo</h2>
              <p>Una mirada a cada parte de tu aula.</p>
            </div>
          </header>
          <div className="teacher-module-grid">
            {teacherSections.map(section => (
              <Link to={section.path} key={section.id} className={`teacher-module teacher-tone-${section.color}`}>
                <div className="teacher-module-top">
                  <span className="teacher-module-icon"><i className={`bi ${section.icon}`} aria-hidden="true" /></span>
                  <span className={`teacher-status${section.available ? ' teacher-status-available' : ''}`}>
                    {section.available ? 'Disponible' : 'En preparación'}
                  </span>
                </div>
                <h3>{section.label}</h3>
                <p>{section.description}</p>
                <span className="teacher-module-link">Ver sección <i className="bi bi-arrow-right" aria-hidden="true" /></span>
              </Link>
            ))}
          </div>
        </section>

        <aside className="teacher-resources" aria-labelledby="teacher-resources-title">
          <span className="teacher-resource-icon"><i className="bi bi-journal-richtext" aria-hidden="true" /></span>
          <p className="teacher-eyebrow">Para tu próxima clase</p>
          <h2 id="teacher-resources-title">Una explicación puede abrir muchas puertas.</h2>
          <p>Consultá conceptos, fórmulas y ejemplos para acompañar tus clases de matemática.</p>
          <div className="teacher-resource-links">
            <Link to="/library/topic/funcion-lineal">
              <span><small>Álgebra</small><strong>Función lineal</strong></span>
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
            <Link to="/library/topic/funciones-graficos">
              <span><small>Funciones</small><strong>Funciones y gráficos</strong></span>
              <i className="bi bi-arrow-up-right" aria-hidden="true" />
            </Link>
          </div>
          <Link to="/library" className="teacher-resource-all">Ver la biblioteca <i className="bi bi-arrow-right" aria-hidden="true" /></Link>
        </aside>
      </div>
    </DashboardLayout>
  )
}

export default TeacherHomePage
