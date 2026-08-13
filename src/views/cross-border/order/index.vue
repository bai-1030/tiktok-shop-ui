<template>
  <BasicLayout>
    <template #wrapper>
      <div class="order-page">
        <section class="order-heading">
          <div>
            <div class="eyebrow">ORDER COMMAND CENTER</div>
            <h1>订单中心</h1>
            <p>统一查看和处理 TikTok Shop 跨境订单</p>
          </div>
          <div class="heading-meta"><span><i />数据更新于 {{ lastRefresh }}</span><el-button :icon="Refresh" @click="refreshOrders">刷新数据</el-button></div>
        </section>

        <el-row :gutter="14" class="metric-row">
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card"><div class="metric-icon blue"><el-icon><Document /></el-icon></div><div><span>今日订单</span><strong>{{ summary.today }}</strong><small>较昨日 <em>+12.6%</em></small></div></div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card"><div class="metric-icon purple"><el-icon><Stamp /></el-icon></div><div><span>待处理</span><strong>{{ summary.pending }}</strong><small>需及时审核</small></div></div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card"><div class="metric-icon orange"><el-icon><Box /></el-icon></div><div><span>待发货</span><strong>{{ summary.toShip }}</strong><small>{{ summary.urgent }} 单即将超时</small></div></div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="4">
            <div class="metric-card"><div class="metric-icon red"><el-icon><Warning /></el-icon></div><div><span>异常订单</span><strong>{{ summary.abnormal }}</strong><small>建议优先处理</small></div></div>
          </el-col>
          <el-col :xs="24" :sm="16" :lg="5">
            <div class="metric-card sales-card"><div><span>今日销售额</span><strong>¥ {{ formatMoney(summary.salesCny) }}</strong><small>按模拟汇率折算 <em>+8.4%</em></small></div><div class="sparkline"><i v-for="height in [35, 52, 43, 66, 58, 78, 91]" :key="height" :style="{ height: `${height}%` }" /></div></div>
          </el-col>
        </el-row>

        <el-card class="order-card" shadow="never">
          <el-tabs v-model="activeStatus" class="status-tabs" @tab-change="handleStatusTab">
            <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value">
              <template #label><span>{{ tab.label }}<b v-if="tab.count">{{ tab.count }}</b></span></template>
            </el-tab-pane>
          </el-tabs>

          <el-form ref="queryForm" :model="queryParams" :inline="true" class="order-filter">
            <el-form-item prop="keyword">
              <el-input v-model="queryParams.keyword" placeholder="订单号 / 商品名称 / 买家" clearable :prefix-icon="Search" @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item prop="shopId">
              <el-select v-model="queryParams.shopId" placeholder="全部店铺" clearable filterable>
                <el-option v-for="shop in shopOptions" :key="shop.value" :label="shop.label" :value="shop.value" />
              </el-select>
            </el-form-item>
            <el-form-item prop="siteCode">
              <el-select v-model="queryParams.siteCode" placeholder="全部站点" clearable>
                <el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" />
              </el-select>
            </el-form-item>
            <el-form-item prop="dateRange">
              <el-date-picker v-model="queryParams.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="支付开始日期" end-placeholder="支付结束日期" />
            </el-form-item>
            <el-form-item class="filter-buttons"><el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button><el-button :icon="RefreshLeft" @click="resetQuery">重置</el-button></el-form-item>
          </el-form>

          <div class="order-toolbar">
            <div>
              <el-button :icon="CircleCheck" :disabled="!selectedIds.length" @click="handleBatchApprove">批量审核</el-button>
              <el-button :icon="Box" :disabled="!selectedIds.length" @click="handleBatchShipment">标记待发货</el-button>
              <el-button :icon="Download" :disabled="!selectedIds.length" @click="exportSelection">导出订单</el-button>
            </div>
            <div class="toolbar-meta"><span>已选 {{ selectedIds.length }} 项</span><el-tooltip content="页面数据为前端模拟数据" placement="top"><el-tag type="info" effect="plain" round>DEMO</el-tag></el-tooltip></div>
          </div>

          <el-table v-loading="loading" :data="pagedOrders" row-key="id" class="order-table" @selection-change="handleSelectionChange">
            <template #empty><el-empty description="暂无符合条件的订单" :image-size="90" /></template>
            <el-table-column type="selection" width="46" align="center" reserve-selection />
            <el-table-column label="订单信息" min-width="204" fixed="left">
              <template #default="scope">
                <div class="order-id"><button type="button" @click="openDetail(scope.row)">{{ scope.row.platformOrderNo }}</button><span>TikTok {{ scope.row.orderNo }}</span><small>{{ scope.row.paidAt }}</small></div>
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="250">
              <template #default="scope">
                <div class="product-cell"><div class="product-thumb" :class="`tone-${scope.row.id % 5}`"><el-icon><Goods /></el-icon></div><div><strong>{{ scope.row.productName }}</strong><span>{{ scope.row.sku }}</span><small>x{{ scope.row.quantity }}</small></div></div>
              </template>
            </el-table-column>
            <el-table-column label="店铺 / 站点" min-width="166">
              <template #default="scope"><div class="shop-cell"><strong>{{ scope.row.shopName }}</strong><span><i>{{ scope.row.siteCode }}</i>{{ scope.row.siteName }}</span></div></template>
            </el-table-column>
            <el-table-column label="买家" min-width="138">
              <template #default="scope"><div class="buyer-cell"><strong>{{ scope.row.buyerName }}</strong><span>{{ scope.row.buyerAccount }}</span></div></template>
            </el-table-column>
            <el-table-column label="订单金额" width="132" align="right">
              <template #default="scope"><div class="amount-cell"><strong>{{ scope.row.currency }} {{ formatMoney(scope.row.amount) }}</strong><span>{{ scope.row.payMethod }}</span></div></template>
            </el-table-column>
            <el-table-column label="订单状态" width="126" align="center">
              <template #default="scope"><el-tag :type="statusMeta(scope.row.status).type" effect="light" round>{{ statusMeta(scope.row.status).label }}</el-tag><div v-if="scope.row.abnormal" class="abnormal-mark"><el-icon><WarningFilled /></el-icon>异常提醒</div></template>
            </el-table-column>
            <el-table-column label="物流状态" width="114" align="center">
              <template #default="scope"><span class="logistics-pill" :class="scope.row.logisticsStatus">{{ logisticsLabel(scope.row.logisticsStatus) }}</span></template>
            </el-table-column>
            <el-table-column label="操作" width="230" align="center" fixed="right">
              <template #default="scope">
                <el-button type="primary" link :icon="View" @click="openDetail(scope.row)">详情</el-button>
                <el-button v-if="scope.row.status === 'review' || scope.row.status === 'hold'" type="success" link :icon="CircleCheck" @click="openProcess('review', scope.row)">审核</el-button>
                <el-button v-else-if="scope.row.status === 'shipment'" type="warning" link :icon="Van" @click="openProcess('ship', scope.row)">发货</el-button>
                <el-button v-else type="primary" link :icon="EditPen" @click="openProcess('note', scope.row)">备注</el-button>
                <el-dropdown trigger="click" @command="command => handleOrderCommand(command, scope.row)"><el-button link class="more-button">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="note" :icon="EditPen">添加备注</el-dropdown-item><el-dropdown-item v-if="!['completed', 'cancelled'].includes(scope.row.status)" command="cancel" :icon="CircleClose" divided>取消订单</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <div class="order-pagination"><span>共 {{ filteredOrders.length }} 笔订单</span><el-pagination v-model:current-page="queryParams.pageIndex" v-model:page-size="queryParams.pageSize" background layout="sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50]" :total="filteredOrders.length" /></div>
        </el-card>

        <el-drawer v-model="detailOpen" size="620px" :with-header="false" destroy-on-close>
          <template v-if="detailOrder">
            <div class="detail-head">
              <button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button>
              <div class="detail-head-top"><div><span>平台订单号</span><h2>{{ detailOrder.platformOrderNo }}</h2></div><el-tag :type="statusMeta(detailOrder.status).type" effect="dark" round>{{ statusMeta(detailOrder.status).label }}</el-tag></div>
              <p>TikTok Order ID: {{ detailOrder.orderNo }}</p>
              <div v-if="detailOrder.abnormal" class="detail-warning"><el-icon><WarningFilled /></el-icon><span>{{ detailOrder.abnormalReason }}</span></div>
            </div>
            <div class="detail-body">
              <section class="detail-section"><h3><el-icon><Goods /></el-icon>商品信息</h3><div class="detail-product"><div class="product-thumb large" :class="`tone-${detailOrder.id % 5}`"><el-icon><Goods /></el-icon></div><div><strong>{{ detailOrder.productName }}</strong><span>{{ detailOrder.sku }}</span><small>{{ detailOrder.currency }} {{ formatMoney(detailOrder.unitPrice) }} × {{ detailOrder.quantity }}</small></div><b>{{ detailOrder.currency }} {{ formatMoney(detailOrder.subtotal) }}</b></div></section>
              <section class="detail-section"><h3><el-icon><User /></el-icon>买家与收货信息</h3><div class="detail-grid"><div><span>买家姓名</span><strong>{{ detailOrder.buyerName }}</strong></div><div><span>联系电话</span><strong>{{ detailOrder.buyerPhone }}</strong></div><div class="full"><span>收货地址</span><strong>{{ detailOrder.shippingAddress }}</strong></div></div></section>
              <section class="detail-section"><h3><el-icon><Wallet /></el-icon>费用明细</h3><div class="fee-list"><div><span>商品小计</span><strong>{{ detailOrder.currency }} {{ formatMoney(detailOrder.subtotal) }}</strong></div><div><span>运费</span><strong>+ {{ detailOrder.currency }} {{ formatMoney(detailOrder.shippingFee) }}</strong></div><div><span>平台优惠</span><strong class="discount">- {{ detailOrder.currency }} {{ formatMoney(detailOrder.discount) }}</strong></div><div class="total"><span>实付金额</span><strong>{{ detailOrder.currency }} {{ formatMoney(detailOrder.amount) }}</strong></div></div></section>
              <section class="detail-section"><h3><el-icon><Van /></el-icon>物流信息</h3><div class="detail-grid"><div><span>物流公司</span><strong>{{ detailOrder.logisticsCompany || '暂未选择' }}</strong></div><div><span>运单号</span><strong>{{ detailOrder.trackingNo || '暂未生成' }}</strong></div></div></section>
              <section class="detail-section"><h3><el-icon><Clock /></el-icon>订单进度</h3><el-timeline class="order-timeline"><el-timeline-item v-for="(item, index) in detailOrder.timeline" :key="index" :timestamp="item.time" :type="item.type" placement="top"><strong>{{ item.title }}</strong></el-timeline-item></el-timeline></section>
              <section class="detail-section"><h3><el-icon><EditPen /></el-icon>商家备注</h3><div class="note-box">{{ detailOrder.note || '暂无商家备注' }}</div></section>
            </div>
            <div class="detail-footer"><el-button @click="openProcess('note', detailOrder)">添加备注</el-button><el-button v-if="detailOrder.status === 'shipment'" type="primary" :icon="Van" @click="openProcess('ship', detailOrder)">安排发货</el-button><el-button v-else-if="['review', 'hold'].includes(detailOrder.status)" type="primary" :icon="CircleCheck" @click="openProcess('review', detailOrder)">处理订单</el-button></div>
          </template>
        </el-drawer>

        <el-dialog v-model="processOpen" :title="processTitle" width="560px" :close-on-click-modal="false">
          <el-alert title="本次操作仅更新当前页面模拟数据" type="info" :closable="false" show-icon class="demo-alert" />
          <el-form ref="processForm" :model="processForm" :rules="processRules" label-position="top">
            <template v-if="processMode === 'review'">
              <el-form-item label="处理结果" prop="reviewResult"><el-radio-group v-model="processForm.reviewResult"><el-radio-button value="approve">审核通过</el-radio-button><el-radio-button value="hold">挂起订单</el-radio-button></el-radio-group></el-form-item>
              <el-form-item label="处理说明" prop="note"><el-input v-model="processForm.note" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="填写审核说明或挂起原因" /></el-form-item>
            </template>
            <template v-else-if="processMode === 'ship'">
              <el-form-item label="物流公司" prop="logisticsCompany"><el-select v-model="processForm.logisticsCompany" placeholder="请选择物流公司" style="width: 100%"><el-option label="TikTok Logistics" value="TikTok Logistics" /><el-option label="J&T Express" value="J&T Express" /><el-option label="DHL eCommerce" value="DHL eCommerce" /><el-option label="Ninja Van" value="Ninja Van" /></el-select></el-form-item>
              <el-form-item label="运单号" prop="trackingNo"><el-input v-model="processForm.trackingNo" placeholder="请输入物流运单号" maxlength="40" /></el-form-item>
              <el-form-item label="发货备注"><el-input v-model="processForm.note" type="textarea" :rows="3" maxlength="200" show-word-limit /></el-form-item>
            </template>
            <template v-else><el-form-item label="商家内部备注" prop="note"><el-input v-model="processForm.note" type="textarea" :rows="5" maxlength="200" show-word-limit placeholder="备注仅供内部运营人员查看" /></el-form-item></template>
          </el-form>
          <template #footer><el-button @click="processOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitProcess">确认提交</el-button></template>
        </el-dialog>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { ElMessageBox } from 'element-plus'
