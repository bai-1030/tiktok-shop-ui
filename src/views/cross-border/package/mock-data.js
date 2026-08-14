const shopSeeds = [
  { value: '1001', label: 'Lumière Beauty MY', siteCode: 'MY', siteName: '马来西亚' },
  { value: '1002', label: 'Urban Nest PH', siteCode: 'PH', siteName: '菲律宾' },
  { value: '1003', label: 'Mellow Home TH', siteCode: 'TH', siteName: '泰国' },
  { value: '1005', label: 'Northstar Living SG', siteCode: 'SG', siteName: '新加坡' },
  { value: '1006', label: 'Aria Style UK', siteCode: 'UK', siteName: '英国' },
  { value: '1007', label: 'Daily Spark US', siteCode: 'US', siteName: '美国' }
]

export const shopOptions = shopSeeds.map(shop => ({ ...shop }))

export const siteOptions = [
  { value: 'MY', label: '马来西亚' },
  { value: 'PH', label: '菲律宾' },
  { value: 'TH', label: '泰国' },
  { value: 'SG', label: '新加坡' },
  { value: 'UK', label: '英国' },
  { value: 'US', label: '美国' }
]

export const carrierOptions = [
  { value: 'TikTok Logistics', label: 'TikTok Logistics', channels: ['平台标准物流', '平台经济物流'] },
  { value: 'J&T Express', label: 'J&T Express', channels: ['东南亚专线', '本地极速达'] },
  { value: 'DHL eCommerce', label: 'DHL eCommerce', channels: ['全球优先', '全球经济'] },
  { value: 'Ninja Van', label: 'Ninja Van', channels: ['东南亚标准', '次日达'] },
  { value: 'YunExpress', label: '云途物流', channels: ['美国专线', '英国专线', '全球挂号'] }
]

export const packageStatusOptions = [
  { value: 'pending', label: '待发货', type: 'warning' },
  { value: 'ready', label: '待揽收', type: 'primary' },
  { value: 'transit', label: '运输中', type: '' },
  { value: 'delivered', label: '已签收', type: 'success' },
  { value: 'exception', label: '异常', type: 'danger' }
]

const productSets = [
  [
    { name: 'Glow Repair 玻尿酸修护精华', sku: 'LB-SERUM-30ML', quantity: 2, unitWeight: 185 },
    { name: 'Cloud Touch 美妆蛋套装', sku: 'LB-PUFF-3PCS', quantity: 1, unitWeight: 80 }
  ],
  [{ name: 'Nordic 折叠收纳篮', sku: 'UN-BASKET-GY-L', quantity: 1, unitWeight: 760 }],
  [{ name: 'Mellow 亚麻抱枕套', sku: 'MH-CUSHION-BE-45', quantity: 2, unitWeight: 220 }],
  [
    { name: 'Northstar 香薰蜡烛', sku: 'NL-CANDLE-FIG-220', quantity: 1, unitWeight: 410 },
    { name: '极简黄铜烛台', sku: 'NL-HOLDER-BR-S', quantity: 1, unitWeight: 265 }
  ],
  [{ name: 'Aria 真丝发带', sku: 'AS-HAIRBAND-BK', quantity: 3, unitWeight: 45 }],
  [
    { name: 'Daily Spark 桌面补光灯', sku: 'DSK-LIGHT-WH-01', quantity: 1, unitWeight: 620 },
    { name: 'USB-C 编织充电线', sku: 'DSK-CABLE-C2M', quantity: 2, unitWeight: 72 }
  ]
]

const recipients = [
  { name: 'Aisyah Rahman', phone: '+60 12-345 8901', address: '18 Jalan SS 15/4, Subang Jaya, Selangor' },
  { name: 'Maria Santos', phone: '+63 917 555 1820', address: '42 Sampaguita Street, Quezon City, Metro Manila' },
  { name: 'Pimchanok S.', phone: '+66 82 410 7736', address: '99/18 Sukhumvit Road, Bangkok' },
  { name: 'Chloe Tan', phone: '+65 8128 9034', address: '81 Tampines Avenue 4, Singapore' },
  { name: 'Emily Carter', phone: '+44 7700 912 681', address: '26 King Street, Manchester, United Kingdom' },
  { name: 'Olivia Miller', phone: '+1 415 555 0198', address: '840 Market Street, San Francisco, CA' }
]

const statusCycle = [
  'pending', 'ready', 'transit', 'delivered', 'exception', 'transit',
  'pending', 'delivered', 'ready', 'transit', 'exception', 'delivered',
  'pending', 'transit', 'ready', 'delivered', 'exception', 'transit',
  'pending', 'ready', 'delivered', 'transit', 'exception', 'pending'
]

