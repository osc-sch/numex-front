const defaultFeatures = [
  'Ejercicios de álgebra y ecuaciones',
  'Clases guiadas por nivel escolar',
  'Seguimiento de progreso y metas',
  'Desafíos y repaso con retroalimentación',
]

function AuthFeatureList({ features = defaultFeatures }) {
  return (
    <ul className="feature-list">
      {features.map((feature) => (
        <li key={feature} className="feature-item">
          <span className="feature-icon" aria-hidden="true">
            ✓
          </span>
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

export default AuthFeatureList
