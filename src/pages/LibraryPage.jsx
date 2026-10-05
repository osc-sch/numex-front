import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const libraryTopics = [
  { label: 'Símbolos y notación', slug: 'simbolos-notacion', icon: 'bi-braces', color: 'blue' },
  { label: 'Fórmulas y ecuaciones', slug: 'formulas-ecuaciones', icon: 'bi-calculator', color: 'green' },
  { label: 'Gráficos y coordenadas', slug: 'graficos-coordenadas', icon: 'bi-bar-chart-line', color: 'blue' },
  { label: 'Conceptos clave', slug: 'conceptos-clave', icon: 'bi-lightbulb', color: 'purple' },
  { label: 'Ejemplos resueltos', slug: 'ejemplos-resueltos', icon: 'bi-puzzle', color: 'yellow' },
]

const libraryResults = [
  {
    id: 'funcion-lineal',
    title: 'Función lineal',
    tags: ['formulas-ecuaciones', 'graficos-coordenadas', 'conceptos-clave'],
    description: 'Una función lineal tiene la forma y = mx + b, donde m representa la pendiente y b la ordenada al origen. Su gráfica es una recta y permite modelar relaciones proporcionales entre dos variables.',
  },
  {
    id: 'funciones-graficos',
    title: 'Funciones y gráficos',
    tags: ['graficos-coordenadas', 'conceptos-clave', 'ejemplos-resueltos'],
    description: 'En matemática, una función asocia a cada valor de entrada exactamente un valor de salida. El dominio indica los valores posibles de x y la imagen, los valores que toma y.',
  },
]

