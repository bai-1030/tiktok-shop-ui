export const shopOptions = [
  { value: '1001', label: 'Lumière Beauty MY', siteCode: 'MY', siteName: '马来西亚' },
  { value: '1002', label: 'Urban Nest PH', siteCode: 'PH', siteName: '菲律宾' },
  { value: '1003', label: 'Mellow Home TH', siteCode: 'TH', siteName: '泰国' },
  { value: '1005', label: 'Northstar Living SG', siteCode: 'SG', siteName: '新加坡' },
  { value: '1006', label: 'Aria Style UK', siteCode: 'UK', siteName: '英国' },
  { value: '1007', label: 'Daily Spark US', siteCode: 'US', siteName: '美国' },
  { value: '1009', label: 'Nova Tech PH', siteCode: 'PH', siteName: '菲律宾' }
]

export const taskTypeOptions = [
  { value: 'product', label: '商品与 SKU', shortLabel: '商品', color: '#7c3aed', description: '同步商品、SKU、售价和平台库存' },
  { value: 'order', label: '新订单', shortLabel: '订单', color: '#2563eb', description: '增量拉取 TikTok Shop 新订单' },
  { value: 'orderStatus', label: '订单状态', shortLabel: '状态', color: '#0891b2', description: '同步订单审核、取消和发货状态' },
  { value: 'inventory', label: '库存差异', shortLabel: '库存', color: '#ea580c', description: '比对平台库存与本地可售库存' },
  { value: 'logistics', label: '包裹物流', shortLabel: '物流', color: '#059669', description: '更新运单轨迹、签收和异常状态' },
  { value: 'auth', label: '授权检查', shortLabel: '授权', color: '#db2777', description: '检查店铺 Token 和授权有效期' }
]

export const taskStatusOptions = [
  { value: 'queued', label: '等待执行', type: 'info' },
  { value: 'running', label: '运行中', type: 'primary' },
  { value: 'success', label: '执行成功', type: 'success' },
  { value: 'partial', label: '部分成功', type: 'warning' },
  { value: 'failed', label: '执行失败', type: 'danger' },
  { value: 'cancelled', label: '已取消', type: 'info' }
]

export const triggerOptions = [
  { value: 'schedule', label: '定时触发' },
  { value: 'manual', label: '手动执行' },
  { value: 'retry', label: '失败重试' }
]

export const frequencyOptions = [
  { value: '5m', label: '每 5 分钟', cron: '0 */5 * * * *' },
  { value: '30m', label: '每 30 分钟', cron: '0 */30 * * * *' },
  { value: '1h', label: '每小时', cron: '0 0 * * * *' },
  { value: 'daily2', label: '每天凌晨 02:00', cron: '0 0 2 * * *' },
  { value: 'daily8', label: '每天上午 08:00', cron: '0 0 8 * * *' }
]

const statusCycle = [
  'success', 'running', 'failed', 'success', 'partial', 'queued', 'success',
  'success', 'running', 'success', 'failed', 'partial', 'success', 'cancelled',
  'success', 'success', 'failed', 'running', 'success', 'partial', 'queued',
  'success', 'cancelled', 'success', 'failed', 'success', 'partial', 'success'
]

