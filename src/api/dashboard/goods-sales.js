import request from '@/utils/request'

export function getDashboardGoodsSaleOptions() {
  return request({
    url: '/api/v1/dashboard/goods-sales/options',
    method: 'get'
  })
}

export function searchDashboardGoodsSales(data) {
  return request({
    url: '/api/v1/dashboard/goods-sales',
    method: 'post',
    data,
    timeout: 65000
  })
}
