<template>
  <div class="dashboard-sales-page">
    <section class="dashboard-hero">
      <div>
        <div class="eyebrow">PRODUCT SALES ANALYTICS</div>
        <h1>商品销售数据</h1>
        <p>销售数据实时取自妙手，支持按配置、店铺和日期范围查询。</p>
      </div>
      <div class="hero-meta">
        <span>{{ currentConfigName }}</span>
        <strong>{{ dateRangeLabel }}</strong>
      </div>
    </section>

    <el-card class="filter-card" shadow="never">
      <el-form :model="queryParams" :inline="true" class="filter-form">
        <el-form-item label="妙手配置">
          <el-select v-model="queryParams.miaoshouConfigId" placeholder="请选择妙手配置" filterable @change="handleConfigChange">
            <el-option v-for="item in options.configs" :key="item.id" :label="item.configName" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="店铺">
          <el-select
            v-model="queryParams.shopIds"
            multiple
            collapse-tags
            collapse-tags-tooltip
            filterable
            placeholder="请选择店铺"
          >
            <el-option v-for="item in availableShops" :key="item.remoteShopId" :label="shopOptionLabel(item)" :value="item.remoteShopId" />
          </el-select>
        </el-form-item>
        <el-form-item label="统计日期">
          <el-date-picker
            v-model="queryParams.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :disabled-date="disabledFutureDate"
          />
        </el-form-item>
        <el-form-item label="商品名称">
          <el-input v-model="queryParams.goodsName" clearable placeholder="支持模糊搜索" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item label="商品 SKU">
          <el-input v-model="queryParams.goodsSkuOuterIds" clearable placeholder="外部 SKU" @keyup.enter="handleQuery" />
        </el-form-item>
        <el-form-item class="filter-actions">
          <el-button type="primary" :icon="Search" :loading="loading" @click="handleQuery">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <el-alert
        v-if="selectedCurrencies.length > 1"
        class="currency-alert"
        type="warning"
        :closable="false"
        show-icon
        title="当前选择包含多个币种，金额按妙手接口原始口径展示，请勿直接视为同一币种汇总。"
      />
    </el-card>

    <el-alert
      v-if="loadError"
      class="load-alert"
      type="error"
      :closable="false"
      show-icon
    >
      <template #title>
        {{ loadError }}
        <el-button type="primary" link @click="retryLoad">重新加载</el-button>
      </template>
    </el-alert>

    <el-row v-loading="loading" :gutter="14" class="summary-row">
      <el-col :xs="12" :sm="12" :md="6">
        <chart-card title="本页销售额" :total="formatAmount(summary.combinedSaleAmount)" color="#2563eb">
          <template #icon><i class="ri-money-dollar-circle-line" /></template>
          <div class="metric-breakdown">自营 {{ formatAmount(summary.goodsSaleAmount) }} · 三方仓 {{ formatAmount(summary.thirdPartySaleAmount) }}</div>
          <template #footer>当前页 {{ list.length }} 个 SKU</template>
        </chart-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <chart-card title="本页销售件数" :total="formatCount(summary.combinedGoodsSaleCount)" color="#059669">
          <template #icon><i class="ri-shopping-bag-3-line" /></template>
          <div class="metric-breakdown">自营 {{ formatCount(summary.goodsSaleCount) }} · 三方仓 {{ formatCount(summary.thirdPartyGoodsSaleCount) }}</div>
          <template #footer>妙手商品销量口径</template>
        </chart-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <chart-card title="本页销售订单" :total="formatCount(summary.combinedOrderSaleCount)" color="#f59e0b">
          <template #icon><i class="ri-file-list-3-line" /></template>
          <div class="metric-breakdown">自营 {{ formatCount(summary.orderSaleCount) }} · 三方仓 {{ formatCount(summary.thirdPartyOrderSaleCount) }}</div>
          <template #footer>订单量可能与商品件数不同</template>
        </chart-card>
      </el-col>
      <el-col :xs="12" :sm="12" :md="6">
        <chart-card title="本页退款金额" :total="formatAmount(summary.orderRefundAmount)" color="#dc2626">
          <template #icon><i class="ri-refund-2-line" /></template>
          <div class="metric-breakdown">退款商品 {{ formatCount(summary.goodsRefundCount) }} 件</div>
          <template #footer>退款成本 {{ formatAmount(summary.goodsRefundAmount) }}</template>
        </chart-card>
      </el-col>
    </el-row>

    <el-row :gutter="14" class="content-row">
      <el-col :xs="24" :lg="9">
        <el-card class="ranking-card" shadow="never">
          <bar :list="rankData" title="当前页商品销售额 TOP 10" />
          <el-empty v-if="!loading && !rankData.length" description="暂无排行数据" :image-size="72" />
        </el-card>
      </el-col>
      <el-col :xs="24" :lg="15">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="table-heading">
              <div><strong>商品销售明细</strong><span>共 {{ total }} 个 SKU</span></div>
              <span class="scope-tag">指标卡统计范围：当前页</span>
            </div>
          </template>
          <el-table v-loading="loading" :data="list" row-key="goodsSkuId" class="sales-table">
            <template #empty>
              <el-empty :description="emptyDescription" :image-size="88" />
            </template>
            <el-table-column type="expand" width="44">
              <template #default="scope">
                <div class="warehouse-detail">
                  <div class="warehouse-title">第三方仓销售明细</div>
                  <el-table v-if="scope.row.logisticsAgentGoodsSkuSalesList && scope.row.logisticsAgentGoodsSkuSalesList.length" :data="scope.row.logisticsAgentGoodsSkuSalesList" size="small" border>
                    <el-table-column label="仓库" min-width="180"><template #default="sub">{{ sub.row.logisticsAgentWarehouseName || sub.row.logisticsAgentWarehouseId || '-' }}</template></el-table-column>
                    <el-table-column label="第三方 SKU" prop="logisticsAgentGoodsSkuId" min-width="130" />
                    <el-table-column label="订单量" width="100" align="right"><template #default="sub">{{ formatCount(sub.row.orderSaleCount) }}</template></el-table-column>
                    <el-table-column label="销量" width="100" align="right"><template #default="sub">{{ formatCount(sub.row.goodsSaleCount) }}</template></el-table-column>
                    <el-table-column label="销售额" width="130" align="right"><template #default="sub">{{ formatAmount(sub.row.orderSaleAmount) }}</template></el-table-column>
                    <el-table-column label="商品成本" width="130" align="right"><template #default="sub">{{ formatAmount(sub.row.goodsCostAmount) }}</template></el-table-column>
                  </el-table>
                  <el-empty v-else description="该商品暂无第三方仓销售明细" :image-size="62" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="排名" width="65" align="center"><template #default="scope"><span class="rank-number">{{ scope.row.rank || '-' }}</span></template></el-table-column>
            <el-table-column label="商品 / SKU" min-width="280" fixed="left">
              <template #default="scope">
                <div class="product-cell">
                  <el-image :src="productImage(scope.row)" fit="cover" lazy>
                    <template #error><div class="image-fallback"><i class="ri-image-line" /></div></template>
                  </el-image>
                  <div>
                    <strong :title="scope.row.goodsSkuInfo?.goodsName">{{ scope.row.goodsSkuInfo?.goodsName || '未命名商品' }}</strong>
                    <span>SKU：{{ scope.row.goodsSkuInfo?.goodsSkuOuterId || scope.row.goodsSkuId || '-' }}</span>
                    <small>{{ scope.row.goodsSkuInfo?.goodsSkuSubName || scope.row.goodsSkuInfo?.goodsSkuCustomCode || '-' }}</small>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="自营订单 / 销量" width="135" align="right"><template #default="scope"><div class="number-pair"><strong>{{ formatCount(scope.row.orderSaleCount) }}</strong><span>{{ formatCount(scope.row.goodsSaleCount) }} 件</span></div></template></el-table-column>
            <el-table-column label="三方仓订单 / 销量" width="145" align="right"><template #default="scope"><div class="number-pair"><strong>{{ formatCount(scope.row.logisticsAgentGoodsSkuAllSales?.logisticsAgentGoodsSkuOrderSaleCount) }}</strong><span>{{ formatCount(scope.row.logisticsAgentGoodsSkuAllSales?.logisticsAgentGoodsSkuGoodsSaleCount) }} 件</span></div></template></el-table-column>
            <el-table-column label="退款" width="115" align="right"><template #default="scope"><div class="number-pair refund"><strong>{{ formatAmount(scope.row.orderRefundAmount) }}</strong><span>{{ formatCount(scope.row.goodsRefundCount) }} 件</span></div></template></el-table-column>
            <el-table-column label="销售额" width="130" align="right"><template #default="scope"><strong class="amount-primary">{{ formatAmount(combinedSaleAmount(scope.row)) }}</strong></template></el-table-column>
            <el-table-column label="商品成本" width="125" align="right"><template #default="scope">{{ formatAmount(combinedCostAmount(scope.row)) }}</template></el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <span>第 {{ queryParams.page }} 页，共 {{ total }} 个 SKU</span>
            <el-pagination
              v-model:current-page="queryParams.page"
              v-model:page-size="queryParams.pageSize"
              background
              layout="sizes, prev, pager, next, jumper"
              :page-sizes="[10, 20, 50, 100]"
              :total="total"
              @current-change="getList"
              @size-change="handlePageSizeChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
