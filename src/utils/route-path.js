function normalizePath(value) {
  const segments = value.split('/')
  const normalized = []

  for (const segment of segments) {
    if (!segment || segment === '.') continue
    if (segment === '..') {
      if (normalized.length > 0 && normalized[normalized.length - 1] !== '..') {
        normalized.pop()
      } else if (value.charAt(0) !== '/') {
        normalized.push('..')
      }
      continue
    }
    normalized.push(segment)
  }

  const result = normalized.join('/')
  return value.charAt(0) === '/' ? '/' + result : result || '.'
}

export function resolveRoutePath(basePath = '/', routePath = '') {
  if (routePath.charAt(0) === '/') {
    return normalizePath(routePath)
  }
  return normalizePath(`${basePath || '/'}/${routePath}`)
}
