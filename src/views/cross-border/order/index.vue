<template>
  <BasicLayout>
    <template #wrapper>
      <div class="order-page">
        <section class="order-heading">
          <div>
            <div class="eyebrow">ORDER COMMAND CENTER</div>
            <h1>订单中心</h1>
            <p>基于妙手包裹数据聚合 TikTok Shop 跨境订单</p>
          </div>
          <div class="heading-meta"><span><i />数据更新于 {{ lastRefresh || '-' }}</span><el-button :icon="Refresh" @click="refreshOrders">刷新数据</el-button></div>
        </section>

        <el-row :gutter="14" class="metric-row">
          <el-col :xs="12" :sm="8" :lg="5"><button class="metric-card" type="button" @click="switchStatus('all')"><span class="metric-icon blue"><el-icon><Document /></el-icon></span><span><small>全部订单</small><strong>{{ summary.total }}</strong><em>由包裹按订单号去重</em></span></button></el-col>
          <el-col :xs="12" :sm="8" :lg="5"><button class="metric-card" type="button" @click="switchStatus('wait_confirmed')"><span class="metric-icon purple"><el-icon><Stamp /></el-icon></span><span><small>待审核</small><strong>{{ summary.waitConfirmed }}</strong><em>等待订单确认</em></span></button></el-col>
          <el-col :xs="12" :sm="8" :lg="5"><button class="metric-card" type="button" @click="switchStatus('wait_seller_send')"><span class="metric-icon orange"><el-icon><Box /></el-icon></span><span><small>待发货</small><strong>{{ summary.waitSellerSend }}</strong><em>等待卖家发货</em></span></button></el-col>
          <el-col :xs="12" :sm="8" :lg="4"><button class="metric-card exception-card" type="button" @click="switchStatus('abnormal')"><span class="metric-icon red"><el-icon><Warning /></el-icon></span><span><small>异常订单</small><strong>{{ summary.abnormal }}</strong><em>任一包裹存在异常</em></span></button></el-col>
          <el-col :xs="24" :sm="16" :lg="5"><div class="metric-card sales-card"><span><small>今日订单 / 销售额</small><strong>{{ summary.today }} <b>笔</b></strong><em>¥ {{ formatMoney(summary.todaySalesCny) }} · 按同步汇率</em></span><span class="metric-icon green"><el-icon><Wallet /></el-icon></span></div></el-col>
        </el-row>

        <el-card class="order-card" shadow="never">
          <el-tabs v-model="activeStatus" class="status-tabs" @tab-change="handleStatusTab">
            <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value"><template #label><span>{{ tab.label }}<b v-if="tab.count">{{ tab.count }}</b></span></template></el-tab-pane>
          </el-tabs>

          <el-form ref="queryForm" :model="queryParams" :inline="true" class="order-filter">
            <el-form-item prop="keyword"><el-input v-model="queryParams.keyword" placeholder="订单号 / 包裹号 / 运单号 / SKU" clearable :prefix-icon="Search" @keyup.enter="handleQuery" /></el-form-item>
            <el-form-item prop="remoteShopId"><el-select v-model="queryParams.remoteShopId" placeholder="全部店铺" clearable filterable><el-option v-for="shop in shops" :key="shop.remoteShopId" :label="shop.platformShopName || shop.shopNick || shop.shopCode" :value="shop.remoteShopId" /></el-select></el-form-item>
            <el-form-item prop="siteCode"><el-select v-model="queryParams.siteCode" placeholder="全部站点" clearable><el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" /></el-select></el-form-item>
            <el-form-item prop="dateRange"><el-date-picker v-model="queryParams.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="订单开始日期" end-placeholder="订单结束日期" /></el-form-item>
            <el-form-item class="filter-buttons"><el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button><el-button :icon="RefreshLeft" @click="resetQuery">重置</el-button></el-form-item>
          </el-form>

          <div class="order-toolbar">
            <div><el-button :icon="Download" :disabled="!selectedOrders.length" @click="exportSelection">导出订单</el-button></div>
            <div class="toolbar-meta"><span>已选 {{ selectedOrders.length }} 项</span><el-tag type="success" effect="plain" round>实时聚合</el-tag></div>
          </div>

          <el-table v-loading="loading" :data="orders" row-key="id" class="order-table" @selection-change="handleSelectionChange">
            <template #empty><el-empty description="暂无符合条件的订单" :image-size="90" /></template>
            <el-table-column type="selection" width="46" align="center" reserve-selection />
            <el-table-column label="订单信息" min-width="220" fixed="left">
              <template #default="scope"><div class="order-id"><button type="button" @click="openDetail(scope.row)">{{ scope.row.platformOrderSn || '-' }}</button><span>妙手 ID {{ scope.row.remoteOrderId || '-' }}</span><small>{{ formatTime(scope.row.orderStartedAt) }}</small></div></template>
            </el-table-column>
            <el-table-column label="商品" min-width="260">
              <template #default="scope"><div class="product-cell"><div class="product-thumb"><el-image v-if="scope.row.firstItem && scope.row.firstItem.picUrl" :src="scope.row.firstItem.picUrl" fit="cover" /><el-icon v-else><Goods /></el-icon></div><div><strong>{{ firstItemTitle(scope.row) }}</strong><span>{{ firstItemSku(scope.row) }}</span><small>共 {{ scope.row.itemCount }} 个明细 · {{ scope.row.totalQuantity }} 件</small></div></div></template>
            </el-table-column>
            <el-table-column label="店铺 / 站点" min-width="170"><template #default="scope"><div class="shop-cell"><strong>{{ scope.row.shopName || scope.row.shopNick || '-' }}</strong><span><i>{{ scope.row.siteCode || '-' }}</i>{{ scope.row.siteName || scope.row.consigneeCountryName || '-' }}</span></div></template></el-table-column>
            <el-table-column label="包裹" width="112" align="center"><template #default="scope"><div class="package-count"><strong>{{ scope.row.packageCount }}</strong><span>个包裹</span><el-tag v-if="scope.row.packageCount > 1" type="warning" size="small" effect="plain">拆包</el-tag></div></template></el-table-column>
            <el-table-column label="订单金额" width="138" align="right"><template #default="scope"><div class="amount-cell"><strong>{{ moneyText(scope.row.orderAmount, scope.row.currency) }}</strong><span>{{ scope.row.paymentMethod || '支付方式未知' }}</span></div></template></el-table-column>
            <el-table-column label="订单状态" width="138" align="center"><template #default="scope"><el-tag :type="statusMeta(scope.row.appOrderStatus).type" effect="light" round>{{ scope.row.appOrderStatusText || statusMeta(scope.row.appOrderStatus).label }}</el-tag><div v-if="scope.row.abnormal" class="abnormal-mark"><el-icon><WarningFilled /></el-icon>包裹异常</div></template></el-table-column>
            <el-table-column label="收货地区" min-width="150"><template #default="scope"><div class="location-cell"><strong>{{ scope.row.consigneeCountryName || scope.row.consigneeCountry || '-' }}</strong><span>{{ locationText(scope.row) }}</span></div></template></el-table-column>
            <el-table-column label="操作" width="90" align="center" fixed="right"><template #default="scope"><el-button type="primary" link :icon="View" @click="openDetail(scope.row)">详情</el-button></template></el-table-column>
          </el-table>

          <div class="order-pagination"><span>共 {{ total }} 笔订单</span><el-pagination v-model:current-page="queryParams.pageIndex" v-model:page-size="queryParams.pageSize" background layout="sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50, 100]" :total="total" @current-change="getList" @size-change="handlePageSizeChange" /></div>
        </el-card>

        <el-drawer v-model="detailOpen" size="720px" :with-header="false" destroy-on-close>
          <div v-loading="detailLoading" class="order-detail">
            <template v-if="detailOrder">
              <div class="detail-head">
                <button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button>
                <div class="detail-head-top"><div><span>平台订单号</span><h2>{{ detailOrder.platformOrderSn || '-' }}</h2></div><el-tag :type="statusMeta(detailOrder.appOrderStatus).type" effect="dark" round>{{ detailOrder.appOrderStatusText || statusMeta(detailOrder.appOrderStatus).label }}</el-tag></div>
                <p>妙手订单 ID：{{ detailOrder.remoteOrderId || '-' }} · {{ detailOrder.packageCount }} 个包裹</p>
                <div v-if="detailOrder.abnormal" class="detail-warning"><el-icon><WarningFilled /></el-icon><span>{{ detailOrder.abnormalReason || '订单下存在异常包裹' }}</span></div>
              </div>
              <div class="detail-body">
                <section class="detail-section"><h3><el-icon><Clock /></el-icon>订单信息</h3><div class="detail-grid"><div><span>店铺</span><strong>{{ detailOrder.shopName || detailOrder.shopNick || '-' }}</strong></div><div><span>站点</span><strong>{{ detailOrder.siteName || detailOrder.siteCode || '-' }}</strong></div><div><span>订单创建</span><strong>{{ formatTime(detailOrder.orderStartedAt) }}</strong></div><div><span>支付时间</span><strong>{{ formatTime(detailOrder.paidAt) }}</strong></div><div><span>最迟发货</span><strong>{{ formatTime(detailOrder.lastDeliveryAt) }}</strong></div><div><span>最后修改</span><strong>{{ formatTime(detailOrder.orderModifiedAt) }}</strong></div><div class="full"><span>收货地区</span><strong>{{ [detailOrder.consigneeCountryName || detailOrder.consigneeCountry, detailOrder.consigneeState, detailOrder.consigneeCity].filter(Boolean).join(' / ') || '-' }}</strong></div></div></section>

                <section class="detail-section"><h3><el-icon><Goods /></el-icon>订单商品</h3><div v-if="detailItems.length" class="detail-products"><div v-for="item in detailItems" :key="`${item.packageId}-${item.id}`" class="detail-product"><div class="detail-product-image"><el-image v-if="item.picUrl" :src="item.picUrl" fit="cover" /><span v-else><el-icon><Goods /></el-icon></span></div><div><strong>{{ item.title || '-' }}</strong><span>{{ item.platformOuterSkuId || item.platformSkuId || '-' }}</span><small>{{ item.packageNo }} · {{ item.skuSubName || '默认规格' }}</small></div><b>× {{ item.quantity }}</b></div></div><el-empty v-else description="暂无商品明细" :image-size="70" /></section>

                <section class="detail-section"><h3><el-icon><Wallet /></el-icon>费用明细</h3><div class="fee-list"><div><span>商品金额</span><strong>{{ moneyText(detailOrder.productAmount, detailOrder.currency) }}</strong></div><div><span>预估运费</span><strong>{{ moneyText(detailOrder.estimatedShippingFee, detailOrder.currency) }}</strong></div><div><span>优惠金额</span><strong>{{ moneyText(detailOrder.discountAmount, detailOrder.currency) }}</strong></div><div><span>平台佣金</span><strong>{{ moneyText(detailOrder.commissionFee, detailOrder.currency) }}</strong></div><div class="total"><span>订单金额</span><strong>{{ moneyText(detailOrder.orderAmount, detailOrder.currency) }}</strong></div></div></section>

                <section class="detail-section"><h3><el-icon><Box /></el-icon>包裹与物流</h3><div class="package-list"><article v-for="packageItem in detailOrder.packages" :key="packageItem.id" class="package-row"><div><strong>{{ packageItem.appPackageNo || packageItem.remotePackageId }}</strong><span>{{ packageItem.appPackageStatusText || packageItem.appPackageStatus || '-' }}</span></div><div><span>{{ packageItem.logisticsCompany || packageItem.lastMileCompany || '物流公司待定' }}</span><strong>{{ packageItem.logisticsNo || packageItem.lastMileLogisticsNo || '暂无运单号' }}</strong></div><el-tag :type="packageStatusMeta(packageItem).type" size="small" effect="plain">{{ packageStatusMeta(packageItem).label }}</el-tag></article></div></section>

                <section class="detail-section"><h3><el-icon><EditPen /></el-icon>订单备注</h3><div class="note-box"><p><span>妙手备注</span>{{ detailOrder.appNote || '暂无' }}</p><p><span>买家留言</span>{{ detailOrder.buyerMessage || '暂无' }}</p><p><span>商家备注</span>{{ detailOrder.sellerNote || '暂无' }}</p></div></section>
              </div>
            </template>
          </div>
        </el-drawer>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { Box, Close, Clock, Document, Download, EditPen, Goods, Refresh, RefreshLeft, Search, Stamp, View, Wallet, Warning, WarningFilled } from '@element-plus/icons-vue'
