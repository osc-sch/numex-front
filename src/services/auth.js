export class AuthError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

function isValidId(value) {
  return (Number.isInteger(value) && value > 0) || (typeof value === 'string' && value.trim().length > 0)
}

async function request(path, { body, signal, allowEmptyResponse = false, ...options } = {}) {
  let response
  try {
    response = await fetch(`/api/auth${path}`, {
      ...options,
      credentials: 'include',
      cache: 'no-store',
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new AuthError('No se pudo conectar con el servidor. Intentá nuevamente.', 0)
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const messages = data?.errors?.map(error => error.msg).filter(message => typeof message === 'string')
    throw new AuthError(
      messages?.length ? [...new Set(messages)].join('. ') :
        data?.message || 'No se pudo completar la solicitud. Intentá nuevamente.',
      response.status,
    )
  }
  if (!data && !allowEmptyResponse) throw new AuthError('El servidor devolvió una respuesta inválida.', response.status)
  return data ?? {}
}

export const login = (credentials) => request('/login', {
  method: 'POST',
  body: credentials,
  allowEmptyResponse: true,
})
export async function register(data) {
  const result = await request('/register', { method: 'POST', body: data })
  if (!isValidId(result.user?.id) || !isValidId(result.profile?.id)) {
    throw new AuthError('El servidor no pudo confirmar el registro. Intentá iniciar sesión antes de volver a registrarte.', 502)
  }
  return result
}
export const logout = () => request('/logout', { method: 'POST', allowEmptyResponse: true })

export async function getSession(options) {
  try {
    const data = await request('/profile', options)
    const isTeacher = data.user?.id_rol === 2
    const profileIds = isTeacher
      ? [data.user?.id_profile_docente, data.user?.id_profile].filter(id => id != null)
      : [data.user?.id_profile]
    const hasDiagnosticState = Object.hasOwn(data.profile ?? {}, 'test_diagnostic_completed')
    if (!isValidId(data.user?.id) ||
        !Number.isInteger(data.user.id_rol) || data.user.id_rol <= 0 ||
        !isValidId(data.profile?.id) || profileIds.length === 0 ||
        profileIds.some(id => id !== data.profile.id) ||
        (!isTeacher && hasDiagnosticState && typeof data.profile.test_diagnostic_completed !== 'boolean')) {
      throw new AuthError('No se pudo recuperar tu perfil.', 500)
    }
    return data
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}
