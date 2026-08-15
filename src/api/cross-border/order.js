import request from '@/utils/request'

export function listCrossBorderOrders(query) {
  return request({ url: '/api/v1/cross-border/orders', method: 'get', params: query })
}

export function getCrossBorderOrderSummary() {
  return request({ url: '/api/v1/cross-border/orders/summary', method: 'get' })
}

export function getCrossBorderOrder(query) {
  return request({ url: '/api/v1/cross-border/orders/detail', method: 'get', params: query })
}
