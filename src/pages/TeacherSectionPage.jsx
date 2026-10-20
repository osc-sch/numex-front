import { Link } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

function TeacherSectionPage({ section }) {
  return (
    <DashboardLayout eyebrow={section.label}>
      <section className={`teacher-section-page teacher-tone-${section.color}`} aria-labelledby="teacher-section-title">
        <header className="teacher-section-heading">
          <div>
            <p className="teacher-eyebrow">Espacio docente</p>
            <h1 id="teacher-section-title">{section.label}</h1>
            <p>{section.description}</p>
          </div>
          <span className="teacher-status">En preparación</span>
        </header>

        <div className="teacher-empty-state">
          <div className="teacher-empty-illustration" aria-hidden="true">
            <span /><i className={`bi ${section.icon}`} /><span />
          </div>
          <h2>{section.emptyTitle}</h2>
          <p>{section.emptyDescription}</p>
          <Link to="/library" className="btn btn-primary">
            <i className="bi bi-journal-text" aria-hidden="true" /> Explorar biblioteca
          </Link>
        </div>

        <section className="teacher-upcoming" aria-labelledby="teacher-upcoming-title">
          <h2 id="teacher-upcoming-title">Qué encontrarás en esta sección</h2>
          <ul>
            {section.features.map((feature, index) => (
              <li key={feature}><span aria-hidden="true">0{index + 1}</span>{feature}</li>
            ))}
          </ul>
        </section>
        <Link to="/" className="teacher-back-link"><i className="bi bi-arrow-left" aria-hidden="true" /> Volver al inicio docente</Link>
      </section>
    </DashboardLayout>
  )
}

export default TeacherSectionPage
