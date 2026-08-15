import request from '@/utils/request'

export function listCrossBorderSyncTasks(query) {
  return request({ url: '/api/v1/cross-border/sync-tasks', method: 'get', params: query })
}

export function getCrossBorderSyncTaskSummary() {
  return request({ url: '/api/v1/cross-border/sync-tasks/summary', method: 'get' })
}

export function getCrossBorderSyncTask(id) {
  return request({ url: `/api/v1/cross-border/sync-tasks/${id}`, method: 'get' })
}

export function createCrossBorderSyncTask(data) {
  return request({ url: '/api/v1/cross-border/sync-tasks', method: 'post', data })
}

export function cancelCrossBorderSyncTask(id) {
  return request({ url: `/api/v1/cross-border/sync-tasks/${id}/cancel`, method: 'post' })
}

export function retryCrossBorderSyncTask(id) {
  return request({ url: `/api/v1/cross-border/sync-tasks/${id}/retry`, method: 'post' })
}

export function runCrossBorderSyncTaskAgain(id) {
  return request({ url: `/api/v1/cross-border/sync-tasks/${id}/run-again`, method: 'post' })
}

export function listCrossBorderSyncSchedules() {
  return request({ url: '/api/v1/cross-border/sync-tasks/schedules', method: 'get' })
}

export function createCrossBorderSyncSchedule(data) {
  return request({ url: '/api/v1/cross-border/sync-tasks/schedules', method: 'post', data })
}

export function updateCrossBorderSyncSchedule(id, data) {
  return request({ url: `/api/v1/cross-border/sync-tasks/schedules/${id}`, method: 'put', data })
}

export function toggleCrossBorderSyncSchedule(id, enabled) {
  return request({ url: `/api/v1/cross-border/sync-tasks/schedules/${id}/status`, method: 'put', data: { enabled }})
}

export function runCrossBorderSyncSchedule(id) {
  return request({ url: `/api/v1/cross-border/sync-tasks/schedules/${id}/run`, method: 'post' })
}
