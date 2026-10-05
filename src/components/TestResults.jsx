import { Badge, Card, ProgressBar } from 'react-bootstrap'
import { summarizeTestResult } from '../utils/testResults'
import CorrectionProfile from './CorrectionProfile'
import '../styles/test-results.css'

function TestResults({ result }) {
  if (!result) {
    return (
      <section className="test-results-empty" aria-labelledby="test-results-title">
        <i className="bi bi-clipboard-data" aria-hidden="true" />
        <h2 id="test-results-title">Tus resultados aparecerán acá</h2>
        <p>Completá el test para conocer tu dominio por tema y qué podés practicar.</p>
      </section>
    )
  }

  const summary = summarizeTestResult(result)
  const formattedDate = new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(summary.completedAt))

  return (
    <section className="test-results" aria-labelledby="test-results-title">
      <header className="test-results-heading">
        <div>
          <p className="eyebrow">Tu último test</p>
          <h2 id="test-results-title">Resultados del test</h2>
          <p className="test-results-meta">
            {summary.student.nombre} ·{' '}
            <time dateTime={summary.completedAt}>{formattedDate}</time>
          </p>
        </div>
      </header>

      {summary.profile ? (
        <CorrectionProfile profile={summary.profile} />
      ) : (
        <p className="test-results-meta">
          No hay un desglose por tema disponible para este test.
        </p>
      )}

      <Card className="test-results-card">
        <Card.Body>
          <div className="test-results-heading">
            <div>
              <h3 className="correction-section-title">Respuestas del test</h3>
              <p className="test-results-meta">Aciertos según la clave de respuestas del test.</p>
            </div>
            <div className="test-results-score">
              <strong>{summary.percentage}%</strong>
              <span>de aciertos</span>
            </div>
          </div>

          <ProgressBar
            now={summary.percentage}
            className="test-results-progress"
            aria-label="Porcentaje de respuestas correctas"
          />

          <dl className="test-results-stats">
            <div>
              <dt>Preguntas respondidas</dt>
              <dd>{summary.total}</dd>
            </div>
            <div className="test-results-correct">
              <dt>Correctas</dt>
              <dd>{summary.correct}</dd>
            </div>
            <div className="test-results-incorrect">
              <dt>Incorrectas</dt>
              <dd>{summary.incorrect}</dd>
            </div>
          </dl>

          <details className="test-results-details">
            <summary>Ver el detalle de las {summary.total} respuestas</summary>
            <ol className="test-results-questions">
              {summary.questions.map((question, index) => (
                <li key={question.id}>
                  <div className="test-results-question-heading">
                    <h3>Pregunta {index + 1}</h3>
                    <Badge bg={question.isCorrect ? 'success' : 'danger'}>
                      {question.isCorrect ? 'Correcta' : 'Incorrecta'}
                    </Badge>
                  </div>
                  <p className="test-results-statement">{question.statement}</p>
                  <p>
                    <strong>Tu respuesta:</strong>{' '}
                    {question.answer} · {question.answerText}
                  </p>
                  {!question.isCorrect && (
                    <p>
                      <strong>Respuesta correcta:</strong>{' '}
                      {question.correctAnswer} · {question.correctAnswerText}
                    </p>
                  )}
                  {question.feedback && (
                    <p className="test-results-feedback">{question.feedback}</p>
                  )}
                </li>
              ))}
            </ol>
          </details>
        </Card.Body>
      </Card>
    </section>
  )
}

export default TestResults
