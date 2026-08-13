import request from '@/utils/request'

export function listMiaoshouConfig(query) {
  return request({ url: '/api/v1/miaoshou-config', method: 'get', params: query })
}

export function getMiaoshouConfig(id) {
  return request({ url: '/api/v1/miaoshou-config/' + id, method: 'get' })
}

export function addMiaoshouConfig(data) {
  return request({ url: '/api/v1/miaoshou-config', method: 'post', data })
}

export function updateMiaoshouConfig(data) {
  return request({ url: '/api/v1/miaoshou-config/' + data.id, method: 'put', data })
}

export function deleteMiaoshouConfig(ids) {
  const data = { ids }
  return request({ url: '/api/v1/miaoshou-config', method: 'delete', data })
}

export function updateMiaoshouConfigStatus(id, status) {
  const data = { status }
  return request({ url: '/api/v1/miaoshou-config/' + id + '/status', method: 'put', data })
}

export function testMiaoshouConfig(id) {
  return request({ url: '/api/v1/miaoshou-config/' + id + '/test', method: 'post' })
}
