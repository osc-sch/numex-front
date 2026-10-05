import { Link, useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const topicDetails = {
  'funcion-lineal': {
    title: 'Función lineal',
    summary: 'Una función lineal relaciona dos variables mediante una recta y permite analizar cambios constantes.',
    sections: [
      ['Definición', 'Una función lineal tiene la forma y = mx + b. La pendiente m indica cuánto cambia y cuando x aumenta una unidad, mientras que b marca el punto donde la recta corta al eje vertical.'],
      ['Elementos principales', 'Para estudiar una función lineal conviene identificar su pendiente, su ordenada al origen, el dominio y la imagen. Estos elementos permiten interpretar rápidamente su comportamiento.'],
      ['Ejemplo', 'En la función y = 2x + 1, la pendiente es 2 y la ordenada al origen es 1. Por cada unidad que aumenta x, el valor de y aumenta dos unidades.'],
    ],
  },
  'funciones-graficos': {
    title: 'Funciones y gráficos',
    summary: 'Aprendé a interpretar relaciones entre variables a partir de sus expresiones y representaciones gráficas.',
    sections: [
      ['Definición', 'Una función asigna a cada valor de entrada exactamente un valor de salida. El dominio reúne los valores posibles de x y la imagen, los valores que toma y.'],
      ['Cómo leer un gráfico', 'Observá los puntos de corte, la tendencia y los intervalos donde la función crece o decrece. También podés reconocer máximos, mínimos y simetrías.'],
      ['Aplicación', 'Los gráficos ayudan a representar situaciones reales, comparar cantidades y anticipar cómo cambia una variable cuando cambia la otra.'],
    ],
  },
}

function TopicDetailPage() {
  const { slug } = useParams()
  const topic = topicDetails[slug] ?? {
    title: 'Recurso de biblioteca',
    summary: 'Explorá este tema para ampliar tus conocimientos de matemática.',
    sections: [['Contenido', 'Este recurso se encuentra en preparación. Muy pronto vas a poder consultar su explicación completa y nuevos ejercicios.']],
  }

  return (
    <DashboardLayout eyebrow="Biblioteca">
      <section className="topic-detail-page" aria-labelledby="topic-detail-title">
        <Link to="/library" className="topic-back-link">
          <i className="bi bi-arrow-left" aria-hidden="true" />
          Volver a la biblioteca
        </Link>

        <article className="topic-detail-card">
          <p className="eyebrow">Tema consultado</p>
          <h1 id="topic-detail-title">{topic.title}</h1>
          <p className="topic-detail-summary">{topic.summary}</p>

          <div className="topic-detail-sections">
            {topic.sections.map(([heading, content]) => (
              <section key={heading}>
                <h2>{heading}</h2>
                <p>{content}</p>
              </section>
            ))}
          </div>
        </article>
      </section>
    </DashboardLayout>
  )
}

export default TopicDetailPage
