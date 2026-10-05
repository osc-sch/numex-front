export class AuthError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'AuthError'
    this.status = status
  }
}

async function request(path, { body, signal, ...options } = {}) {
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
  if (!data) throw new AuthError('El servidor devolvió una respuesta inválida.', response.status)
  return data
}

export const login = (credentials) => request('/login', { method: 'POST', body: credentials })
export async function register(data) {
  const result = await request('/register', { method: 'POST', body: data })
  if (!Number.isInteger(result.user?.id) || !Number.isInteger(result.profile?.id)) {
    throw new AuthError('El servidor no pudo confirmar el registro. Intentá iniciar sesión antes de volver a registrarte.', 502)
  }
  return result
}
export const logout = () => request('/logout', { method: 'POST' })

export async function getSession(options) {
  try {
    const data = await request('/profile', options)
    if (!Number.isInteger(data.user?.id) || data.user.id <= 0 ||
        !Number.isInteger(data.profile?.id) || data.profile.id <= 0 || data.user.id_profile !== data.profile.id ||
        typeof data.profile.test_diagnostic_completed !== 'boolean') {
      throw new AuthError('No se pudo recuperar tu perfil.', 500)
    }
    return data
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}
