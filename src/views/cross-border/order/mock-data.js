const orderSeeds = [
  ['100124058623117', 'TTMY-260813-00871', 1001, 'Lumière Beauty MY', 'MY', '马来西亚', 'MYR', '林珊珊', 'Awaiting Shipment', '2026-08-13 22:42:18', 'Glow Repair Face Serum', '30ml / Twin Pack', 2, 129.8, 'paid', 'pending', false],
  ['100124058621904', 'TTPH-260813-00652', 1002, 'Urban Nest PH', 'PH', '菲律宾', 'PHP', 'Maria Santos', 'Awaiting Collection', '2026-08-13 21:38:45', 'Minimalist Storage Basket', 'Cream / Large', 1, 899, 'paid', 'ready', false],
  ['100124058619786', 'TTTH-260813-00543', 1003, 'Mellow Home TH', 'TH', '泰国', 'THB', 'Nicha P.', 'In Transit', '2026-08-13 20:51:09', 'Soft Linen Bedding Set', 'Sage / Queen', 1, 1590, 'paid', 'shipped', false],
  ['100124058617239', 'TTVN-260813-00417', 1004, 'Viva Gear VN', 'VN', '越南', 'VND', 'Nguyễn Minh', 'On Hold', '2026-08-13 19:46:26', 'Trail Running Hydration Belt', 'Black / M', 1, 469000, 'paid', 'exception', true],
  ['100124058614825', 'TTSG-260813-00380', 1005, 'Northstar Living SG', 'SG', '新加坡', 'SGD', 'Jia Wen', 'Completed', '2026-08-13 18:32:50', 'Nordic Glass Table Lamp', 'Amber / EU Plug', 1, 89.9, 'paid', 'delivered', false],
  ['100124058611452', 'TTUK-260813-00269', 1006, 'Aria Style UK', 'UK', '英国', 'GBP', 'Sophie Miller', 'Cancelled', '2026-08-13 17:15:37', 'Silk Square Scarf', 'Navy Floral', 2, 42.5, 'refunded', 'cancelled', false],
  ['100124058608911', 'TTUS-260813-00198', 1007, 'Daily Spark US', 'US', '美国', 'USD', 'Emily Clark', 'Awaiting Review', '2026-08-13 15:59:08', 'Portable Smoothie Blender', 'Mint / 450ml', 1, 39.99, 'paid', 'pending', false],
  ['100124058605738', 'TTMY-260813-00112', 1008, 'Petal Room MY', 'MY', '马来西亚', 'MYR', 'Aina Rahman', 'On Hold', '2026-08-13 14:26:41', 'Dried Flower Gift Box', 'Rose Pink', 1, 78.9, 'paid', 'exception', true],
  ['100124052294806', 'TTPH-260812-00915', 1009, 'Nova Tech PH', 'PH', '菲律宾', 'PHP', 'James Dela Cruz', 'Awaiting Shipment', '2026-08-12 23:48:19', 'Wireless Lavalier Microphone', 'USB-C / Black', 1, 1299, 'paid', 'pending', false],
  ['100124052287413', 'TTTH-260812-00808', 1010, 'Casa Bloom TH', 'TH', '泰国', 'THB', 'Pimchanok S.', 'Awaiting Review', '2026-08-12 22:16:54', 'Ceramic Aroma Diffuser', 'Ivory / 300ml', 1, 690, 'paid', 'pending', false],
  ['100124052278025', 'TTVN-260812-00671', 1011, 'Echo Active VN', 'VN', '越南', 'VND', 'Trần Quang', 'In Transit', '2026-08-12 20:34:12', 'Quick-Dry Training Tee', 'Blue / L', 3, 735000, 'paid', 'shipped', false],
  ['100124052261589', 'TTSG-260812-00456', 1012, 'Kindred Kids SG', 'SG', '新加坡', 'SGD', 'Olivia Tan', 'Completed', '2026-08-12 16:10:06', 'Wooden Building Blocks', '80 pcs', 1, 54.8, 'paid', 'delivered', false],
  ['100124047963182', 'TTUS-260811-00842', 1007, 'Daily Spark US', 'US', '美国', 'USD', 'Daniel White', 'Awaiting Collection', '2026-08-11 21:54:39', 'Magnetic Phone Stand', 'Silver', 2, 45.98, 'paid', 'ready', false],
  ['100124047951670', 'TTMY-260811-00618', 1001, 'Lumière Beauty MY', 'MY', '马来西亚', 'MYR', 'Nur Amalina', 'Completed', '2026-08-11 18:23:45', 'Vitamin C Brightening Mask', '5 pcs / Box', 2, 69.8, 'paid', 'delivered', false],
  ['100124047942305', 'TTPH-260811-00490', 1009, 'Nova Tech PH', 'PH', '菲律宾', 'PHP', 'Angela Reyes', 'Cancelled', '2026-08-11 15:42:17', 'Foldable Laptop Stand', 'Space Gray', 1, 699, 'refunded', 'cancelled', false],
  ['100124041629758', 'TTTH-260810-00731', 1003, 'Mellow Home TH', 'TH', '泰国', 'THB', 'Suda K.', 'Awaiting Shipment', '2026-08-10 19:37:24', 'Memory Foam Seat Cushion', 'Charcoal', 1, 890, 'paid', 'pending', true],
  ['100124041611394', 'TTVN-260810-00415', 1011, 'Echo Active VN', 'VN', '越南', 'VND', 'Lê Hoàng', 'Awaiting Review', '2026-08-10 13:20:58', 'Resistance Band Set', '5 levels', 1, 289000, 'paid', 'pending', false],
  ['100124035302671', 'TTSG-260809-00604', 1005, 'Northstar Living SG', 'SG', '新加坡', 'SGD', 'Marcus Lim', 'In Transit', '2026-08-09 17:08:31', 'Bamboo Bedside Organizer', 'Natural', 1, 36.9, 'paid', 'shipped', false]
]

