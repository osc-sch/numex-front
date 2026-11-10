export function getStudentActivityStatus(activity) {
  const progress = activity?.progresoAlumno
  if (progress?.estado === 'en_progreso') return 'en_progreso'
  if (progress?.completada === true || progress?.estado === 'completada') return 'completada'
  return 'pendiente'
}
