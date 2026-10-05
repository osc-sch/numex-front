import { useMemo, useState } from 'react'
import { Badge, Button, Card, Col, ProgressBar, Row } from 'react-bootstrap'
import DashboardLayout from '../components/DashboardLayout'

const challenges = [
  {
    id: 'funciones-lineales',
    title: 'Detective de funciones',
    description: 'Identificá la pendiente y la ordenada al origen en diferentes funciones lineales.',
    category: 'Álgebra',
    difficulty: 'Inicial',
    icon: 'bi-graph-up-arrow',
    color: 'blue',
    progress: 72,
    duration: '10 min',
  },
  {
    id: 'fracciones-equivalentes',
    title: 'Fracciones equivalentes',
    description: 'Encontrá fracciones equivalentes y resolvé operaciones paso a paso.',
    category: 'Números',
    difficulty: 'Inicial',
    icon: 'bi-pie-chart-fill',
    color: 'green',
    progress: 45,
    duration: '8 min',
  },
  {
    id: 'area-figuras',
    title: 'Misión: áreas',
    description: 'Calculá el área de figuras planas usando las fórmulas correctas.',
    category: 'Geometría',
    difficulty: 'Intermedio',
    icon: 'bi-bounding-box-circles',
    color: 'purple',
    progress: 20,
    duration: '15 min',
  },
  {
    id: 'probabilidad',
    title: 'Probabilidad en juego',
    description: 'Analizá eventos simples y estimá sus probabilidades en situaciones cotidianas.',
    category: 'Estadística',
    difficulty: 'Avanzado',
    icon: 'bi-dice-5-fill',
    color: 'yellow',
    progress: 0,
    duration: '20 min',
  },
]

const filters = ['Todos', 'Inicial', 'Intermedio', 'Avanzado']

function ChallengesPage() {
  const [activeFilter, setActiveFilter] = useState('Todos')

  const filteredChallenges = useMemo(() => {
    if (activeFilter === 'Todos') {
      return challenges
    }

    return challenges.filter((challenge) => challenge.difficulty === activeFilter)
  }, [activeFilter])

  return (
    <DashboardLayout eyebrow="Desafíos">
      <section className="challenges-page" aria-labelledby="challenges-title">
        <div className="challenges-heading">
          <div>
            <p className="eyebrow">Practicá a tu ritmo</p>
            <h1 id="challenges-title">Desafíos</h1>
            <p>Elegí una misión y convertí cada ejercicio en un nuevo logro.</p>
          </div>
        </div>

        <div className="challenges-toolbar">
          <div className="challenge-summary">
            <strong>{filteredChallenges.length}</strong>
            <span>desafíos disponibles</span>
          </div>
          <div className="challenge-filters" role="group" aria-label="Filtrar desafíos por dificultad">
            {filters.map((filter) => (
              <Button
                key={filter}
                type="button"
                variant={activeFilter === filter ? 'primary' : 'outline-primary'}
                size="sm"
                className="challenge-filter"
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </Button>
            ))}
          </div>
        </div>

        <Row className="g-3">
          {filteredChallenges.map((challenge) => (
            <Col key={challenge.id} xs={12} md={6} xl={4}>
              <Card className="challenge-card h-100">
                <Card.Body>
                  <div className="challenge-card-topline">
                    <span className={`challenge-icon challenge-icon-${challenge.color}`} aria-hidden="true">
                      <i className={`bi ${challenge.icon}`} />
                    </span>
                    <Badge bg="light" text="dark" className="challenge-duration">
                      <i className="bi bi-clock" aria-hidden="true" /> {challenge.duration}
                    </Badge>
                  </div>
                  <Card.Subtitle className="mb-2 text-muted">{challenge.category}</Card.Subtitle>
                  <Card.Title>{challenge.title}</Card.Title>
                  <Card.Text>{challenge.description}</Card.Text>
                  <div className="challenge-meta">
                    <Badge bg={challenge.difficulty === 'Avanzado' ? 'danger' : challenge.difficulty === 'Intermedio' ? 'warning' : 'success'}>
                      {challenge.difficulty}
                    </Badge>
                    <span>{challenge.progress}% completado</span>
                  </div>
                  <ProgressBar now={challenge.progress} visuallyHidden label={`${challenge.progress}%`} className="challenge-progress" />
                  <Button variant="primary" className="w-100 challenge-action">
                    {challenge.progress > 0 ? 'Continuar desafío' : 'Comenzar desafío'}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </DashboardLayout>
  )
}

export default ChallengesPage
