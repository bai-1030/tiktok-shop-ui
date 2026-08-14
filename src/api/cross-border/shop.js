import request from '@/utils/request'

export function listCrossBorderShops(query) {
  return request({ url: '/api/v1/cross-border/shops', method: 'get', params: query })
}

export function getCrossBorderShopSummary() {
  return request({ url: '/api/v1/cross-border/shops/summary', method: 'get' })
}

export function getCrossBorderShop(id) {
  return request({ url: `/api/v1/cross-border/shops/${id}`, method: 'get' })
}

export function updateCrossBorderShop(id, data) {
  return request({ url: `/api/v1/cross-border/shops/${id}`, method: 'put', data })
}

export function updateCrossBorderShopStatus(id, localStatus) {
  const data = { localStatus }
  return request({ url: `/api/v1/cross-border/shops/${id}/status`, method: 'put', data })
}

export function batchUpdateCrossBorderShopStatus(ids, localStatus) {
  const data = { ids, localStatus }
  return request({ url: '/api/v1/cross-border/shops/status', method: 'put', data })
}

export function syncCrossBorderShops(data) {
  return request({ url: '/api/v1/cross-border/shops/sync', method: 'post', data })
}

export function listCrossBorderShopSyncRecords(query) {
  return request({ url: '/api/v1/cross-border/shops/sync-records', method: 'get', params: query })
}
