const hasText = (value) => typeof value === 'string' && value.trim().length > 0
const isPercentage = (value) => Number.isFinite(value) && value >= 0 && value <= 100
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0

export function parseCorrectionProfile(payload, expectedTestId) {
  const profile = Array.isArray(payload) && payload.length === 1 ? payload[0] : payload

  if (
    !hasText(profile?.perfil_id) ||
    !hasText(profile?.test_id) ||
    (expectedTestId != null && profile.test_id !== expectedTestId) ||
    !hasText(profile?.alumno?.nombre) ||
    !isPositiveInteger(profile?.alumno?.anio_ingreso) ||
    !Array.isArray(profile?.temas) ||
    !profile.temas.every((topic) =>
      hasText(topic?.contenido_id) &&
      isPositiveInteger(topic?.anio) &&
      hasText(topic?.eje) &&
      hasText(topic?.tema) &&
      isPercentage(topic?.dominio_pct)
    ) ||
    new Set(profile.temas.map((topic) => topic.contenido_id)).size !== profile.temas.length ||
    !Number.isInteger(profile?.practica_diaria?.cantidad_recomendada) ||
    profile.practica_diaria.cantidad_recomendada < 0 ||
    !Array.isArray(profile?.practica_diaria?.cola_inicial) ||
    !profile.practica_diaria.cola_inicial.every((item) =>
      hasText(item?.contenido_id) &&
      hasText(item?.tema) &&
      hasText(item?.habilidad_id) &&
      hasText(item?.habilidad) &&
      isPercentage(item?.dominio_pct)
    )
  ) {
    return null
  }

  return profile
}
