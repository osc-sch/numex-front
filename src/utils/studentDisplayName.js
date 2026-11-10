export function getStudentDisplayName(student, fallback = 'Alumno') {
  const fullName = student?.nombreCompleto?.trim()
  if (fullName) return fullName

  const name = [student?.nombre, student?.apellido]
    .map(value => value?.trim())
    .filter(Boolean)
    .join(' ')
  return name || student?.username?.trim() || fallback
}
