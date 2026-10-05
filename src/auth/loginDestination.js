export function getLoginDestination(from) {
  if (typeof from !== 'string' || !from.startsWith('/')) return '/'
  try {
    const destination = new URL(from, 'https://numex.invalid')
    if (destination.origin !== 'https://numex.invalid' || /^\/(login|register)(\/|$)/.test(destination.pathname)) {
      return '/'
    }
    return destination.pathname + destination.search + destination.hash
  } catch {
    return '/'
  }
}
