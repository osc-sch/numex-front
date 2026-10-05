import { Col, Container, Row } from 'react-bootstrap'
import AuthFeatureList from '../components/AuthFeatureList'
import LoginForm from '../components/LoginForm'

function LoginPage() {
  return (
    <div className="auth-page login-page">
      <div className="auth-shell">
        <div className="auth-visual">
          <div className="auth-copy">
            <div className="auth-copy-content">
              <div className="eyebrow">Tu próxima sesión de práctica</div>
              <h2>Entrá y volvemos a resolver cada ejercicio con claridad.</h2>
              <p>
                En NUMEX podés continuar con tus clases, revisar tus metas y seguir avanzando en álgebra,
                funciones y geometría con una experiencia clara y guiada.
              </p>
              <AuthFeatureList />
            </div>

            <div className="graph-board" aria-hidden="true">
              <div className="equation equation-top">y = 2x + 1</div>
              <div className="equation equation-bottom">a² + b² = c²</div>
              <div className="math-note fraction-note"><span>3x + 2</span><span>────</span><span>5</span></div>
              <div className="math-note matrix-note">[ 2&nbsp;&nbsp; 1 ]<br />[ 4&nbsp;&nbsp; 3 ]</div>
              <div className="math-note division-note">144 ÷ 12 = 12</div>
              <div className="math-note operation-note">(x + 3)(x − 3) = x² − 9</div>
              <div className="math-note small-note note-one">πr²</div>
              <div className="math-note small-note note-two">∑ n = 55</div>
              <div className="shape shape-circle" />
              <div className="shape shape-triangle" />
              <div className="shape shape-square" />
              <div className="shape shape-ring" />
              <div className="shape shape-diamond" />
              <div className="shape shape-rectangle" />
              <div className="shape shape-hexagon" />
              <div className="shape shape-star">★</div>
              <div className="shape shape-cross">＋</div>
              <div className="shape shape-scribble">〰</div>
              <svg viewBox="0 0 430 250" className="graph-svg">
                <g className="axes">
                  <line x1="0" y1="120" x2="430" y2="120" />
                  <line x1="215" y1="0" x2="215" y2="250" />
                </g>
                <path d="M0 170 C80 130, 130 85, 210 120 S330 180, 430 100" />
                <path d="M 30 210 Q 140 90, 210 120 T 390 60" className="secondary-curve" />
              </svg>
              <svg viewBox="0 0 180 110" className="mini-graph">
                <line x1="12" y1="92" x2="170" y2="92" />
                <line x1="28" y1="105" x2="28" y2="8" />
                <path d="M30 85 C55 72, 65 30, 92 43 S132 86, 168 18" />
              </svg>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <Container fluid className="h-100 p-0">
            <Row className="h-100 g-0">
              <Col md={12}>
                <div className="auth-card">
                  <LoginForm />
                </div>
              </Col>
            </Row>
          </Container>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