import { getCrossBorderOrder, getCrossBorderOrderSummary, listCrossBorderOrders } from '@/api/cross-border/order'
import { listCrossBorderShops } from '@/api/cross-border/shop'

const orderStatusOptions = [
  { value: 'wait_confirmed', label: '待审核', type: 'warning' },
  { value: 'wait_seller_send', label: '待发货', type: 'warning' },
  { value: 'wait_receiver_confirm', label: '已发货', type: 'primary' },
  { value: 'finished', label: '已完成', type: 'success' },
  { value: 'cancelled', label: '已取消', type: 'info' },
  { value: 'returned', label: '已退款', type: 'danger' },
  { value: 'refunding', label: '售后中', type: 'danger' }
]

export default {
  name: 'OrderCenter',
  setup() { return { Box, Close, Clock, Document, Download, EditPen, Goods, Refresh, RefreshLeft, Search, Stamp, View, Wallet, Warning, WarningFilled } },
  data() {
    return {
      orders: [],
      total: 0,
      loading: false,
      detailLoading: false,
      activeStatus: 'all',
      selectedOrders: [],
      lastRefresh: '',
      detailOpen: false,
      detailOrder: null,
      shops: [],
      summary: { total: 0, today: 0, waitConfirmed: 0, waitSellerSend: 0, waitReceiverConfirm: 0, finished: 0, cancelled: 0, abnormal: 0, invalidPackageCount: 0, todaySalesCny: 0 },
      queryParams: { keyword: '', remoteShopId: undefined, siteCode: '', dateRange: [], pageIndex: 1, pageSize: 10 }
    }
  },
  computed: {
    statusTabs() {
      return [
        { value: 'all', label: '全部订单', count: this.summary.total },
        { value: 'wait_confirmed', label: '待审核', count: this.summary.waitConfirmed },
        { value: 'wait_seller_send', label: '待发货', count: this.summary.waitSellerSend },
        { value: 'wait_receiver_confirm', label: '已发货', count: this.summary.waitReceiverConfirm },
        { value: 'finished', label: '已完成', count: this.summary.finished },
        { value: 'cancelled', label: '已取消', count: this.summary.cancelled },
        { value: 'abnormal', label: '异常', count: this.summary.abnormal }
      ]
    },
    siteOptions() {
      const sites = new Map()
      this.shops.forEach(shop => { if (shop.siteCode) sites.set(shop.siteCode, shop.siteName || shop.siteCode) })
      return [...sites.entries()].map(([value, label]) => ({ value, label: `${label}（${value}）` }))
    },
    detailItems() {
      if (!this.detailOrder || !this.detailOrder.packages) return []
      return this.detailOrder.packages.flatMap(packageItem => (packageItem.items || []).map(item => ({ ...item, packageNo: packageItem.appPackageNo || packageItem.remotePackageId })))
    }
  },
  created() {
    this.getList()
    this.getSummary()
    this.loadShops()
  },
  methods: {
    nowText() {
      const now = new Date(); const pad = value => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    },
    formatTime(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19)
      const pad = item => String(item).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    formatMoney(value) {
      if (value === null || value === undefined || value === '') return '0.00'
      return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    moneyText(value, currency) { return value === null || value === undefined || value === '' ? '-' : `${currency || ''} ${this.formatMoney(value)}`.trim() },
    statusMeta(status) { return orderStatusOptions.find(item => item.value === status) || { label: status || '未知', type: 'info' } },
    packageStatusMeta(packageItem) {
      if (packageItem.applyTrackingNoFailCode) return { label: '运单申请失败', type: 'danger' }
      const metadata = this.statusMeta(packageItem.appPackageStatus)
      return { ...metadata, label: packageItem.appPackageStatusText || metadata.label }
    },
    firstItemTitle(order) { return order.firstItem?.title || '暂无商品明细' },
    firstItemSku(order) { return order.firstItem?.platformOuterSkuId || order.firstItem?.platformSkuId || '-' },
    locationText(order) { return [order.consigneeState, order.consigneeCity].filter(Boolean).join(' / ') || '-' },
    getList() {
      this.loading = true
      const range = this.queryParams.dateRange || []
      const params = {
        keyword: this.queryParams.keyword,
        remoteShopId: this.queryParams.remoteShopId,
        siteCode: this.queryParams.siteCode,
        appOrderStatus: this.activeStatus === 'all' ? undefined : this.activeStatus,
        orderStartedFrom: range[0],
        orderStartedTo: range[1],
        pageIndex: this.queryParams.pageIndex,
        pageSize: this.queryParams.pageSize
      }
      return listCrossBorderOrders(params).then(response => {
        this.orders = response.data.list || []
        this.total = response.data.count || 0
        this.lastRefresh = this.nowText()
      }).finally(() => { this.loading = false })
    },
    getSummary() { return getCrossBorderOrderSummary().then(response => { this.summary = { ...this.summary, ...(response.data || {}) } }) },
    refreshOrders() { return Promise.all([this.getList(), this.getSummary()]).then(() => this.msgSuccess('订单数据已刷新')) },
    loadShops() { return listCrossBorderShops({ pageIndex: 1, pageSize: 100, localStatus: 1 }).then(response => { this.shops = response.data.list || [] }) },
    handleStatusTab() { this.queryParams.pageIndex = 1; this.getList() },
    switchStatus(status) { this.activeStatus = status; this.handleStatusTab() },
    handleQuery() { this.queryParams.pageIndex = 1; this.getList() },
    resetQuery() {
      const pageSize = this.queryParams.pageSize
      this.queryParams = { keyword: '', remoteShopId: undefined, siteCode: '', dateRange: [], pageIndex: 1, pageSize }
      this.activeStatus = 'all'
      this.getList()
    },
    handlePageSizeChange() { this.queryParams.pageIndex = 1; this.getList() },
    handleSelectionChange(selection) { this.selectedOrders = selection },
    openDetail(order) {
      this.detailOpen = true
      this.detailLoading = true
      this.detailOrder = order
      const params = { miaoshouConfigId: order.miaoshouConfigId, platform: order.platform, remoteOrderId: order.remoteOrderId || undefined, remoteShopId: order.remoteShopId, platformOrderSn: order.platformOrderSn }
      getCrossBorderOrder(params).then(response => { this.detailOrder = response.data || order }).finally(() => { this.detailLoading = false })
    },
    exportSelection() {
      if (!this.selectedOrders.length) return
      const headers = ['平台订单号', '妙手订单ID', '店铺', '站点', '包裹数', '商品明细数', '商品数量', '币种', '订单金额', '订单状态', '订单创建时间']
      const rows = this.selectedOrders.map(order => [order.platformOrderSn, order.remoteOrderId, order.shopName || order.shopNick, order.siteCode, order.packageCount, order.itemCount, order.totalQuantity, order.currency, order.orderAmount, order.appOrderStatusText || order.appOrderStatus, this.formatTime(order.orderStartedAt)])
      const escapeCell = value => {
        let text = String(value ?? '')
        if (/^[=+\-@]/.test(text)) text = `'${text}`
        return `"${text.replace(/"/g, '""')}"`
      }
      const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `订单中心_${this.nowText().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url)
      this.msgSuccess(`已导出 ${this.selectedOrders.length} 笔订单`)
    }
  }
}
</script>

<style lang="scss" scoped>
.order-page { min-height: calc(100vh - 110px); }
.order-heading { min-height: 106px; margin-bottom: 14px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: linear-gradient(118deg, #101827 0%, #172a46 58%, #134e5e 130%); border-radius: 14px; box-shadow: 0 8px 28px rgba(18, 38, 64, .18); }
.order-heading h1 { margin: 3px 0 5px; font-size: 24px; }.order-heading p { margin: 0; color: rgba(255, 255, 255, .67); font-size: 13px; }.eyebrow { color: #6ee7d2; font-size: 10px; font-weight: 700; letter-spacing: 2px; }.heading-meta { display: flex; align-items: center; gap: 12px; }.heading-meta > span { color: rgba(255, 255, 255, .58); font-size: 11px; }.heading-meta i { width: 7px; height: 7px; margin-right: 6px; display: inline-block; background: #34d399; border-radius: 50%; }
.metric-row { margin-bottom: 14px; }.metric-card { width: 100%; min-height: 106px; padding: 18px; display: flex; align-items: center; gap: 14px; color: inherit; text-align: left; background: #fff; border: 1px solid #edf0f5; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); }.metric-row button.metric-card { cursor: pointer; transition: transform .18s, box-shadow .18s; }.metric-row button.metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(23, 34, 66, .09); }.metric-card > span:not(.metric-icon) { min-width: 0; display: flex; flex-direction: column; }.metric-card small { color: #667085; font-size: 12px; }.metric-card strong { margin: 2px 0; color: #172033; font-size: 27px; }.metric-card strong b { font-size: 12px; }.metric-card em { color: #98a2b3; font-size: 10px; font-style: normal; }.metric-icon { flex: 0 0 auto; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; font-size: 21px; }.metric-icon.blue { color: #2563eb; background: #eaf1ff; }.metric-icon.purple { color: #7c3aed; background: #f1eafe; }.metric-icon.orange { color: #ea580c; background: #fff1e7; }.metric-icon.red { color: #dc2626; background: #feecec; }.metric-icon.green { color: #059669; background: #e7f8f1; }.exception-card { border-color: #fee2e2; }.sales-card { justify-content: space-between; background: linear-gradient(135deg, #f6fffd, #fff); }
.order-card { border: 0; border-radius: 13px; }.status-tabs :deep(.el-tabs__header) { margin-bottom: 13px; }.status-tabs :deep(.el-tabs__item) b { min-width: 20px; margin-left: 6px; padding: 1px 6px; color: #64748b; background: #eef2f6; border-radius: 9px; font-size: 10px; }.status-tabs :deep(.is-active) b { color: #2563eb; background: #eaf1ff; }
.order-filter { padding: 14px 14px 0; display: flex; flex-wrap: wrap; background: #f8fafc; border: 1px solid #edf1f5; border-radius: 10px; }.order-filter :deep(.el-input) { width: 225px; }.order-filter :deep(.el-select) { width: 170px; }.order-filter :deep(.el-date-editor) { width: 250px; }.order-toolbar { min-height: 58px; display: flex; align-items: center; justify-content: space-between; }.toolbar-meta { display: flex; align-items: center; gap: 10px; color: #98a2b3; font-size: 12px; }
.order-table :deep(th.el-table__cell) { height: 46px; color: #667085; background: #f7f8fb; }.order-table :deep(td.el-table__cell) { padding: 11px 0; }.order-id, .product-cell > div:last-child, .shop-cell, .amount-cell, .location-cell, .package-count { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.order-id button { max-width: 210px; padding: 0; overflow: hidden; color: #2563eb; background: none; border: 0; font-weight: 700; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }.order-id span, .order-id small, .product-cell span, .product-cell small, .shop-cell span, .amount-cell span, .location-cell span, .package-count span { color: #98a2b3; font-size: 10px; }.product-cell { display: flex; align-items: center; gap: 10px; }.product-thumb { flex: 0 0 auto; width: 42px; height: 42px; display: grid; place-items: center; overflow: hidden; color: #64748b; background: #eef2f6; border-radius: 8px; }.product-thumb :deep(.el-image) { width: 100%; height: 100%; }.product-cell strong { max-width: 190px; overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.shop-cell strong, .amount-cell strong, .location-cell strong { color: #344054; font-size: 12px; }.shop-cell i { margin-right: 6px; padding: 2px 4px; color: #2563eb; background: #eef4ff; border-radius: 4px; font-style: normal; }.amount-cell { text-align: right; }.package-count { align-items: center; }.package-count strong { color: #172033; font-size: 20px; }.abnormal-mark { margin-top: 5px; color: #dc2626; font-size: 10px; }.abnormal-mark .el-icon { margin-right: 3px; vertical-align: -1px; }.order-pagination { padding-top: 17px; display: flex; justify-content: space-between; align-items: center; color: #98a2b3; font-size: 12px; }
.order-detail { min-height: 100%; }.detail-head { min-height: 178px; padding: 36px 30px 24px; color: #fff; background: linear-gradient(130deg, #172033, #253762); position: relative; }.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: #fff; background: rgba(255, 255, 255, .08); border: 0; border-radius: 50%; cursor: pointer; }.detail-head-top { display: flex; align-items: center; justify-content: space-between; gap: 20px; }.detail-head-top span { color: #9cb9ec; font-size: 11px; }.detail-head h2 { margin: 5px 0 8px; font-size: 22px; }.detail-head > p { margin: 0 0 14px; color: #b8c7e0; font-size: 12px; }.detail-warning { padding: 8px 10px; display: flex; align-items: center; gap: 7px; color: #fecaca; background: rgba(220, 38, 38, .17); border-radius: 7px; font-size: 11px; }.detail-body { padding: 25px 30px 50px; }.detail-section { margin-bottom: 28px; }.detail-section h3 { margin: 0 0 15px; display: flex; align-items: center; gap: 7px; color: #1d2939; font-size: 14px; }.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; }.detail-grid > div { display: flex; flex-direction: column; gap: 5px; }.detail-grid .full { grid-column: 1 / -1; }.detail-grid span { color: #98a2b3; font-size: 11px; }.detail-grid strong { color: #475467; font-size: 12px; font-weight: 500; word-break: break-all; }
.detail-products { display: flex; flex-direction: column; gap: 10px; }.detail-product { padding: 11px; display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 12px; background: #f8fafc; border-radius: 10px; }.detail-product-image { width: 52px; height: 52px; display: grid; place-items: center; overflow: hidden; color: #64748b; background: #eef2f6; border-radius: 8px; }.detail-product-image :deep(.el-image) { width: 100%; height: 100%; }.detail-product > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.detail-product strong { overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.detail-product span, .detail-product small { color: #98a2b3; font-size: 10px; }.detail-product b { color: #475467; }.fee-list { padding: 4px 15px; background: #f8fafc; border-radius: 10px; }.fee-list > div { padding: 10px 0; display: flex; justify-content: space-between; color: #667085; font-size: 12px; border-bottom: 1px dashed #e4e7ec; }.fee-list > div:last-child { border: 0; }.fee-list .total { color: #172033; font-size: 14px; font-weight: 700; }
.package-list { display: flex; flex-direction: column; gap: 9px; }.package-row { padding: 12px 14px; display: grid; grid-template-columns: 1fr 1.25fr auto; align-items: center; gap: 14px; background: #f8fafc; border: 1px solid #edf0f5; border-radius: 10px; }.package-row > div { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.package-row strong { overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.package-row span { color: #98a2b3; font-size: 10px; }.note-box { padding: 12px 14px; color: #667085; background: #fffaf0; border: 1px solid #fef0c7; border-radius: 9px; font-size: 12px; }.note-box p { margin: 0; padding: 7px 0; }.note-box p + p { border-top: 1px dashed #fde5a8; }.note-box span { width: 72px; display: inline-block; color: #98a2b3; }
@media (max-width: 1200px) { .heading-meta > span { display: none; }.order-filter :deep(.el-date-editor) { width: 220px; } }
@media (max-width: 768px) { .order-heading { align-items: flex-start; gap: 15px; }.order-heading p, .eyebrow { display: none; }.metric-card { min-height: 92px; padding: 13px; }.metric-icon { width: 38px; height: 38px; }.order-filter { display: grid; grid-template-columns: 1fr 1fr; }.order-filter :deep(.el-form-item), .order-filter :deep(.el-input), .order-filter :deep(.el-select), .order-filter :deep(.el-date-editor) { width: 100%; margin-right: 0; }.filter-buttons { grid-column: 1 / -1; }.detail-grid { grid-template-columns: 1fr; }.detail-grid .full { grid-column: auto; }.package-row { grid-template-columns: 1fr; }:deep(.el-drawer) { width: 100% !important; } }
</style>
