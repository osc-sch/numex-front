import { Badge, Card, Col, ProgressBar, Row } from 'react-bootstrap'
import DashboardLayout from '../components/DashboardLayout'

const areaProgress = [
  { name: 'Álgebra', detail: 'Funciones y ecuaciones', progress: 78, icon: 'bi-graph-up', color: 'blue' },
  { name: 'Números', detail: 'Fracciones y operaciones', progress: 64, icon: 'bi-123', color: 'green' },
  { name: 'Geometría', detail: 'Figuras y medidas', progress: 42, icon: 'bi-bounding-box', color: 'purple' },
  { name: 'Estadística', detail: 'Datos y probabilidad', progress: 28, icon: 'bi-bar-chart', color: 'yellow' },
]

const achievements = [
  { title: 'Primer desafío', description: 'Completaste tu primer desafío.', icon: 'bi-flag-fill', color: 'blue', unlocked: true },
  { title: 'Paso a paso', description: 'Resolviste 10 actividades.', icon: 'bi-check2-circle', color: 'green', unlocked: true },
  { title: 'Mente matemática', description: 'Alcanzá un 80% en un área.', icon: 'bi-lightbulb-fill', color: 'purple', unlocked: false },
]

const activityHistory = [
  { title: 'Detective de funciones', category: 'Álgebra', result: 'Completado', score: '92%', date: 'Hoy, 10:30', icon: 'bi-graph-up-arrow', color: 'blue' },
  { title: 'Fracciones equivalentes', category: 'Números', result: 'Completado', score: '84%', date: 'Ayer, 16:20', icon: 'bi-pie-chart-fill', color: 'green' },
  { title: 'Misión: áreas', category: 'Geometría', result: 'En progreso', score: '20%', date: '12 de septiembre', icon: 'bi-bounding-box-circles', color: 'purple' },
  { title: 'Funciones y gráficos', category: 'Biblioteca', result: 'Consultado', score: null, date: '10 de septiembre', icon: 'bi-journal-text', color: 'yellow' },
]

function ProgressPage() {
  return (
    <DashboardLayout eyebrow="Mi progreso">
      <section className="progress-page" aria-labelledby="progress-title">
        <div className="progress-heading">
          <div>
            <p className="eyebrow">Tu recorrido de aprendizaje</p>
            <h1 id="progress-title">Mi progreso</h1>
            <p>Revisá tus avances, actividades y logros en un solo lugar.</p>
          </div>
        </div>

        <Row className="g-3 progress-overview">
          <Col xs={12} md={4}>
            <Card className="progress-stat-card h-100">
              <Card.Body>
                <span className="progress-stat-icon progress-icon-blue" aria-hidden="true">
                  <i className="bi bi-check2-all" />
                </span>
                <span className="progress-stat-label">Actividades completadas</span>
                <strong>24</strong>
                <small>+4 esta semana</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="progress-stat-card h-100">
              <Card.Body>
                <span className="progress-stat-icon progress-icon-green" aria-hidden="true">
                  <i className="bi bi-bullseye" />
                </span>
                <span className="progress-stat-label">Progreso general</span>
                <strong>63%</strong>
                <small>de tu recorrido completado</small>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} md={4}>
            <Card className="progress-stat-card h-100">
              <Card.Body>
                <span className="progress-stat-icon progress-icon-purple" aria-hidden="true">
                  <i className="bi bi-trophy-fill" />
                </span>
                <span className="progress-stat-label">Logros obtenidos</span>
                <strong>2</strong>
                <small>de 5 disponibles</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Row className="g-3 align-items-start">
          <Col xs={12} lg={7}>
            <Card className="progress-section-card">
              <Card.Body>
                <div className="progress-section-heading">
                  <div>
                    <Card.Title>Progreso por área</Card.Title>
                    <Card.Text>Así se distribuye tu avance en cada tema.</Card.Text>
                  </div>
                  <i className="bi bi-bar-chart-line-fill" aria-hidden="true" />
                </div>
                <div className="area-progress-list">
                  {areaProgress.map((area) => (
                    <div className="area-progress-item" key={area.name}>
                      <div className="area-progress-topline">
                        <div className="area-progress-name">
                          <span className={`progress-area-icon progress-area-icon-${area.color}`} aria-hidden="true">
                            <i className={`bi ${area.icon}`} />
                          </span>
                          <div>
                            <strong>{area.name}</strong>
                            <small>{area.detail}</small>
                          </div>
                        </div>
                        <strong>{area.progress}%</strong>
                      </div>
                      <ProgressBar now={area.progress} visuallyHidden label={`${area.progress}%`} className={`area-progress-bar area-progress-${area.color}`} />
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xs={12} lg={5}>
            <Card className="progress-section-card achievements-card">
              <Card.Body>
                <div className="progress-section-heading">
                  <div>
                    <Card.Title>Logros</Card.Title>
                    <Card.Text>Reconocimientos por tus avances.</Card.Text>
                  </div>
                  <i className="bi bi-award-fill" aria-hidden="true" />
                </div>
                <div className="achievements-list">
                  {achievements.map((achievement) => (
                    <div className={achievement.unlocked ? 'achievement-item' : 'achievement-item locked'} key={achievement.title}>
                      <span className={`achievement-icon achievement-icon-${achievement.color}`} aria-hidden="true">
                        <i className={`bi ${achievement.icon}`} />
                      </span>
                      <div>
                        <strong>{achievement.title}</strong>
                        <small>{achievement.description}</small>
                      </div>
                      {achievement.unlocked && <i className="bi bi-check-circle-fill achievement-check" aria-label="Logro obtenido" />}
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <Card className="progress-section-card activity-history-card">
          <Card.Body>
            <div className="progress-section-heading">
              <div>
                <Card.Title>Historial de actividades</Card.Title>
                <Card.Text>Un registro de tus últimas actividades.</Card.Text>
              </div>
              <i className="bi bi-clock-history" aria-hidden="true" />
            </div>
            <div className="activity-history-list">
              {activityHistory.map((activity) => (
                <div className="activity-history-item" key={`${activity.title}-${activity.date}`}>
                  <span className={`activity-icon activity-icon-${activity.color}`} aria-hidden="true">
                    <i className={`bi ${activity.icon}`} />
                  </span>
                  <div className="activity-history-content">
                    <strong>{activity.title}</strong>
                    <span>{activity.category} · {activity.date}</span>
                  </div>
                  <Badge bg={activity.result === 'Completado' ? 'success' : activity.result === 'En progreso' ? 'warning' : 'light'} text={activity.result === 'Consultado' ? 'dark' : undefined}>
                    {activity.result}
                  </Badge>
                  {activity.score && <strong className="activity-score">{activity.score}</strong>}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      </section>
    </DashboardLayout>
  )
}

export default ProgressPage
