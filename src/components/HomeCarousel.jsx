import { useState } from 'react'
import { Button, Carousel } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import MathIllustration from './MathIllustration'

const learningSlides = [
  {
    label: 'Biblioteca',
    eyebrow: 'Ideas para seguir aprendiendo',
    title: 'Explorá la biblioteca.',
    description: 'Encontrá explicaciones, fórmulas y ejemplos para resolver tus dudas y entender un poco más.',
    button: 'Ir a la biblioteca',
    to: '/library',
    icon: 'bi-journal-richtext',
    detailIcon: 'bi-braces',
    color: 'blue',
  },
  {
    label: 'Desafíos',
    eyebrow: 'Poné tus ideas en práctica',
    title: 'Aceptá un desafío.',
    description: 'Poné en práctica lo que aprendiste. Elegí un desafío y avanzá a tu ritmo, un ejercicio a la vez.',
    button: 'Explorar desafíos',
    to: '/challenges',
    icon: 'bi-lightning-charge',
    detailIcon: 'bi-stars',
    color: 'green',
  },
  {
    label: 'Mi progreso',
    eyebrow: 'Cada avance cuenta',
    title: 'Mirá tu progreso.',
    description: 'Recorré tus actividades y logros, reconocé lo que aprendiste y descubrí cuánto avanzaste.',
    button: 'Ver mi progreso',
    to: '/progress',
    icon: 'bi-bar-chart-line',
    detailIcon: 'bi-check2-circle',
    color: 'purple',
  },
]

const slideLabels = ['Bienvenida', ...learningSlides.map(slide => slide.label)]

function HomeCarousel({ displayName }) {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <section className="home-carousel" aria-label="Explorar tu aprendizaje" aria-roledescription="carrusel">
      <Carousel
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        interval={null}
        prevLabel="Tarjeta anterior"
        nextLabel="Tarjeta siguiente"
        prevIcon={<i className="bi bi-arrow-left" aria-hidden="true" />}
        nextIcon={<i className="bi bi-arrow-right" aria-hidden="true" />}
        indicatorLabels={slideLabels.map(label => `Mostrar ${label.toLowerCase()}`)}
      >
        <Carousel.Item
          role="group"
          aria-roledescription="diapositiva"
          aria-label="1 de 4: Bienvenida"
          aria-hidden={activeIndex !== 0}
          inert={activeIndex !== 0}
        >
          <div className="dashboard-welcome">
            <div className="welcome-copy">
              <p className="eyebrow">Tu espacio de aprendizaje</p>
              <h1 id="welcome-title">
                Hola, {displayName}.<br /><span>Sigamos aprendiendo.</span>
              </h1>
              <p>
                Cada ejercicio es una oportunidad para avanzar.
                Descubrí, practicá y ganá confianza en matemática.
              </p>
            </div>
            <MathIllustration />
          </div>
        </Carousel.Item>

        {learningSlides.map((slide, index) => (
          <Carousel.Item
            key={slide.to}
            role="group"
            aria-roledescription="diapositiva"
            aria-label={`${index + 2} de 4: ${slide.label}`}
            aria-hidden={activeIndex !== index + 1}
            inert={activeIndex !== index + 1}
          >
            <div className={`dashboard-welcome home-slide-${slide.color}`}>
              <div className="welcome-copy">
                <p className="eyebrow">{slide.eyebrow}</p>
                <h2>{slide.title}</h2>
                <p>{slide.description}</p>
                <Button as={Link} to={slide.to} variant="primary" className="home-slide-link">
                  {slide.button}
                  <i className="bi bi-arrow-right" aria-hidden="true" />
                </Button>
              </div>
              <div className="learning-illustration" aria-hidden="true">
                <span className="learning-illustration-ring" />
                <span className="learning-illustration-icon"><i className={`bi ${slide.icon}`} /></span>
                <span className="learning-illustration-detail"><i className={`bi ${slide.detailIcon}`} /></span>
                <span className="learning-illustration-plus">+</span>
                <span className="learning-illustration-dot" />
              </div>
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
      <p className="visually-hidden" role="status" aria-atomic="true">
        {slideLabels[activeIndex]}, tarjeta {activeIndex + 1} de {slideLabels.length}.
      </p>
    </section>
  )
}

export default HomeCarousel