import { Refresh, Search } from '@element-plus/icons-vue'
import ChartCard from '@/components/ChartCard'
import Bar from '@/components/Bar.vue'
import { getDashboardGoodsSaleOptions, searchDashboardGoodsSales } from '@/api/dashboard/goods-sales'

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function defaultDateRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return [formatDate(start), formatDate(end)]
}

function emptySummary() {
  return {
    goodsSaleAmount: 0,
    goodsCostAmount: 0,
    orderSaleCount: 0,
    goodsSaleCount: 0,
    goodsRefundCount: 0,
    goodsRefundAmount: 0,
    orderRefundAmount: 0,
    thirdPartySaleAmount: 0,
    thirdPartyCostAmount: 0,
    thirdPartyOrderSaleCount: 0,
    thirdPartyGoodsSaleCount: 0,
    combinedSaleAmount: 0,
    combinedCostAmount: 0,
    combinedOrderSaleCount: 0,
    combinedGoodsSaleCount: 0
  }
}

export default {
  name: 'DashboardAdmin',
  components: { ChartCard, Bar },
  setup() { return { Refresh, Search } },
  data() {
    return {
      loading: false,
      optionsLoading: false,
      initialized: false,
      loadError: '',
      options: { configs: [], shops: [] },
      list: [],
      total: 0,
      summary: emptySummary(),
      queryParams: {
        miaoshouConfigId: undefined,
        shopIds: [],
        dateRange: defaultDateRange(),
        goodsName: '',
        goodsSkuOuterIds: '',
        page: 1,
        pageSize: 20
      }
    }
  },
  computed: {
    availableShops() {
      return this.options.shops.filter(item => item.miaoshouConfigId === this.queryParams.miaoshouConfigId)
    },
    selectedCurrencies() {
      const selected = new Set(this.queryParams.shopIds)
      return [...new Set(this.availableShops.filter(item => selected.has(item.remoteShopId)).map(item => item.currency).filter(Boolean))]
    },
    currentConfigName() {
      return this.options.configs.find(item => item.id === this.queryParams.miaoshouConfigId)?.configName || '尚未选择配置'
    },
    dateRangeLabel() {
      return this.queryParams.dateRange?.length === 2 ? this.queryParams.dateRange.join(' — ') : '请选择统计日期'
    },
    rankData() {
      return [...this.list]
        .sort((left, right) => this.combinedSaleAmount(right) - this.combinedSaleAmount(left))
        .slice(0, 10)
        .map(item => ({
          x: this.truncateLabel(item.goodsSkuInfo?.goodsName || item.goodsSkuInfo?.goodsSkuOuterId || item.goodsSkuId || '-'),
          y: Number(this.combinedSaleAmount(item).toFixed(2))
        }))
    },
    emptyDescription() {
      if (this.optionsLoading) return '正在加载筛选项'
      if (!this.options.configs.length) return '暂无启用的妙手 API 配置'
      if (!this.availableShops.length) return '当前配置暂无已启用店铺，请先同步店铺'
      return '当前条件下暂无商品销售数据'
    }
  },
  created() {
    this.loadOptions()
  },
  methods: {
    toNumber(value) {
      const parsed = Number(value)
      return Number.isFinite(parsed) ? parsed : 0
    },
    formatAmount(value) {
      return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(this.toNumber(value))
    },
    formatCount(value) {
      return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(this.toNumber(value))
    },
    truncateLabel(value) {
      const text = String(value || '-')
      return text.length > 10 ? `${text.slice(0, 10)}…` : text
    },
    shopOptionLabel(shop) {
      const location = [shop.platform, shop.siteCode].filter(Boolean).join(' / ')
      return location ? `${shop.shopName}（${location}）` : shop.shopName
    },
    productImage(row) {
      return row.goodsSkuInfo?.logoUrl || row.goodsSkuInfo?.logoOssPath || ''
    },
    combinedSaleAmount(row) {
      return this.toNumber(row.goodsSaleAmount) + this.toNumber(row.logisticsAgentGoodsSkuAllSales?.logisticsAgentGoodsSkuOrderSaleAmount)
    },
    combinedCostAmount(row) {
      return this.toNumber(row.goodsCostAmount) + this.toNumber(row.logisticsAgentGoodsSkuAllSales?.logisticsAgentGoodsSkuGoodsCostAmount)
    },
    disabledFutureDate(date) {
      const tomorrow = new Date()
      tomorrow.setHours(23, 59, 59, 999)
      return date.getTime() > tomorrow.getTime()
    },
    loadOptions() {
      this.optionsLoading = true
      this.loadError = ''
      return getDashboardGoodsSaleOptions().then(response => {
        this.options = response.data || { configs: [], shops: [] }
        if (!this.queryParams.miaoshouConfigId && this.options.configs.length) {
          this.queryParams.miaoshouConfigId = this.options.configs[0].id
        }
        this.selectAllAvailableShops()
        this.initialized = true
        if (this.queryParams.miaoshouConfigId && this.queryParams.shopIds.length) return this.getList()
      }).catch(error => {
        this.loadError = error?.message || '商品销售筛选项加载失败'
      }).finally(() => {
        this.optionsLoading = false
      })
    },
    selectAllAvailableShops() {
      this.queryParams.shopIds = this.availableShops.map(item => item.remoteShopId)
    },
    handleConfigChange() {
      this.queryParams.page = 1
      this.selectAllAvailableShops()
      this.list = []
      this.total = 0
      this.summary = emptySummary()
      if (this.queryParams.shopIds.length) this.getList()
    },
    handleQuery() {
      this.queryParams.page = 1
      this.getList()
    },
    resetQuery() {
      const pageSize = this.queryParams.pageSize
      this.queryParams = {
        miaoshouConfigId: this.options.configs[0]?.id,
        shopIds: [],
        dateRange: defaultDateRange(),
        goodsName: '',
        goodsSkuOuterIds: '',
        page: 1,
        pageSize
      }
      this.selectAllAvailableShops()
      if (this.queryParams.miaoshouConfigId && this.queryParams.shopIds.length) this.getList()
    },
    handlePageSizeChange() {
      this.queryParams.page = 1
      this.getList()
    },
    getList() {
      if (!this.queryParams.miaoshouConfigId) {
        this.msgError('请选择妙手配置')
        return Promise.resolve()
      }
      if (!this.queryParams.shopIds.length) {
        this.msgError('请至少选择一个店铺')
        return Promise.resolve()
      }
      if (!this.queryParams.dateRange || this.queryParams.dateRange.length !== 2) {
        this.msgError('请选择统计日期范围')
        return Promise.resolve()
      }
      this.loading = true
      this.loadError = ''
      const payload = {
        miaoshouConfigId: this.queryParams.miaoshouConfigId,
        page: this.queryParams.page,
        pageSize: this.queryParams.pageSize,
        shopIds: this.queryParams.shopIds,
        gmtStart: this.queryParams.dateRange[0],
        gmtEnd: this.queryParams.dateRange[1],
        goodsName: this.queryParams.goodsName,
        goodsNameRp: this.queryParams.goodsName ? 'ss' : '',
        goodsSkuOuterIds: this.queryParams.goodsSkuOuterIds,
        goodsSkuOuterIdsRp: this.queryParams.goodsSkuOuterIds ? 'ss' : '',
        shopFilterType: 'shopId'
      }
      return searchDashboardGoodsSales(payload).then(response => {
        const result = response.data || {}
        this.list = result.list || []
        this.total = result.total || 0
        this.summary = result.summary || emptySummary()
      }).catch(error => {
        this.list = []
        this.total = 0
        this.summary = emptySummary()
        this.loadError = error?.message || '商品销售数据加载失败'
      }).finally(() => {
        this.loading = false
      })
    },
    retryLoad() {
      if (!this.initialized) return this.loadOptions()
      return this.getList()
    }
  }
}
</script>

