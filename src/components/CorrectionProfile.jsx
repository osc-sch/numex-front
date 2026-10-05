import { Card, ProgressBar } from 'react-bootstrap'

const percentageFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

function CorrectionProfile({ profile }) {
  const topicGroups = new Map()
  for (const topic of profile.temas) {
    if (!topicGroups.has(topic.eje)) {
      topicGroups.set(topic.eje, [])
    }
    topicGroups.get(topic.eje).push(topic)
  }

  const practice = profile.practica_diaria

  return (
    <div className="correction-profile-layout">
      <Card className="test-results-card">
        <Card.Body>
          <h3 className="correction-section-title">Dominio por tema</h3>
          <p className="correction-section-description">
            Porcentaje de dominio de cada contenido según tu diagnóstico.
          </p>
          {profile.temas.length === 0 ? (
            <p>No hay temas evaluados en este diagnóstico.</p>
          ) : (
            <div className="correction-topic-groups">
              {[...topicGroups].map(([axis, topics]) => (
                <section className="correction-topic-group" key={axis}>
                  <h4>{axis}</h4>
                  <ul className="correction-topic-list">
                    {topics.map((topic) => (
                      <li key={topic.contenido_id}>
                        <div className="correction-topic-heading">
                          <div>
                            <strong>{topic.tema}</strong>
                            <span>{topic.anio}° año</span>
                          </div>
                          <span className="correction-topic-percentage">
                            {percentageFormat.format(topic.dominio_pct)} %
                          </span>
                        </div>
                        <ProgressBar
                          now={topic.dominio_pct}
                          className="correction-topic-progress"
                          aria-label={`Dominio de ${topic.tema}`}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="test-results-card correction-practice-card">
        <Card.Body>
          <i className="bi bi-calendar2-check correction-practice-icon" aria-hidden="true" />
          <h3 className="correction-section-title">Tu práctica diaria</h3>
          <p className="correction-practice-count">
            <strong>{practice.cantidad_recomendada}</strong>
            <span>
              {practice.cantidad_recomendada === 1
                ? 'actividad recomendada por día'
                : 'actividades recomendadas por día'}
            </span>
          </p>
          {practice.cola_inicial.length === 0 ? (
            <p className="correction-section-description">No hay habilidades sugeridas para practicar.</p>
          ) : (
            <>
              <h4 className="correction-practice-subtitle">Para empezar</h4>
              <ol className="correction-practice-list">
                {practice.cola_inicial.map((item, index) => (
                  <li key={`${item.habilidad_id}-${index}`}>
                    <h5>{item.tema}</h5>
                    <p>{item.habilidad}</p>
                    <span>Dominio actual: {percentageFormat.format(item.dominio_pct)} %</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  )
}

export default CorrectionProfile