function LibraryPage() {
  const [searchValue, setSearchValue] = useState('funciones')
  const [selectedTag, setSelectedTag] = useState(null)
  const [isRelatedOpen, setIsRelatedOpen] = useState(true)
  const navigate = useNavigate()

  const handleSearch = () => {
    const trimmedQuery = searchValue.trim()
    if (trimmedQuery) {
      console.log('Buscar:', trimmedQuery)
    }
  }

  const resourceTabs = ['Definición', 'Gráfico', 'Fórmulas', 'Aplicación', 'Ejemplos']
  const selectedTopic = libraryTopics.find((topic) => topic.slug === selectedTag)
  const filteredResults = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    return libraryResults.filter((result) => {
      const matchesTag = !selectedTag || result.tags.includes(selectedTag)
      const matchesSearch = selectedTag || !normalizedSearch || result.title.toLowerCase().includes(normalizedSearch) || result.description.toLowerCase().includes(normalizedSearch)
      return matchesTag && matchesSearch
    })
  }, [searchValue, selectedTag])

  const handleTopicFilter = (topic) => {
    setSelectedTag(topic.slug)
    setSearchValue(topic.label)
  }

  const clearTopicFilter = () => {
    setSelectedTag(null)
    setSearchValue('')
  }

  const handleResultCardClick = (event, resultId) => {
    if (event.target.closest('a, button')) {
      return
    }

    navigate(`/library/topic/${resultId}`)
  }

  const handleResultCardKeyDown = (event, resultId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      navigate(`/library/topic/${resultId}`)
    }
  }

  return (
    <DashboardLayout eyebrow="Biblioteca">
      <section className="search-results-shell" aria-label="Resultados de búsqueda">
        <header className="library-heading">
          <p className="eyebrow">Un mundo por descubrir</p>
          <h1>Tu biblioteca de ideas.</h1>
          <p>Encontrá explicaciones, fórmulas y ejemplos para entender un poco más.</p>
        </header>
        <div className="search-bar-row">
          <form className="search-bar-wrap input-group" onSubmit={(event) => {
            event.preventDefault()
            handleSearch()
          }}>
            <label htmlFor="library-search" className="visually-hidden">
              Buscar en la biblioteca
            </label>
            <input
              id="library-search"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Buscar en la biblioteca"
              className="form-control search-input"
            />
            <button type="submit" className="btn btn-primary search-button" aria-label="Buscar en la biblioteca">
              <i className="bi bi-search" aria-hidden="true" />
              <span>Buscar</span>
            </button>
          </form>
          {selectedTopic && (
            <div className="search-tag-row" aria-label="Filtro activo">
              <span className="badge rounded-pill text-bg-primary search-tag">
                {selectedTopic.label}
                <button type="button" onClick={clearTopicFilter} aria-label={`Quitar filtro ${selectedTopic.label}`}>
                  <i className="bi bi-x" aria-hidden="true" />
                </button>
              </span>
            </div>
          )}
        </div>

        <div className="search-results-layout">
          <div className="results-column">
            {filteredResults.length === 0 ? (
              <div className="empty-library-state">
                <i className="bi bi-search" aria-hidden="true" />
                <h2>No encontramos resultados</h2>
                <p>Probá con otro término o elegí una categoría diferente.</p>
                <Link to="/assistant" className="btn btn-primary empty-assistant-button">
                  <i className="bi bi-stars" aria-hidden="true" />
                  Abrir asistente IA
                </Link>
              </div>
            ) : (
              filteredResults.map((result, index) => (
                <article
                  key={result.id}
                  className={`${index === 0 ? 'google-result-card' : 'wiki-result-card'} result-card-interactive`}
                  role="link"
                  tabIndex="0"
                  onClick={(event) => handleResultCardClick(event, result.id)}
                  onKeyDown={(event) => handleResultCardKeyDown(event, result.id)}
                >
                  <h2>
                    <Link to={`/library/topic/${result.id}`} className="result-title-link">
                      {result.title}
                    </Link>
                  </h2>

                  {index === 0 ? (
                    <p>{result.description}</p>
                  ) : (
                    <>
                      <div className="result-tabs" role="tablist" aria-label="Secciones">
                        {resourceTabs.map((tab, tabIndex) => (
                          <button
                            key={tab}
                            type="button"
                            className={tabIndex === 0 ? 'result-tab active' : 'result-tab'}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>

                      <div className="wiki-content-row">
                        <div className="wiki-copy">
                          <p>{result.description} A partir del gráfico se puede leer la tendencia, los puntos de corte y el crecimiento o decrecimiento de la función.</p>
                        </div>

                        <div className="wiki-image-wrap">
                          <img
                            src="https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=900&q=80"
                            alt="Gráfico de función matemática"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </article>
              ))
            )}

            <div className="bottom-result-header" aria-label="Preguntas sugeridas" />
          </div>

          <aside className="related-column">
            <div className="related-header">
              <h3>También te puede interesar</h3>
              <button
                type="button"
                className="related-toggle"
                aria-expanded={isRelatedOpen}
                aria-controls="related-content"
                onClick={() => setIsRelatedOpen((isOpen) => !isOpen)}
              >
                <span>{isRelatedOpen ? 'Ocultar' : 'Mostrar'}</span>
                <i className={isRelatedOpen ? 'bi bi-chevron-up' : 'bi bi-chevron-down'} aria-hidden="true" />
              </button>
            </div>

            <div id="related-content" className={isRelatedOpen ? 'related-content is-open' : 'related-content'}>
              <div className="library-topics" role="list">
                {libraryTopics.map((topic) => (
                  <button key={topic.label} type="button" className="library-topic" role="listitem" onClick={() => handleTopicFilter(topic)}>
                    <span className={`topic-icon topic-icon-${topic.color}`} aria-hidden="true">
                      <i className={`bi ${topic.icon}`} />
                    </span>
                    <span>{topic.label}</span>
                    <i className="bi bi-chevron-right topic-arrow" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div className="assistant-card">
                <span className="assistant-icon" aria-hidden="true">
                  <i className="bi bi-lightbulb" />
                </span>
                <div>
                  <h4>¿No encontrás lo que buscás?</h4>
                  <p>Podés preguntarle a nuestro Asistente tutor de IA, que te ayudará con tus dudas y te recomendará ejercicios.</p>
                  <button type="button" className="btn btn-primary assistant-button">
                    Abrir asistente IA
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </DashboardLayout>
  )
}

export default LibraryPage