const statusMap = {
  'Awaiting Review': 'review',
  'Awaiting Shipment': 'shipment',
  'Awaiting Collection': 'collection',
  'In Transit': 'transit',
  Completed: 'completed',
  Cancelled: 'cancelled',
  'On Hold': 'hold'
}

const logistics = {
  pending: { company: '', trackingNo: '', text: '待处理' },
  ready: { company: 'J&T Express', trackingNo: 'JT260813890452', text: '等待揽收' },
  shipped: { company: 'TikTok Logistics', trackingNo: 'TTLSG26081324718', text: '运输中' },
  delivered: { company: 'TikTok Logistics', trackingNo: 'TTLSG26081115806', text: '已签收' },
  exception: { company: '', trackingNo: '', text: '信息异常' },
  cancelled: { company: '', trackingNo: '', text: '已取消' }
}

const addresses = {
  MY: '12 Jalan PJU 5/9, Petaling Jaya, Selangor 47810',
  PH: '48 Jupiter Street, Makati City, Metro Manila 1209',
  TH: '88 Sukhumvit Road, Khlong Toei, Bangkok 10110',
  VN: '126 Nguyễn Văn Linh, Quận 7, TP. Hồ Chí Minh',
  SG: '18 Tampines Central 1, Singapore 529538',
  UK: '24 King Street, Manchester M2 6AQ',
  US: '815 Market Street, San Francisco, CA 94103'
}

export const orderStatusOptions = [
  { value: 'review', label: '待审核' },
  { value: 'shipment', label: '待发货' },
  { value: 'collection', label: '待揽收' },
  { value: 'transit', label: '运输中' },
  { value: 'completed', label: '已完成' },
  { value: 'hold', label: '已挂起' },
  { value: 'cancelled', label: '已取消' }
]

export const shopOptions = Array.from(new Map(orderSeeds.map(order => [order[2], { value: order[2], label: order[3], siteCode: order[4] }])).values())

export const siteOptions = Array.from(new Map(orderSeeds.map(order => [order[4], { value: order[4], label: order[5] }])).values())

export function createMockOrders() {
  return orderSeeds.map((order, index) => {
    const [orderNo, platformOrderNo, shopId, shopName, siteCode, siteName, currency, buyerName, sourceStatus, paidAt, productName, sku, quantity, amount, payStatus, logisticsStatus, abnormal] = order
    const status = statusMap[sourceStatus]
    const shippingFee = currency === 'VND' ? 22000 : Math.round(amount * 0.04 * 100) / 100
    const discount = Math.round(amount * 0.06 * 100) / 100
    const grandTotal = Math.round((amount + shippingFee - discount) * 100) / 100
    const initialTimeline = [
      { title: '买家完成支付', time: paidAt, type: 'success' },
      { title: status === 'review' ? '等待商家审核' : '订单审核通过', time: status === 'review' ? '处理中' : paidAt.replace(/:(\d{2})$/, (_, minute) => `:${String((Number(minute) + 8) % 60).padStart(2, '0')}`), type: status === 'review' ? 'warning' : 'success' }
    ]
    if (['collection', 'transit', 'completed'].includes(status)) initialTimeline.push({ title: '仓库完成发货', time: paidAt.slice(0, 11) + '23:10:00', type: 'success' })
    if (['transit', 'completed'].includes(status)) initialTimeline.push({ title: '包裹运输中', time: paidAt.slice(0, 11) + '23:58:00', type: 'primary' })
    if (status === 'completed') initialTimeline.push({ title: '买家签收完成', time: '2026-08-13 14:20:00', type: 'success' })
    if (status === 'cancelled') initialTimeline.push({ title: '订单已取消并退款', time: paidAt.slice(0, 11) + '19:25:00', type: 'danger' })
    if (status === 'hold') initialTimeline.push({ title: '订单因信息异常被挂起', time: paidAt.slice(0, 11) + '20:02:00', type: 'danger' })
    return {
      id: 2000 + index,
      orderNo,
      platformOrderNo,
      shopId,
      shopName,
      siteCode,
      siteName,
      currency,
      buyerName,
      buyerAccount: '@' + buyerName.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      buyerPhone: `+${60 + index} 8${index} 55${String(1024 + index).slice(-4)}`,
      shippingAddress: addresses[siteCode],
      status,
      paidAt,
      createdAt: paidAt,
      productName,
      sku,
      quantity,
      unitPrice: amount / quantity,
      subtotal: amount,
      shippingFee,
      discount,
      amount: grandTotal,
      payStatus,
      payMethod: index % 3 === 0 ? 'TikTok Pay' : (index % 3 === 1 ? 'Credit Card' : 'Online Banking'),
      logisticsStatus,
      logisticsCompany: logistics[logisticsStatus].company,
      trackingNo: logistics[logisticsStatus].trackingNo ? logistics[logisticsStatus].trackingNo.slice(0, -2) + String(30 + index) : '',
      abnormal,
      abnormalReason: abnormal ? (index % 2 ? '即将超过平台发货时限' : '收货地址信息需人工确认') : '',
      note: abnormal ? '优先联系买家核实订单信息。' : '',
      timeline: initialTimeline
    }
  })
}