const dates = ['2026-08-14', '2026-08-14', '2026-08-14', '2026-08-13', '2026-08-13', '2026-08-12']
const errorMessages = [
  'TikTok API 请求超时，连续重试 3 次后仍未恢复。',
  '店铺授权已过期，无法读取平台数据。',
  '部分 SKU 缺少本地映射，已跳过异常记录。',
  '平台接口触发频率限制，请稍后重新执行。',
  '订单数据校验失败，存在缺失的收货国家字段。'
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function buildSteps(status, progress) {
  const definitions = [
    ['连接 TikTok Shop', '验证店铺授权并建立 API 会话'],
    ['读取平台数据', '按同步游标分批获取数据'],
    ['解析与校验', '校验字段并识别新增或变更记录'],
    ['写入本地系统', '幂等更新业务数据并汇总结果']
  ]
  return definitions.map((definition, index) => {
    let stepStatus = 'pending'
    if (status === 'queued' || status === 'cancelled') stepStatus = 'pending'
    if (status === 'running') {
      const completedSteps = Math.floor(progress / 25)
      stepStatus = index < completedSteps ? 'success' : index === completedSteps ? 'process' : 'pending'
    }
    if (['success', 'partial'].includes(status)) stepStatus = 'success'
    if (status === 'failed') stepStatus = index === 1 ? 'error' : index < 1 ? 'success' : 'pending'
    return { title: definition[0], description: definition[1], status: stepStatus }
  })
}

function buildLogs(taskNo, status, createdAt, errorSummary) {
  const time = createdAt.slice(11, 19)
  const logs = [
    { time, level: 'INFO', message: `[${taskNo}] 任务已创建，准备校验执行参数` }
  ]
  if (status !== 'queued' && status !== 'cancelled') {
    logs.push({ time, level: 'INFO', message: '店铺授权校验通过，开始读取 TikTok Shop 数据' })
    logs.push({ time, level: 'INFO', message: '已获取首批平台数据，开始执行字段解析与幂等校验' })
  }
  if (status === 'success') logs.push({ time, level: 'SUCCESS', message: '全部数据处理完成，同步任务执行成功' })
  if (status === 'partial') logs.push({ time, level: 'WARN', message: errorSummary })
  if (status === 'failed') logs.push({ time, level: 'ERROR', message: errorSummary })
  if (status === 'running') logs.push({ time, level: 'INFO', message: '任务仍在运行，正在写入本地业务数据' })
  if (status === 'cancelled') logs.push({ time, level: 'WARN', message: '任务已由运营人员手动取消' })
  return logs
}

function createTask(index, status) {
  const id = 5001 + index
  const shop = shopOptions[index % shopOptions.length]
  const type = taskTypeOptions[index % taskTypeOptions.length]
  const date = dates[index % dates.length]
  const hour = 7 + (index % 15)
  const minute = (index * 7) % 60
  const createdAt = `${date} ${pad(hour)}:${pad(minute)}:${pad((index * 11) % 60)}`
  const trigger = index % 4 === 0 ? 'manual' : 'schedule'
  const mode = index % 5 === 0 ? 'full' : 'incremental'
  const totalCount = type.value === 'auth' ? 1 : 80 + (index * 137) % 1850
  const progressMap = { queued: 0, running: 38 + index % 4 * 13, success: 100, partial: 100, failed: 41 + index % 3 * 12, cancelled: 18 }
  const progress = progressMap[status]
  const processed = Math.round(totalCount * progress / 100)
  const failedCount = status === 'partial' ? Math.max(2, index % 13 + 2) : status === 'failed' ? Math.max(1, Math.round(processed * 0.18)) : 0
  const skippedCount = ['success', 'partial'].includes(status) ? index % 19 : 0
  const successCount = Math.max(0, processed - failedCount - skippedCount)
  const errorSummary = ['partial', 'failed'].includes(status) ? errorMessages[index % errorMessages.length] : ''
  const durationSeconds = status === 'queued' ? 0 : 18 + (index * 17) % 260

  return {
    id,
    taskNo: `SYNC2608${String(140001 + index).padStart(6, '0')}`,
    taskName: `${type.label}同步 · ${shop.label}`,
    taskType: type.value,
    shopId: shop.value,
    shopName: shop.label,
    siteCode: shop.siteCode,
    siteName: shop.siteName,
    mode,
    trigger,
    status,
    progress,
    totalCount,
    successCount,
    skippedCount,
    failedCount,
    createdAt,
    startedAt: status === 'queued' ? '' : createdAt,
    finishedAt: ['queued', 'running'].includes(status) ? '' : `${date} ${pad(hour)}:${pad(Math.min(59, minute + 4))}:${pad((index * 13) % 60)}`,
    durationSeconds,
    operator: trigger === 'manual' ? ['林晓彤', '陈乐', '王亦晨'][index % 3] : '系统调度',
    retryOf: '',
    errorSummary,
    remark: index % 6 === 0 ? '运营侧重点检查任务，请保留失败记录。' : '',
    params: {
      dateRange: ['order', 'orderStatus'].includes(type.value) ? [`${date} 00:00:00`, `${date} 23:59:59`] : [],
      conflictPolicy: 'platformPriority',
      cursor: mode === 'incremental' ? `cursor_${shop.siteCode}_${index + 100}` : ''
    },
    steps: buildSteps(status, progress),
    logs: buildLogs(`SYNC2608${String(140001 + index).padStart(6, '0')}`, status, createdAt, errorSummary),
    failures: failedCount ? Array.from({ length: Math.min(failedCount, 5) }, (item, failureIndex) => ({
      rowNo: failureIndex + 1,
      entityId: `${type.shortLabel.toUpperCase()}-${String(88020 + index * 7 + failureIndex)}`,
      reason: errorMessages[(index + failureIndex) % errorMessages.length]
    })) : []
  }
}

const scheduleSeeds = [
  { id: 8001, name: '新订单增量同步', taskType: 'order', frequency: '5m', scope: '全部启用店铺', enabled: true, lastRun: '2026-08-14 10:30:00', nextRun: '2026-08-14 10:35:00', lastStatus: 'success', successRate: 99.8, description: '持续拉取各店铺最新订单，按平台订单号幂等写入。' },
  { id: 8002, name: '订单状态同步', taskType: 'orderStatus', frequency: '30m', scope: '全部启用店铺', enabled: true, lastRun: '2026-08-14 10:30:00', nextRun: '2026-08-14 11:00:00', lastStatus: 'success', successRate: 99.3, description: '更新订单审核、取消、退款和发货状态。' },
  { id: 8003, name: '库存差异检查', taskType: 'inventory', frequency: '30m', scope: '全部启用店铺', enabled: true, lastRun: '2026-08-14 10:00:00', nextRun: '2026-08-14 10:30:00', lastStatus: 'partial', successRate: 97.6, description: '比较 TikTok 库存与本地可售库存并记录差异。' },
  { id: 8004, name: '包裹物流轨迹同步', taskType: 'logistics', frequency: '1h', scope: '全部启用店铺', enabled: true, lastRun: '2026-08-14 10:00:00', nextRun: '2026-08-14 11:00:00', lastStatus: 'success', successRate: 98.9, description: '更新承运商轨迹、签收和物流异常信息。' },
  { id: 8005, name: '商品与 SKU 全量校准', taskType: 'product', frequency: 'daily2', scope: '全部启用店铺', enabled: true, lastRun: '2026-08-14 02:00:00', nextRun: '2026-08-15 02:00:00', lastStatus: 'success', successRate: 99.5, description: '每天全量校准商品、SKU、售价和平台库存。' },
  { id: 8006, name: '店铺授权有效性检查', taskType: 'auth', frequency: 'daily8', scope: '全部启用店铺', enabled: false, lastRun: '2026-08-13 08:00:00', nextRun: '已暂停', lastStatus: 'failed', successRate: 96.2, description: '检查 Token 有效期并识别需要重新授权的店铺。' }
]

export function createMockSyncTasks() {
  return statusCycle.map((status, index) => createTask(index, status))
}

export function createMockSchedules() {
  return scheduleSeeds.map(schedule => ({ ...schedule }))
}