import {
  ArrowDown, Box, CircleCheck, CircleClose, Close, Clock, Document, Download, EditPen,
  Goods, Refresh, RefreshLeft, Search, Stamp, User, Van, View, Wallet, Warning, WarningFilled
} from '@element-plus/icons-vue'
import { createMockOrders, orderStatusOptions, shopOptions, siteOptions } from './mock-data'

export default {
  name: 'OrderCenter',
  setup() {
    return { ArrowDown, Box, CircleCheck, CircleClose, Close, Clock, Document, Download, EditPen, Goods, Refresh, RefreshLeft, Search, Stamp, User, Van, View, Wallet, Warning, WarningFilled }
  },
  data() {
    return {
      orders: createMockOrders(),
      orderStatusOptions,
      shopOptions,
      siteOptions,
      loading: false,
      saving: false,
      activeStatus: 'all',
      selectedIds: [],
      lastRefresh: '2026-08-13 23:40:00',
      detailOpen: false,
      detailOrder: null,
      processOpen: false,
      processMode: 'review',
      processingOrder: null,
      processForm: { reviewResult: 'approve', logisticsCompany: '', trackingNo: '', note: '' },
      queryParams: { keyword: '', shopId: '', siteCode: '', dateRange: [], pageIndex: 1, pageSize: 10 },
      processRules: {
        reviewResult: [{ required: true, message: '请选择处理结果', trigger: 'change' }],
        logisticsCompany: [{ required: true, message: '请选择物流公司', trigger: 'change' }],
        trackingNo: [{ required: true, message: '请输入运单号', trigger: 'blur' }],
        note: [{ required: false, message: '请填写处理说明', trigger: 'blur' }]
      }
    }
  },
  computed: {
    summary() {
      const todayOrders = this.orders.filter(order => order.paidAt.startsWith('2026-08-13'))
      const exchange = { MYR: 1.55, PHP: 0.125, THB: 0.2, VND: 0.00029, SGD: 5.55, GBP: 9.35, USD: 7.2 }
      return {
        today: todayOrders.length,
        pending: this.orders.filter(order => ['review', 'hold'].includes(order.status)).length,
        toShip: this.orders.filter(order => ['shipment', 'collection'].includes(order.status)).length,
        urgent: this.orders.filter(order => order.abnormal && ['review', 'shipment', 'hold'].includes(order.status)).length,
        abnormal: this.orders.filter(order => order.abnormal).length,
        salesCny: todayOrders.filter(order => order.status !== 'cancelled').reduce((total, order) => total + order.amount * (exchange[order.currency] || 1), 0)
      }
    },
    statusTabs() {
      const tabs = [{ value: 'all', label: '全部订单' }, ...this.orderStatusOptions]
      return tabs.map(tab => ({ ...tab, count: tab.value === 'all' ? this.orders.length : this.orders.filter(order => order.status === tab.value).length }))
    },
    filteredOrders() {
      const keyword = this.queryParams.keyword.trim().toLowerCase()
      const range = this.queryParams.dateRange || []
      return this.orders.filter(order => {
        const matchKeyword = !keyword || [order.orderNo, order.platformOrderNo, order.productName, order.buyerName].some(value => value.toLowerCase().includes(keyword))
        const paidDate = order.paidAt.slice(0, 10)
        return matchKeyword &&
          (this.activeStatus === 'all' || order.status === this.activeStatus) &&
          (!this.queryParams.shopId || order.shopId === this.queryParams.shopId) &&
          (!this.queryParams.siteCode || order.siteCode === this.queryParams.siteCode) &&
          (!range.length || (paidDate >= range[0] && paidDate <= range[1]))
      })
    },
    pagedOrders() {
      const start = (this.queryParams.pageIndex - 1) * this.queryParams.pageSize
      return this.filteredOrders.slice(start, start + this.queryParams.pageSize)
    },
    processTitle() {
      return { review: '审核订单', ship: '订单发货', note: '添加商家备注' }[this.processMode]
    }
  },
  watch: {
    'queryParams.pageSize'() { this.queryParams.pageIndex = 1 },
    filteredOrders() {
      const maxPage = Math.max(1, Math.ceil(this.filteredOrders.length / this.queryParams.pageSize))
      if (this.queryParams.pageIndex > maxPage) this.queryParams.pageIndex = maxPage
    }
  },
  methods: {
    statusMeta(status) {
      return {
        review: { label: '待审核', type: 'primary' }, shipment: { label: '待发货', type: 'warning' },
        collection: { label: '待揽收', type: 'warning' }, transit: { label: '运输中', type: '' },
        completed: { label: '已完成', type: 'success' }, hold: { label: '已挂起', type: 'danger' }, cancelled: { label: '已取消', type: 'info' }
      }[status] || { label: '未知', type: 'info' }
    },
    logisticsLabel(status) { return { pending: '待处理', ready: '等待揽收', shipped: '运输中', delivered: '已签收', exception: '信息异常', cancelled: '已取消' }[status] || '待处理' },
    formatMoney(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    nowText() {
      const date = new Date(); const pad = value => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    refreshOrders() { this.loading = true; window.setTimeout(() => { this.loading = false; this.lastRefresh = this.nowText(); this.msgSuccess('订单数据已刷新（模拟）') }, 420) },
    handleStatusTab() { this.queryParams.pageIndex = 1 },
    handleQuery() { this.loading = true; this.queryParams.pageIndex = 1; window.setTimeout(() => { this.loading = false }, 260) },
    resetQuery() { this.queryParams = { keyword: '', shopId: '', siteCode: '', dateRange: [], pageIndex: 1, pageSize: this.queryParams.pageSize }; this.activeStatus = 'all'; this.handleQuery() },
    handleSelectionChange(selection) { this.selectedIds = selection.map(order => order.id) },
    openDetail(order) { this.detailOrder = order; this.detailOpen = true },
    openProcess(mode, order) {
      this.detailOpen = false; this.processMode = mode; this.processingOrder = order
      this.processForm = { reviewResult: order.status === 'hold' ? 'approve' : 'approve', logisticsCompany: order.logisticsCompany || '', trackingNo: order.trackingNo || '', note: order.note || '' }
      this.processOpen = true; this.$nextTick(() => this.$refs.processForm?.clearValidate())
    },
    submitProcess() {
      this.$refs.processForm.validate(valid => {
        if (!valid) return
        this.saving = true
        window.setTimeout(() => {
          const order = this.processingOrder; const now = this.nowText()
          if (this.processMode === 'review') {
            const approved = this.processForm.reviewResult === 'approve'
            order.status = approved ? 'shipment' : 'hold'; order.logisticsStatus = approved ? 'pending' : 'exception'; order.abnormal = !approved
            order.abnormalReason = approved ? '' : (this.processForm.note || '订单已由运营人员挂起')
            order.timeline.push({ title: approved ? '订单审核通过，等待发货' : '订单已挂起', time: now, type: approved ? 'success' : 'danger' })
          } else if (this.processMode === 'ship') {
            order.status = 'collection'; order.logisticsStatus = 'ready'; order.logisticsCompany = this.processForm.logisticsCompany; order.trackingNo = this.processForm.trackingNo; order.abnormal = false; order.abnormalReason = ''
            order.timeline.push({ title: `已发货 · ${order.logisticsCompany}`, time: now, type: 'success' })
          }
          order.note = this.processForm.note; this.saving = false; this.processOpen = false; this.msgSuccess(`${this.processTitle}成功（模拟）`)
        }, 420)
      })
    },
    handleBatchApprove() {
      const selected = this.orders.filter(order => this.selectedIds.includes(order.id) && ['review', 'hold'].includes(order.status))
      if (!selected.length) return this.msgInfo('选中的订单中没有待审核或挂起订单')
      ElMessageBox.confirm(`确认审核通过选中的 ${selected.length} 笔订单吗？`, '批量审核', { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'warning' }).then(() => {
        const now = this.nowText(); selected.forEach(order => { order.status = 'shipment'; order.logisticsStatus = 'pending'; order.abnormal = false; order.abnormalReason = ''; order.timeline.push({ title: '批量审核通过，等待发货', time: now, type: 'success' }) }); this.msgSuccess(`已审核通过 ${selected.length} 笔订单（模拟）`)
      }).catch(() => {})
    },
    handleBatchShipment() {
      const selected = this.orders.filter(order => this.selectedIds.includes(order.id) && order.status === 'review')
      if (!selected.length) return this.msgInfo('选中的订单中没有可标记为待发货的订单')
      selected.forEach(order => { order.status = 'shipment'; order.timeline.push({ title: '已标记为待发货', time: this.nowText(), type: 'warning' }) }); this.msgSuccess(`已标记 ${selected.length} 笔订单为待发货（模拟）`)
    },
    exportSelection() {
      const selected = this.orders.filter(order => this.selectedIds.includes(order.id))
      const headers = ['平台订单号', 'TikTok订单号', '店铺', '站点', '商品', '数量', '币种', '金额', '状态', '支付时间']
      const rows = selected.map(order => [order.platformOrderNo, order.orderNo, order.shopName, order.siteName, order.productName, order.quantity, order.currency, order.amount, this.statusMeta(order.status).label, order.paidAt])
      const escape = value => `"${String(value).replace(/"/g, '""')}"`
      const csv = '\ufeff' + [headers, ...rows].map(row => row.map(escape).join(',')).join('\r\n')
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `订单导出_${new Date().getTime()}.csv`; link.click(); URL.revokeObjectURL(url); this.msgSuccess(`已导出 ${selected.length} 笔模拟订单`)
    },
    handleCancel(order) {
      ElMessageBox.confirm(`确认取消订单“${order.platformOrderNo}”吗？`, '取消订单', { confirmButtonText: '确认取消', cancelButtonText: '返回', type: 'warning' }).then(() => {
        order.status = 'cancelled'; order.logisticsStatus = 'cancelled'; order.payStatus = 'refunded'; order.timeline.push({ title: '商家取消订单，退款处理中', time: this.nowText(), type: 'danger' }); this.msgSuccess('订单已取消（模拟）')
      }).catch(() => {})
    },
    handleOrderCommand(command, order) { command === 'cancel' ? this.handleCancel(order) : this.openProcess('note', order) }
  }
}
</script>

<style lang="scss" scoped>
.order-page { min-height: calc(100vh - 110px); }
.order-heading { min-height: 94px; padding: 18px 22px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: linear-gradient(118deg, #101827 0%, #172a46 58%, #134e5e 130%); border-radius: 14px; box-shadow: 0 8px 28px rgba(18, 38, 64, .18); }
.order-heading h1 { margin: 3px 0; font-size: 24px; line-height: 1.25; letter-spacing: 1px; }
.order-heading p { margin: 0; color: rgba(255, 255, 255, .65); font-size: 13px; }
.eyebrow { color: #6ee7d2; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
.heading-meta { display: flex; align-items: center; gap: 15px; }
.heading-meta > span { color: rgba(255, 255, 255, .55); font-size: 11px; }
.heading-meta i { width: 6px; height: 6px; margin-right: 6px; display: inline-block; background: #34d399; border-radius: 50%; box-shadow: 0 0 0 3px rgba(52, 211, 153, .15); }
.metric-row { margin-bottom: 2px; }
.metric-card { min-height: 108px; margin-bottom: 14px; padding: 18px; display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #edf0f5; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); }
.metric-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; font-size: 21px; flex: 0 0 auto; }
.metric-icon.blue { color: #2563eb; background: #eaf1ff; }.metric-icon.purple { color: #7c3aed; background: #f2ebff; }.metric-icon.orange { color: #ea580c; background: #fff1e7; }.metric-icon.red { color: #e11d48; background: #ffecef; }
.metric-card > div:not(.metric-icon) { min-width: 0; display: flex; flex-direction: column; }
.metric-card span { color: #64748b; font-size: 12px; }.metric-card strong { margin: 2px 0; color: #172033; font-size: 25px; line-height: 1.15; font-variant-numeric: tabular-nums; }.metric-card small { color: #98a2b3; font-size: 10px; }.metric-card em { color: #059669; font-style: normal; }
.sales-card { justify-content: space-between; background: linear-gradient(135deg, #f6fffd, #fff); }.sales-card strong { font-size: 20px; }.sparkline { height: 50px; min-width: 74px !important; display: flex !important; flex-direction: row !important; align-items: flex-end; gap: 4px; }.sparkline i { width: 6px; background: linear-gradient(#14b8a6, #99f6e4); border-radius: 3px; }
.order-card { border: 0; border-radius: 14px; box-shadow: 0 3px 18px rgba(23, 34, 66, .06); }.order-card :deep(.el-card__body) { padding: 0; }
.status-tabs { padding: 0 18px; border-bottom: 1px solid #edf0f5; }.status-tabs :deep(.el-tabs__header) { margin: 0; }.status-tabs :deep(.el-tabs__nav-wrap::after) { display: none; }.status-tabs :deep(.el-tabs__item) { height: 54px; color: #667085; }.status-tabs b { min-width: 18px; height: 18px; margin-left: 5px; padding: 0 5px; display: inline-grid; place-items: center; color: #667085; background: #f0f2f5; border-radius: 9px; font-size: 10px; }.status-tabs :deep(.is-active) b { color: #2563eb; background: #eaf1ff; }
.order-filter { display: flex; align-items: center; padding: 15px 18px 5px; background: #fbfcfe; border-bottom: 1px solid #edf0f5; }.order-filter :deep(.el-form-item) { margin-right: 10px; margin-bottom: 10px; }.order-filter :deep(.el-input) { width: 225px; }.order-filter :deep(.el-select) { width: 155px; }.order-filter :deep(.el-date-editor) { width: 260px; }.filter-buttons { margin-left: auto; margin-right: 0 !important; }
.order-toolbar { min-height: 61px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; }.toolbar-meta { display: flex; align-items: center; gap: 10px; color: #98a2b3; font-size: 11px; }
.order-table { width: 100%; }.order-table :deep(th.el-table__cell) { height: 46px; color: #667085; background: #f7f8fb; font-weight: 600; }.order-table :deep(td.el-table__cell) { padding: 11px 0; }
.order-id, .shop-cell, .buyer-cell, .amount-cell { display: flex; flex-direction: column; gap: 3px; }.order-id button { padding: 0; color: #2563eb; background: none; border: 0; font-family: inherit; font-size: 12px; font-weight: 600; text-align: left; cursor: pointer; }.order-id span, .order-id small, .shop-cell span, .buyer-cell span, .amount-cell span { color: #98a2b3; font-size: 10px; }.order-id small { color: #667085; }.shop-cell strong, .buyer-cell strong { max-width: 145px; color: #344054; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.shop-cell i { margin-right: 5px; padding: 2px 4px; color: #475467; background: #eef2f6; border-radius: 4px; font-size: 9px; font-style: normal; }.amount-cell strong { color: #172033; font-size: 12px; }.amount-cell { align-items: flex-end; }
.product-cell { display: flex; align-items: center; gap: 10px; }.product-thumb { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 9px; font-size: 19px; flex: 0 0 auto; }.product-thumb.tone-0 { color: #7c3aed; background: #f2ebff; }.product-thumb.tone-1 { color: #2563eb; background: #eaf1ff; }.product-thumb.tone-2 { color: #0891b2; background: #e7f8fb; }.product-thumb.tone-3 { color: #e11d48; background: #ffecef; }.product-thumb.tone-4 { color: #d97706; background: #fff5dc; }.product-cell > div:last-child { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.product-cell strong { max-width: 185px; color: #344054; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.product-cell span, .product-cell small { color: #98a2b3; font-size: 10px; }
.abnormal-mark { margin-top: 4px; color: #e11d48; font-size: 9px; }.abnormal-mark .el-icon { vertical-align: -1px; }.logistics-pill { display: inline-flex; align-items: center; color: #667085; font-size: 11px; }.logistics-pill::before { content: ''; width: 6px; height: 6px; margin-right: 5px; background: #94a3b8; border-radius: 50%; }.logistics-pill.ready::before { background: #f59e0b; }.logistics-pill.shipped::before { background: #2563eb; }.logistics-pill.delivered::before { background: #10b981; }.logistics-pill.exception::before { background: #ef4444; }.more-button { margin-left: 10px; color: #667085; }
.order-pagination { min-height: 70px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #edf0f5; }.order-pagination > span { color: #98a2b3; font-size: 12px; }
.detail-head { min-height: 166px; padding: 34px 30px 24px; color: #fff; background: linear-gradient(130deg, #101827, #1d3b5e); position: relative; }.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: rgba(255,255,255,.76); background: rgba(255,255,255,.08); border: 0; border-radius: 50%; cursor: pointer; }.detail-head-top { display: flex; align-items: flex-end; justify-content: space-between; }.detail-head-top span { color: #8eacd0; font-size: 10px; }.detail-head h2 { margin: 4px 0; font-size: 20px; }.detail-head > p { margin: 7px 0 0; color: rgba(255,255,255,.5); font-size: 10px; }.detail-warning { margin-top: 14px; padding: 8px 10px; display: flex; align-items: center; gap: 7px; color: #fecdd3; background: rgba(225,29,72,.18); border: 1px solid rgba(251,113,133,.2); border-radius: 7px; font-size: 11px; }
.detail-body { padding: 22px 28px 92px; }.detail-section + .detail-section { margin-top: 24px; }.detail-section h3 { margin: 0 0 14px; display: flex; align-items: center; gap: 7px; color: #1d2939; font-size: 13px; }.detail-section h3 .el-icon { color: #2563eb; }.detail-product { padding: 13px; display: flex; align-items: center; gap: 12px; background: #f8fafc; border: 1px solid #edf0f5; border-radius: 10px; }.product-thumb.large { width: 54px; height: 54px; font-size: 24px; }.detail-product > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 3px; flex: 1; }.detail-product strong { color: #344054; font-size: 12px; }.detail-product span, .detail-product small { color: #98a2b3; font-size: 10px; }.detail-product > b { color: #172033; font-size: 12px; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 22px; }.detail-grid > div { min-width: 0; display: flex; flex-direction: column; gap: 4px; }.detail-grid .full { grid-column: 1 / -1; }.detail-grid span { color: #98a2b3; font-size: 10px; }.detail-grid strong { color: #475467; font-size: 12px; font-weight: 500; line-height: 1.5; }.fee-list { padding: 5px 14px; background: #f8fafc; border-radius: 9px; }.fee-list > div { padding: 9px 0; display: flex; justify-content: space-between; color: #667085; border-bottom: 1px dashed #e4e8ef; font-size: 11px; }.fee-list > div:last-child { border-bottom: 0; }.fee-list strong { color: #475467; font-weight: 500; }.fee-list .discount { color: #059669; }.fee-list .total { font-size: 13px; }.fee-list .total strong { color: #172033; font-weight: 700; }.order-timeline { padding: 5px 5px 0; }.order-timeline :deep(.el-timeline-item__timestamp) { color: #98a2b3; font-size: 10px; }.order-timeline strong { color: #475467; font-size: 11px; font-weight: 500; }.note-box { padding: 12px 14px; color: #667085; background: #fffaf0; border-left: 3px solid #f59e0b; border-radius: 4px 8px 8px 4px; font-size: 11px; line-height: 1.6; }.detail-footer { position: absolute; left: 0; right: 0; bottom: 0; padding: 15px 28px; display: flex; justify-content: flex-end; background: rgba(255,255,255,.96); border-top: 1px solid #edf0f5; backdrop-filter: blur(8px); }.demo-alert { margin-bottom: 18px; }
@media (max-width: 1280px) { .filter-buttons { margin-left: 0; } }
@media (max-width: 768px) { .order-heading { padding: 16px; }.order-heading p, .eyebrow, .heading-meta > span { display: none; }.order-heading h1 { font-size: 20px; }.metric-card { min-height: 92px; padding: 13px; }.metric-icon { width: 38px; height: 38px; }.metric-card strong { font-size: 21px; }.metric-card small { display: none; }.order-filter { display: grid; grid-template-columns: 1fr 1fr; gap: 0 8px; }.order-filter :deep(.el-form-item), .order-filter :deep(.el-input), .order-filter :deep(.el-select), .order-filter :deep(.el-date-editor) { width: 100%; margin-right: 0; }.order-filter :deep(.el-date-editor), .filter-buttons { grid-column: 1 / -1; }.order-toolbar { align-items: flex-start; gap: 10px; }.order-toolbar > div:first-child { display: flex; flex-wrap: wrap; gap: 6px; }.order-toolbar .el-button + .el-button { margin-left: 0; }.order-pagination { overflow-x: auto; }.order-pagination > span { display: none; }.detail-grid { grid-template-columns: 1fr; }.detail-grid .full { grid-column: auto; }:deep(.el-drawer) { width: 100% !important; } }
</style>
