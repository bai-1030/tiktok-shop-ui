import request from '@/utils/request'

export function listCrossBorderPackages(query) {
  return request({ url: '/api/v1/cross-border/packages', method: 'get', params: query })
}

export function getCrossBorderPackageSummary() {
  return request({ url: '/api/v1/cross-border/packages/summary', method: 'get' })
}

export function getCrossBorderPackage(id) {
  return request({ url: `/api/v1/cross-border/packages/${id}`, method: 'get', timeout: 30000 })
}

export function getCrossBorderPackageTracking(id) {
  return request({ url: `/api/v1/cross-border/packages/${id}/tracking`, method: 'get' })
}

export function refreshCrossBorderPackageTracking(id) {
  return request({ url: `/api/v1/cross-border/packages/${id}/tracking/refresh`, method: 'post', timeout: 30000 })
}

export function syncCrossBorderPackages(data) {
  return request({ url: '/api/v1/cross-border/packages/sync', method: 'post', data, timeout: 120000 })
}

export function listCrossBorderPackageSyncRecords(query) {
  return request({ url: '/api/v1/cross-border/packages/sync-records', method: 'get', params: query })
}