const exceptionReasons = [
  '物流轨迹超过 36 小时未更新，请联系承运商核查。',
  '收件地址信息不完整，包裹暂时滞留分拨中心。',
  '清关资料待补充，需要上传商品申报信息。',
  '首次派送失败，等待收件人确认二次派送时间。'
]

const dates = ['2026-08-14', '2026-08-13', '2026-08-12', '2026-08-11', '2026-08-10', '2026-08-09']

function pad(value) {
  return String(value).padStart(2, '0')
}

function buildTimeline(status, createdAt, shippedAt, updatedAt, exceptionReason) {
  const timeline = [
    { title: '订单已进入包裹中心', description: '订单审核通过，等待仓库处理', time: createdAt, type: 'primary' }
  ]
  if (status === 'pending') return timeline

  timeline.push({ title: '包裹信息已确认', description: '物流渠道和运单信息已生成', time: shippedAt, type: 'success' })
  if (status === 'ready') {
    timeline.push({ title: '等待承运商揽收', description: '包裹已移交仓库出库区', time: updatedAt, type: 'primary' })
  }
  if (status === 'transit') {
    timeline.push({ title: '承运商已揽收', description: '包裹已进入运输网络', time: updatedAt, type: 'primary' })
  }
  if (status === 'delivered') {
    timeline.push({ title: '承运商已揽收', description: '包裹已进入运输网络', time: shippedAt, type: 'primary' })
    timeline.push({ title: '包裹已签收', description: '收件人已完成签收', time: updatedAt, type: 'success' })
  }
  if (status === 'exception') {
    timeline.push({ title: '物流出现异常', description: exceptionReason, time: updatedAt, type: 'danger' })
  }
  return timeline
}

function createPackage(index, status) {
  const id = 3001 + index
  const shop = shopSeeds[index % shopSeeds.length]
  const recipient = recipients[index % recipients.length]
  const items = productSets[index % productSets.length].map(item => ({ ...item }))
  const carrier = status === 'pending' ? '' : carrierOptions[(index + 1) % carrierOptions.length].value
  const carrierItem = carrierOptions.find(item => item.value === carrier)
  const channel = carrierItem ? carrierItem.channels[index % carrierItem.channels.length] : ''
  const date = dates[index % dates.length]
  const hour = 8 + (index % 10)
  const createdAt = `${date} ${pad(hour)}:${pad((index * 7) % 60)}:00`
  const shippedAt = status === 'pending' ? '' : `${date} ${pad(Math.min(hour + 2, 22))}:${pad((index * 11) % 60)}:00`
  const updatedAt = `${date} ${pad(Math.min(hour + 4, 23))}:${pad((index * 13) % 60)}:00`
  const exceptionReason = status === 'exception' ? exceptionReasons[index % exceptionReasons.length] : ''
  const itemWeight = items.reduce((total, item) => total + item.unitWeight * item.quantity, 0)
  const weight = itemWeight + 120 + (index % 4) * 35

  return {
    id,
    packageNo: `PKG260814${String(index + 1).padStart(4, '0')}`,
    orderNo: `TT${shop.siteCode}2608${String(420015 + index * 17)}`,
    shopId: shop.value,
    shopName: shop.label,
    siteCode: shop.siteCode,
    siteName: shop.siteName,
    recipientName: recipient.name,
    recipientPhone: recipient.phone,
    address: recipient.address,
    items,
    productName: items[0].name,
    sku: items[0].sku,
    quantity: items.reduce((total, item) => total + item.quantity, 0),
    weight,
    carrier,
    channel,
    trackingNo: status === 'pending' ? '' : `${['TTLS', 'JT', 'DHL', 'NV', 'YT'][index % 5]}260814${String(830040 + index * 29)}`,
    shippingCost: status === 'pending' ? 0 : Number((18.6 + (index % 8) * 3.45).toFixed(2)),
    status,
    exceptionReason,
    createdAt,
    shippedAt,
    updatedAt,
    estimatedDelivery: status === 'pending' ? '待发货后计算' : `2026-08-${pad(16 + (index % 6))}`,
    note: index % 4 === 0 ? '易碎商品，出库前请检查外包装并加贴提示标签。' : '',
    timeline: buildTimeline(status, createdAt, shippedAt, updatedAt, exceptionReason)
  }
}

export function createMockPackages() {
  return statusCycle.map((status, index) => createPackage(index, status))
}