<style lang="scss" scoped>
.dashboard-sales-page { min-height: calc(100vh - 84px); padding: 14px; background: #f3f5f9; }
.dashboard-hero { min-height: 116px; margin-bottom: 14px; padding: 24px 28px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: linear-gradient(120deg, #151a2d, #25355f 58%, #1f4c73); border-radius: 14px; box-shadow: 0 10px 28px rgba(28, 42, 82, .2); position: relative; overflow: hidden; }
.dashboard-hero::after { content: ''; position: absolute; right: 13%; top: -116px; width: 210px; height: 210px; border: 36px solid rgba(255, 255, 255, .05); border-radius: 50%; }
.dashboard-hero > * { position: relative; z-index: 1; }.dashboard-hero h1 { margin: 4px 0; font-size: 25px; }.dashboard-hero p { margin: 0; color: rgba(255, 255, 255, .68); font-size: 13px; }.eyebrow { color: #8fb4ff; font-size: 10px; font-weight: 700; letter-spacing: 2px; }.hero-meta { min-width: 220px; padding-left: 24px; display: flex; flex-direction: column; align-items: flex-end; border-left: 1px solid rgba(255, 255, 255, .15); }.hero-meta span { color: #b8c9ea; font-size: 12px; }.hero-meta strong { margin-top: 5px; font-size: 14px; }
.filter-card, .ranking-card, .table-card { border: 0; border-radius: 12px; }.filter-card { margin-bottom: 14px; }.filter-form { display: flex; flex-wrap: wrap; }.filter-form :deep(.el-select) { width: 210px; }.filter-form :deep(.el-date-editor) { width: 245px; }.filter-form :deep(.el-input) { width: 180px; }.filter-actions { margin-left: auto; }.currency-alert { margin-top: 2px; }.load-alert { margin-bottom: 14px; }
.summary-row { min-height: 136px; }.summary-row .el-col { margin-bottom: 14px; }.metric-breakdown { overflow: hidden; color: #8490a3; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.content-row > .el-col { margin-bottom: 14px; }.ranking-card { min-height: 486px; }.ranking-card :deep(.el-card__body) { padding: 12px 10px 0; }.ranking-card :deep(.el-empty) { margin-top: -220px; }.table-card :deep(.el-card__body) { padding-top: 0; }.table-heading { display: flex; align-items: center; justify-content: space-between; }.table-heading > div { display: flex; flex-direction: column; gap: 3px; }.table-heading strong { color: #1d2939; font-size: 15px; }.table-heading span { color: #98a2b3; font-size: 11px; }.scope-tag { padding: 5px 9px; color: #2563eb !important; background: #eef4ff; border-radius: 12px; }
.sales-table :deep(th.el-table__cell) { height: 44px; color: #667085; background: #f7f8fb; }.sales-table :deep(td.el-table__cell) { padding: 10px 0; }.rank-number { color: #64748b; font-weight: 700; }.product-cell { min-width: 0; display: flex; align-items: center; gap: 10px; }.product-cell :deep(.el-image), .image-fallback { flex: 0 0 auto; width: 44px; height: 44px; border-radius: 8px; }.image-fallback { display: grid; place-items: center; color: #64748b; background: #eef2f6; }.product-cell > div:last-child, .number-pair { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.product-cell strong { max-width: 205px; overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.product-cell span, .product-cell small, .number-pair span { color: #98a2b3; font-size: 10px; }.number-pair strong { color: #344054; }.number-pair.refund strong { color: #dc2626; }.amount-primary { color: #2563eb; }
.warehouse-detail { padding: 13px 58px 18px; background: #fafbfc; }.warehouse-title { margin-bottom: 10px; color: #475467; font-size: 12px; font-weight: 700; }.pagination-wrap { min-height: 64px; padding-top: 14px; display: flex; align-items: center; justify-content: space-between; color: #98a2b3; font-size: 12px; }
@media (max-width: 1200px) { .filter-actions { margin-left: 0; }.ranking-card { min-height: auto; } }
@media (max-width: 768px) { .dashboard-sales-page { padding: 8px; }.dashboard-hero { min-height: 92px; padding: 18px; }.dashboard-hero p, .eyebrow, .hero-meta { display: none; }.filter-form { display: grid; grid-template-columns: 1fr; }.filter-form :deep(.el-form-item), .filter-form :deep(.el-select), .filter-form :deep(.el-date-editor), .filter-form :deep(.el-input) { width: 100%; margin-right: 0; }.scope-tag { display: none; }.pagination-wrap { align-items: flex-start; gap: 10px; overflow-x: auto; }.pagination-wrap > span { display: none; }.warehouse-detail { padding: 12px; } }
</style>
