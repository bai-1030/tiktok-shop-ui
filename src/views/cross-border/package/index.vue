<template>
  <BasicLayout>
    <template #wrapper>
      <div class="package-page">
        <section class="package-heading">
          <div>
            <div class="eyebrow">MIAOSHOU FULFILLMENT</div>
            <h1>包裹中心</h1>
            <p>同步并查询妙手包裹、订单商品与头尾程物流信息</p>
          </div>
          <div class="heading-actions">
            <span><i />数据刷新于 {{ lastRefresh || '尚未刷新' }}</span>
            <el-button v-permisaction="['admin:crossBorder:package:syncRecords']" :icon="Tickets" @click="openSyncRecords">同步记录</el-button>
            <el-button :icon="Refresh" @click="refreshPackages">刷新</el-button>
            <el-button v-permisaction="['admin:crossBorder:package:sync']" type="primary" :icon="Refresh" @click="openSync">同步包裹</el-button>
          </div>
        </section>

        <el-row :gutter="14" class="metric-row">
          <el-col :xs="12" :sm="8" :lg="5">
            <button type="button" class="metric-card" @click="switchStatus('wait_seller_send')">
              <span class="metric-icon orange"><el-icon><Box /></el-icon></span>
              <span><small>待发货</small><strong>{{ summary.waitSellerSend }}</strong><em>等待卖家处理</em></span>
            </button>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <button type="button" class="metric-card" @click="switchStatus('wait_confirmed')">
              <span class="metric-icon blue"><el-icon><Clock /></el-icon></span>
              <span><small>待审核</small><strong>{{ summary.waitConfirmed }}</strong><em>等待订单确认</em></span>
            </button>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <button type="button" class="metric-card" @click="switchStatus('wait_receiver_confirm')">
              <span class="metric-icon purple"><el-icon><Position /></el-icon></span>
              <span><small>已发货</small><strong>{{ summary.waitReceiverConfirm }}</strong><em>等待收件确认</em></span>
            </button>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <button type="button" class="metric-card" @click="switchStatus('finished')">
              <span class="metric-icon green"><el-icon><CircleCheck /></el-icon></span>
              <span><small>已完成</small><strong>{{ summary.finished }}</strong><em>履约已经完成</em></span>
            </button>
          </el-col>
          <el-col :xs="24" :sm="16" :lg="4">
            <button type="button" class="metric-card exception-card" @click="switchStatus('abnormal')">
              <span class="metric-icon red"><el-icon><WarningFilled /></el-icon></span>
              <span><small>异常包裹</small><strong>{{ summary.abnormal }}</strong><em>退款、退回或运单失败</em></span>
            </button>
          </el-col>
        </el-row>

        <el-card class="package-card" shadow="never">
          <el-tabs v-model="activeStatus" class="status-tabs" @tab-change="handleStatusTab">
            <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value">
              <template #label><span>{{ tab.label }}<b>{{ tab.count }}</b></span></template>
            </el-tab-pane>
          </el-tabs>

          <el-form :model="queryParams" :inline="true" class="package-filter">
            <el-form-item>
              <el-input v-model="queryParams.keyword" placeholder="包裹号 / 订单号 / 运单号 / SKU" clearable :prefix-icon="Search" @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryParams.remoteShopId" placeholder="全部店铺" clearable filterable>
                <el-option v-for="shop in shops" :key="shop.id" :label="shop.shopName" :value="shop.remoteShopId" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryParams.siteCode" placeholder="全部站点" clearable filterable>
                <el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-select v-model="queryParams.fulfillmentType" placeholder="全部履约方式" clearable>
                <el-option v-for="option in fulfillmentOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-date-picker v-model="queryParams.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="修改开始日期" end-placeholder="修改结束日期" />
            </el-form-item>
            <el-form-item class="filter-buttons">
              <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
              <el-button :icon="RefreshLeft" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="package-toolbar">
            <el-button :icon="Download" :disabled="!selectedPackages.length" @click="exportSelection">导出选中包裹</el-button>
            <span>已选 {{ selectedPackages.length }} 项</span>
          </div>

          <el-table v-loading="loading" :data="packages" row-key="id" class="package-table" @selection-change="handleSelectionChange">
            <template #empty><el-empty description="暂无符合条件的包裹，请先同步妙手包裹" :image-size="90" /></template>
            <el-table-column type="selection" width="46" align="center" />
            <el-table-column label="包裹 / 订单" min-width="220" fixed="left">
              <template #default="scope">
                <div class="package-identity">
                  <button type="button" @click="openDetail(scope.row)">{{ scope.row.appPackageNo || scope.row.remotePackageId }}</button>
                  <span>订单 {{ scope.row.platformOrderSn || '-' }}</span>
                  <small>远端 ID：{{ scope.row.remotePackageId }}</small>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="商品" min-width="245">
              <template #default="scope">
                <div v-if="firstItem(scope.row)" class="product-cell">
                  <el-image v-if="firstItem(scope.row).picUrl" :src="firstItem(scope.row).picUrl" fit="cover" class="product-thumb">
                    <template #error><div class="image-fallback"><el-icon><Goods /></el-icon></div></template>
                  </el-image>
                  <div v-else class="product-thumb image-fallback"><el-icon><Goods /></el-icon></div>
                  <div>
                    <strong>{{ firstItem(scope.row).title || '未命名商品' }}</strong>
                    <span>SKU {{ firstItem(scope.row).platformSkuId || firstItem(scope.row).platformOuterSkuId || '-' }}</span>
                    <small>{{ scope.row.items.length }} 种 / 共 {{ totalQuantity(scope.row.items) }} 件</small>
                  </div>
                </div>
                <span v-else class="empty-text">暂无商品明细</span>
              </template>
            </el-table-column>
            <el-table-column label="店铺 / 站点" min-width="180">
              <template #default="scope">
                <div class="shop-cell"><strong>{{ scope.row.shopName || scope.row.shopNick || '-' }}</strong><span><i>{{ scope.row.siteCode || '--' }}</i>{{ scope.row.siteName || '-' }}</span></div>
              </template>
            </el-table-column>
            <el-table-column label="收件地区" min-width="170">
              <template #default="scope"><div class="location-cell"><strong>{{ scope.row.consigneeCountryName || scope.row.consigneeCountry || '-' }}</strong><span>{{ locationText(scope.row) }}</span></div></template>
            </el-table-column>
            <el-table-column label="物流信息" min-width="220">
              <template #default="scope">
                <div v-if="scope.row.logisticsCompany || scope.row.logisticsNo" class="logistics-cell">
                  <strong>{{ scope.row.logisticsCompany || '未返回物流商' }}</strong>
                  <span>{{ scope.row.logisticsProductName || scope.row.fulfillmentType || '-' }}</span>
                  <small>{{ scope.row.logisticsNo || scope.row.logisticsProductNo || '-' }}</small>
                </div>
                <span v-else class="empty-text">暂未生成物流信息</span>
              </template>
            </el-table-column>
            <el-table-column label="订单金额" width="128" align="right">
              <template #default="scope"><div class="money-cell"><strong>{{ moneyText(scope.row.orderAmount, scope.row.currency) }}</strong><span>运费 {{ moneyText(scope.row.shippingFee, scope.row.shippingFeeCurrency || scope.row.currency) }}</span></div></template>
            </el-table-column>
            <el-table-column label="包裹状态" width="145" align="center">
              <template #default="scope">
                <el-tag :type="packageStatusMeta(scope.row).type" effect="light" round>{{ packageStatusMeta(scope.row).label }}</el-tag>
                <div v-if="scope.row.applyTrackingNoFailCode" class="abnormal-mark"><el-icon><WarningFilled /></el-icon>运单申请失败</div>
              </template>
            </el-table-column>
            <el-table-column label="妙手修改时间" width="170"><template #default="scope">{{ formatTime(scope.row.orderModifiedAt || scope.row.updatedAt) }}</template></el-table-column>
            <el-table-column label="操作" width="90" align="center" fixed="right">
              <template #default="scope"><el-button type="primary" link :icon="View" @click="openDetail(scope.row)">详情</el-button></template>
            </el-table-column>
          </el-table>

          <div class="package-pagination">
            <span>共 {{ total }} 个包裹</span>
            <el-pagination v-model:current-page="queryParams.pageIndex" v-model:page-size="queryParams.pageSize" background layout="sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50, 100]" :total="total" @current-change="getList" @size-change="handlePageSizeChange" />
          </div>
        </el-card>

        <el-drawer v-model="detailOpen" size="720px" :with-header="false" destroy-on-close>
          <div v-loading="detailLoading" class="package-detail">
            <template v-if="detailPackage">
              <div class="detail-head">
                <button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button>
                <div class="detail-head-top">
                  <div><span>妙手包裹号</span><h2>{{ detailPackage.appPackageNo || detailPackage.remotePackageId }}</h2></div>
                  <el-tag :type="packageStatusMeta(detailPackage).type" effect="dark" round>{{ packageStatusMeta(detailPackage).label }}</el-tag>
                </div>
                <p>平台订单：{{ detailPackage.platformOrderSn || '-' }} · {{ detailPackage.shopName || detailPackage.shopNick || '-' }}</p>
                <el-alert v-if="detailPackage.applyTrackingNoFailCode" :title="detailPackage.applyTrackingNoFailReason || detailPackage.applyTrackingNoFailCode" type="error" :closable="false" show-icon />
              </div>
              <div class="detail-body">
                <div class="detail-refresh-bar">
                  <div>
                    <el-tag :type="detailPackage.remoteRefreshed ? 'success' : 'warning'" effect="light" round>
                      {{ detailPackage.remoteRefreshed ? '妙手实时数据' : '本地缓存数据' }}
                    </el-tag>
                    <span>最近刷新：{{ formatTime(detailPackage.lastSyncedAt) }}</span>
                  </div>
                  <el-button type="primary" link :icon="Refresh" :loading="detailLoading" @click="refreshDetail">重新获取详情</el-button>
                </div>
                <el-alert v-if="detailPackage.refreshWarning" :title="detailPackage.refreshWarning" type="warning" :closable="false" show-icon class="detail-refresh-alert" />
                <section class="detail-section">
                  <h3><el-icon><Goods /></el-icon>商品明细</h3>
                  <div v-if="detailPackage.items && detailPackage.items.length" class="detail-products">
                    <div v-for="item in detailPackage.items" :key="item.id" class="detail-product">
                      <el-image v-if="item.picUrl" :src="item.picUrl" fit="cover" class="detail-product-image"><template #error><div class="image-fallback"><el-icon><Goods /></el-icon></div></template></el-image>
                      <div v-else class="detail-product-image image-fallback"><el-icon><Goods /></el-icon></div>
                      <div><strong>{{ item.title || '未命名商品' }}</strong><span>{{ item.skuSubName || '-' }}</span><small>SKU {{ item.platformSkuId || item.platformOuterSkuId || '-' }} · 成交价 {{ moneyText(item.discountedPrice, detailPackage.currency) }}</small></div>
                      <b>× {{ item.quantity }}</b>
                    </div>
                  </div>
                  <el-empty v-else description="暂无商品明细" :image-size="62" />
                </section>
                <section v-if="detailPackage.giftItems && detailPackage.giftItems.length" class="detail-section">
                  <h3><el-icon><Box /></el-icon>赠品明细</h3>
                  <div v-for="gift in detailPackage.giftItems" :key="gift.id" class="gift-row"><span>{{ gift.goodsName || '未命名赠品' }}</span><small>SKU {{ gift.goodsSkuOuterId || gift.goodsSkuId || '-' }}</small><b>× {{ gift.quantity }}</b></div>
                </section>
                <section class="detail-section">
                  <h3><el-icon><Tickets /></el-icon>订单信息</h3>
                  <div class="detail-grid">
                    <div><span>平台订单号</span><strong>{{ detailPackage.platformOrderSn || '-' }}</strong></div>
                    <div><span>平台订单状态</span><strong>{{ detailPackage.platformOrderStatus || '-' }}</strong></div>
                    <div><span>订单金额</span><strong>{{ moneyText(detailPackage.orderAmount, detailPackage.currency) }}</strong></div>
                    <div><span>支付金额</span><strong>{{ moneyText(detailPackage.payAmount, detailPackage.currency) }}</strong></div>
                    <div><span>商品金额</span><strong>{{ moneyText(detailPackage.productAmount, detailPackage.currency) }}</strong></div>
                    <div><span>平台佣金</span><strong>{{ moneyText(detailPackage.commissionFee, detailPackage.currency) }}</strong></div>
                    <div><span>预估运费</span><strong>{{ moneyText(detailPackage.estimatedShippingFee, detailPackage.currency) }}</strong></div>
                    <div><span>实际运费</span><strong>{{ moneyText(detailPackage.actualShippingCost, detailPackage.currency) }}</strong></div>
                    <div><span>折扣金额</span><strong>{{ moneyText(detailPackage.discountAmount, detailPackage.currency) }}</strong></div>
                    <div><span>预估回款</span><strong>{{ moneyText(detailPackage.escrowAmount, detailPackage.currency) }}</strong></div>
                    <div><span>支付方式</span><strong>{{ detailPackage.paymentMethod || '-' }}</strong></div>
                    <div><span>履约方式</span><strong>{{ fulfillmentLabel(detailPackage.fulfillmentType) }}</strong></div>
                    <div><span>汇率</span><strong>{{ detailPackage.exchangeRate ?? '-' }}</strong></div>
                    <div><span>货到付款</span><strong>{{ detailPackage.isCod ? '是' : '否' }}</strong></div>
                    <div class="full"><span>买家留言</span><strong>{{ detailPackage.buyerMessage || '-' }}</strong></div>
                    <div class="full"><span>卖家备注</span><strong>{{ detailPackage.sellerNote || detailPackage.appNote || '-' }}</strong></div>
                  </div>
                </section>
                <section class="detail-section">
                  <h3><el-icon><Shop /></el-icon>店铺与收件地区</h3>
                  <div class="detail-grid">
                    <div><span>店铺</span><strong>{{ detailPackage.shopName || detailPackage.shopNick || '-' }}</strong></div>
                    <div><span>站点</span><strong>{{ detailPackage.siteName || '-' }}（{{ detailPackage.siteCode || '-' }}）</strong></div>
                    <div><span>国家/地区</span><strong>{{ detailPackage.consigneeCountryName || detailPackage.consigneeCountry || '-' }}</strong></div>
                    <div><span>州/省</span><strong>{{ detailPackage.consigneeState || '-' }}</strong></div>
                    <div><span>城市</span><strong>{{ detailPackage.consigneeCity || '-' }}</strong></div>
                  </div>
                </section>
                <section class="detail-section">
                  <h3><el-icon><Van /></el-icon>物流信息</h3>
                  <div class="detail-grid">
                    <div><span>物流公司</span><strong>{{ detailPackage.logisticsCompany || '-' }}</strong></div>
                    <div><span>物流渠道</span><strong>{{ detailPackage.logisticsProductName || '-' }}</strong></div>
                    <div><span>包裹跟踪号</span><strong>{{ detailPackage.logisticsNo || '-' }}</strong></div>
                    <div><span>物流产品跟踪号</span><strong>{{ detailPackage.logisticsProductNo || '-' }}</strong></div>
                    <div><span>仓库</span><strong>{{ detailPackage.warehouseName || '-' }}</strong></div>
                    <div><span>物流费用</span><strong>{{ moneyText(detailPackage.shippingFee, detailPackage.shippingFeeCurrency) }}</strong></div>
                    <div><span>尾程物流公司</span><strong>{{ detailPackage.lastMileCompany || '-' }}</strong></div>
                    <div><span>尾程跟踪号</span><strong>{{ detailPackage.lastMileLogisticsNo || '-' }}</strong></div>
                    <div><span>尾程物流产品</span><strong>{{ detailPackage.lastMileProductName || '-' }}</strong></div>
                    <div><span>尾程物流状态</span><strong>{{ detailPackage.lastMileStatus || '-' }}</strong></div>
                  </div>
                </section>
                <section class="detail-section">
                  <h3><el-icon><Clock /></el-icon>关键时间</h3>
                  <div class="detail-grid">
                    <div><span>订单创建</span><strong>{{ formatTime(detailPackage.orderStartedAt) }}</strong></div>
                    <div><span>订单修改</span><strong>{{ formatTime(detailPackage.orderModifiedAt) }}</strong></div>
                    <div><span>支付时间</span><strong>{{ formatTime(detailPackage.paidAt) }}</strong></div>
                    <div><span>最迟发货</span><strong>{{ formatTime(detailPackage.lastDeliveryAt) }}</strong></div>
                    <div><span>发货时间</span><strong>{{ formatTime(detailPackage.deliveredAt) }}</strong></div>
                    <div><span>退款时间</span><strong>{{ formatTime(detailPackage.refundedAt) }}</strong></div>
                    <div><span>结算时间</span><strong>{{ formatTime(detailPackage.settledAt) }}</strong></div>
                    <div><span>完成时间</span><strong>{{ formatTime(detailPackage.finishedAt) }}</strong></div>
                    <div><span>最近同步</span><strong>{{ formatTime(detailPackage.lastSyncedAt) }}</strong></div>
                  </div>
                </section>
              </div>
            </template>
          </div>
        </el-drawer>

        <el-dialog v-model="syncOpen" title="同步妙手包裹" width="680px" :close-on-click-modal="false">
          <el-alert title="未选择店铺或时间范围时，将同步当前妙手配置下的全部包裹，请根据数据量合理设置范围。" type="warning" :closable="false" show-icon class="sync-alert" />
          <el-form ref="syncFormRef" :model="syncForm" :rules="syncRules" label-position="top">
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="妙手配置" prop="miaoshouConfigId"><el-select v-model="syncForm.miaoshouConfigId" filterable style="width: 100%" @change="handleSyncConfigChange"><el-option v-for="config in miaoshouConfigs" :key="config.id" :label="config.configName" :value="config.id" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="平台" prop="platform"><el-input v-model="syncForm.platform" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="店铺范围"><el-select v-model="syncForm.shopIds" multiple collapse-tags collapse-tags-tooltip clearable filterable placeholder="不选择表示全部店铺" style="width: 100%"><el-option v-for="shop in syncShopOptions" :key="shop.remoteShopId" :label="`${shop.shopName}（${shop.siteCode}）`" :value="shop.remoteShopId" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="包裹状态"><el-select v-model="syncForm.appPackageStatus" clearable placeholder="全部状态" style="width: 100%"><el-option v-for="option in packageStatusOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="平台订单号"><el-input v-model="syncForm.platformOrderSns" placeholder="多个订单号使用英文逗号分隔" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="妙手修改时间"><el-date-picker v-model="syncForm.modifiedRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间" style="width: 100%" /></el-form-item></el-col>
            </el-row>
          </el-form>
          <template #footer><el-button @click="syncOpen = false">取消</el-button><el-button type="primary" :loading="syncing" @click="submitSync">开始同步</el-button></template>
        </el-dialog>

        <el-dialog v-model="syncRecordsOpen" title="包裹同步记录" width="980px">
          <el-table v-loading="syncRecordsLoading" :data="syncRecords">
            <el-table-column label="批次号" prop="batchNo" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="90" align="center"><template #default="scope"><el-tag :type="syncStatusMeta(scope.row.syncStatus).type">{{ syncStatusMeta(scope.row.syncStatus).label }}</el-tag></template></el-table-column>
            <el-table-column label="页数" prop="pageCount" width="65" align="right" />
            <el-table-column label="远端" prop="remoteCount" width="70" align="right" />
            <el-table-column label="新增" prop="insertedCount" width="70" align="right" />
            <el-table-column label="更新" prop="updatedCount" width="70" align="right" />
            <el-table-column label="未变化" prop="unchangedCount" width="80" align="right" />
            <el-table-column label="失败" prop="failedCount" width="65" align="right" />
            <el-table-column label="错误信息" prop="errorMessage" min-width="180" show-overflow-tooltip />
            <el-table-column label="开始时间" width="175"><template #default="scope">{{ formatTime(scope.row.startedAt) }}</template></el-table-column>
          </el-table>
          <div class="package-pagination"><span>共 {{ syncRecordTotal }} 条记录</span><el-pagination v-model:current-page="syncRecordQuery.pageIndex" v-model:page-size="syncRecordQuery.pageSize" background layout="prev, pager, next" :total="syncRecordTotal" @current-change="getSyncRecords" /></div>
        </el-dialog>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { Box, CircleCheck, Clock, Close, Download, Goods, Position, Refresh, RefreshLeft, Search, Shop, Tickets, Van, View, WarningFilled } from '@element-plus/icons-vue'
import { listMiaoshouConfig } from '@/api/admin/miaoshou-config'
import { listCrossBorderShops } from '@/api/cross-border/shop'
import { getCrossBorderPackage, getCrossBorderPackageSummary, listCrossBorderPackages, listCrossBorderPackageSyncRecords, syncCrossBorderPackages } from '@/api/cross-border/package'

const packageStatusOptions = [
  { value: 'unpaid', label: '未付款', type: 'info' },
  { value: 'wait_confirmed', label: '待审核', type: 'warning' },
  { value: 'wait_seller_send', label: '待发货', type: 'warning' },
  { value: 'wait_receiver_confirm', label: '已发货', type: 'primary' },
  { value: 'finished', label: '已完成', type: 'success' },
  { value: 'cancelled', label: '已关闭', type: 'info' },
  { value: 'returned', label: '已退款', type: 'danger' },
  { value: 'refunding', label: '售后中', type: 'danger' }
]

const fulfillmentOptions = [
  { value: 'platformFulfillment', label: '平台仓履约' },
  { value: 'sellerFulfillment', label: '卖家自发货' },
  { value: 'platformLogisticsFulfillment', label: '平台物流履约' }
]

export default {
  name: 'PackageCenter',
  setup() { return { Box, CircleCheck, Clock, Close, Download, Goods, Position, Refresh, RefreshLeft, Search, Shop, Tickets, Van, View, WarningFilled } },
  data() {
    return {
      packageStatusOptions,
      fulfillmentOptions,
      packages: [],
      total: 0,
      loading: false,
      lastRefresh: '',
      activeStatus: 'all',
      selectedPackages: [],
      summary: { total: 0, waitConfirmed: 0, waitSellerSend: 0, waitReceiverConfirm: 0, finished: 0, abnormal: 0 },
      queryParams: { keyword: '', remoteShopId: undefined, siteCode: '', fulfillmentType: '', dateRange: [], pageIndex: 1, pageSize: 10 },
      shops: [],
      miaoshouConfigs: [],
      detailOpen: false,
      detailLoading: false,
      detailPackage: null,
      syncOpen: false,
      syncing: false,
      syncForm: { miaoshouConfigId: undefined, platform: 'tiktok', shopIds: [], appPackageStatus: '', platformOrderSns: '', modifiedRange: [] },
      syncRules: {
        miaoshouConfigId: [{ required: true, message: '请选择妙手配置', trigger: 'change' }],
        platform: [{ required: true, message: '请输入平台编码', trigger: 'blur' }]
      },
      syncRecordsOpen: false,
      syncRecordsLoading: false,
      syncRecords: [],
      syncRecordTotal: 0,
      syncRecordQuery: { pageIndex: 1, pageSize: 10 }
    }
  },
  computed: {
    statusTabs() {
      return [
        { value: 'all', label: '全部包裹', count: this.summary.total },
        { value: 'wait_confirmed', label: '待审核', count: this.summary.waitConfirmed },
        { value: 'wait_seller_send', label: '待发货', count: this.summary.waitSellerSend },
        { value: 'wait_receiver_confirm', label: '已发货', count: this.summary.waitReceiverConfirm },
        { value: 'finished', label: '已完成', count: this.summary.finished },
        { value: 'abnormal', label: '异常', count: this.summary.abnormal }
      ]
    },
    siteOptions() {
      const sites = new Map()
      this.shops.forEach(shop => { if (shop.siteCode) sites.set(shop.siteCode, shop.siteName || shop.siteCode) })
      return [...sites.entries()].map(([value, label]) => ({ value, label: `${label}（${value}）` }))
    },
    syncShopOptions() {
      if (!this.syncForm.miaoshouConfigId) return this.shops
      return this.shops.filter(shop => shop.miaoshouConfigId === this.syncForm.miaoshouConfigId)
    }
  },
  created() {
    this.getList()
    this.getSummary()
    this.loadShops()
    this.loadMiaoshouConfigs()
  },
  methods: {
    nowText() {
      const now = new Date()
      const pad = value => String(value).padStart(2, '0')
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
    },
    formatTime(value) {
      if (!value) return '-'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19)
      const pad = item => String(item).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    moneyText(value, currency) {
      if (value === null || value === undefined || value === '') return '-'
      return `${currency || ''} ${Number(value).toFixed(2)}`.trim()
    },
    statusMeta(status) { return packageStatusOptions.find(item => item.value === status) || { label: status || '未知', type: 'info' } },
    packageStatusMeta(packageItem) {
      if (packageItem.applyTrackingNoFailCode) return { label: '运单申请失败', type: 'danger' }
      const metadata = this.statusMeta(packageItem.appPackageStatus)
      return { ...metadata, label: packageItem.appPackageStatusText || metadata.label }
    },
    syncStatusMeta(status) {
      const metadata = { success: { label: '成功', type: 'success' }, partial: { label: '部分成功', type: 'warning' }, failed: { label: '失败', type: 'danger' }, running: { label: '进行中', type: 'primary' }}
      return metadata[status] || { label: status || '未知', type: 'info' }
    },
    fulfillmentLabel(value) { return fulfillmentOptions.find(item => item.value === value)?.label || value || '-' },
    firstItem(packageItem) { return packageItem.items && packageItem.items.length ? packageItem.items[0] : null },
    totalQuantity(items) { return (items || []).reduce((total, item) => total + Number(item.quantity || 0), 0) },
    locationText(packageItem) { return [packageItem.consigneeState, packageItem.consigneeCity].filter(Boolean).join(' / ') || '-' },
    getList() {
      this.loading = true
      const range = this.queryParams.dateRange || []
      const params = {
        keyword: this.queryParams.keyword,
        remoteShopId: this.queryParams.remoteShopId,
        siteCode: this.queryParams.siteCode,
        fulfillmentType: this.queryParams.fulfillmentType,
        appPackageStatus: this.activeStatus === 'all' ? undefined : this.activeStatus,
        orderModifiedFrom: range[0],
        orderModifiedTo: range[1],
        pageIndex: this.queryParams.pageIndex,
        pageSize: this.queryParams.pageSize
      }
      return listCrossBorderPackages(params).then(response => {
        this.packages = response.data.list || []
        this.total = response.data.count || 0
        this.lastRefresh = this.nowText()
      }).finally(() => { this.loading = false })
    },
    getSummary() { return getCrossBorderPackageSummary().then(response => { this.summary = response.data || this.summary }) },
    refreshPackages() { return Promise.all([this.getList(), this.getSummary()]).then(() => this.msgSuccess('包裹数据已刷新')) },
    handleQuery() { this.queryParams.pageIndex = 1; this.getList() },
    handleStatusTab() { this.queryParams.pageIndex = 1; this.getList() },
    switchStatus(status) { this.activeStatus = status; this.handleStatusTab() },
    resetQuery() {
      const pageSize = this.queryParams.pageSize
      this.queryParams = { keyword: '', remoteShopId: undefined, siteCode: '', fulfillmentType: '', dateRange: [], pageIndex: 1, pageSize }
      this.activeStatus = 'all'
      this.getList()
    },
    handlePageSizeChange() { this.queryParams.pageIndex = 1; this.getList() },
    handleSelectionChange(rows) { this.selectedPackages = rows },
    loadShops() { return listCrossBorderShops({ pageIndex: 1, pageSize: 100, localStatus: 1 }).then(response => { this.shops = response.data.list || [] }) },
    loadMiaoshouConfigs() {
      return listMiaoshouConfig({ pageIndex: 1, pageSize: 100, status: 1 }).then(response => {
        this.miaoshouConfigs = response.data.list || []
        if (!this.syncForm.miaoshouConfigId && this.miaoshouConfigs.length) this.syncForm.miaoshouConfigId = this.miaoshouConfigs[0].id
      })
    },
    openDetail(packageItem) {
      this.detailOpen = true
      this.detailPackage = packageItem
      this.loadPackageDetail(packageItem.id, false)
    },
    loadPackageDetail(id, showMessage) {
      this.detailLoading = true
      return getCrossBorderPackage(id).then(response => {
        const detail = response.data || {}
        this.detailPackage = detail
        const index = this.packages.findIndex(item => item.id === id)
        if (index >= 0) {
          const packageData = { ...detail }
          delete packageData.remoteRefreshed
          delete packageData.refreshWarning
          this.packages.splice(index, 1, { ...this.packages[index], ...packageData })
        }
        if (showMessage) {
          detail.remoteRefreshed ? this.msgSuccess('包裹详情已从妙手刷新') : this.msgError(detail.refreshWarning || '未能获取妙手最新详情')
        }
      }).finally(() => { this.detailLoading = false })
    },
    refreshDetail() {
      if (!this.detailPackage || !this.detailPackage.id) return
      this.loadPackageDetail(this.detailPackage.id, true)
    },
    openSync() {
      if (!this.miaoshouConfigs.length) { this.msgError('没有已启用的妙手配置'); return }
      this.syncForm = { ...this.syncForm, miaoshouConfigId: this.syncForm.miaoshouConfigId || this.miaoshouConfigs[0].id, platform: 'tiktok', shopIds: [], appPackageStatus: '', platformOrderSns: '', modifiedRange: [] }
      this.syncOpen = true
      this.$nextTick(() => this.$refs.syncFormRef?.clearValidate())
    },
    handleSyncConfigChange() { this.syncForm.shopIds = [] },
    submitSync() {
      this.$refs.syncFormRef.validate(valid => {
        if (!valid) return
        const range = this.syncForm.modifiedRange || []
        const payload = {
          miaoshouConfigId: this.syncForm.miaoshouConfigId,
          platform: this.syncForm.platform,
          shopIds: this.syncForm.shopIds,
          appPackageStatus: this.syncForm.appPackageStatus,
          platformOrderSns: this.syncForm.platformOrderSns,
          gmtModifiedFrom: range[0] || '',
          gmtModifiedTo: range[1] || '',
          triggerType: 'manual'
        }
        this.syncing = true
        syncCrossBorderPackages(payload).then(response => {
          const result = response.data || {}
          const message = `同步完成：远端 ${result.remoteCount || 0}，新增 ${result.insertedCount || 0}，更新 ${result.updatedCount || 0}，未变化 ${result.unchangedCount || 0}，失败 ${result.failedCount || 0}`
          result.status === 'failed' ? this.msgError(message) : this.msgSuccess(message)
          this.syncOpen = false
          return Promise.all([this.getList(), this.getSummary()])
        }).finally(() => { this.syncing = false })
      })
    },
    openSyncRecords() { this.syncRecordsOpen = true; this.syncRecordQuery.pageIndex = 1; this.getSyncRecords() },
    getSyncRecords() {
      this.syncRecordsLoading = true
      return listCrossBorderPackageSyncRecords(this.syncRecordQuery).then(response => {
        this.syncRecords = response.data.list || []
        this.syncRecordTotal = response.data.count || 0
      }).finally(() => { this.syncRecordsLoading = false })
    },
    exportSelection() {
      if (!this.selectedPackages.length) return
      const headers = ['包裹号', '妙手包裹ID', '平台订单号', '店铺', '站点', '国家', '物流公司', '物流渠道', '运单号', '订单金额', '币种', '包裹状态', '妙手修改时间']
      const rows = this.selectedPackages.map(item => [item.appPackageNo, item.remotePackageId, item.platformOrderSn, item.shopName || item.shopNick, item.siteCode, item.consigneeCountryName || item.consigneeCountry, item.logisticsCompany, item.logisticsProductName, item.logisticsNo, item.orderAmount, item.currency, this.packageStatusMeta(item).label, this.formatTime(item.orderModifiedAt)])
      const escapeCell = value => {
        let text = String(value ?? '')
        if (/^[=+\-@]/.test(text)) text = `'${text}`
        return `"${text.replace(/"/g, '""')}"`
      }
      const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n')
      const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `包裹中心_${this.nowText().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      this.msgSuccess(`已导出 ${this.selectedPackages.length} 个包裹`)
    }
  }
}
</script>

<style lang="scss" scoped>
.package-page { min-height: calc(100vh - 110px); }
.package-heading { min-height: 112px; margin-bottom: 14px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: linear-gradient(118deg, #101828 0%, #1d2d52 55%, #17486c 100%); border-radius: 14px; box-shadow: 0 8px 28px rgba(20, 37, 70, .18); overflow: hidden; position: relative; }
.package-heading::after { content: ''; position: absolute; width: 230px; height: 230px; right: 18%; top: -156px; border: 36px solid rgba(255, 255, 255, .045); border-radius: 50%; }
.package-heading > * { position: relative; z-index: 1; }.package-heading h1 { margin: 3px 0 5px; font-size: 24px; }.package-heading p { margin: 0; color: rgba(255, 255, 255, .67); font-size: 13px; }.eyebrow { color: #78c6ff; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
.heading-actions { display: flex; align-items: center; gap: 8px; }.heading-actions > span { margin-right: 8px; color: #b9cae4; font-size: 11px; }.heading-actions > span i { display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: #34d399; border-radius: 50%; }
.metric-row { margin-bottom: 14px; }.metric-card { width: 100%; min-height: 106px; padding: 18px; display: flex; align-items: center; gap: 14px; color: inherit; text-align: left; background: #fff; border: 1px solid #edf0f5; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); cursor: pointer; transition: transform .18s, box-shadow .18s; }.metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(23, 34, 66, .09); }.metric-card > span:last-child { display: flex; flex-direction: column; }.metric-card small { color: #667085; font-size: 12px; }.metric-card strong { margin: 2px 0; color: #172033; font-size: 27px; }.metric-card em { color: #98a2b3; font-size: 10px; font-style: normal; }.metric-icon { flex: 0 0 auto; width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; font-size: 21px; }.metric-icon.orange { color: #ea580c; background: #fff1e7; }.metric-icon.blue { color: #2563eb; background: #eaf1ff; }.metric-icon.purple { color: #7c3aed; background: #f1eafe; }.metric-icon.green { color: #059669; background: #e7f8f1; }.metric-icon.red { color: #dc2626; background: #feecec; }.exception-card { border-color: #fee2e2; }
.package-card { border: 0; border-radius: 13px; }.status-tabs :deep(.el-tabs__header) { margin-bottom: 13px; }.status-tabs :deep(.el-tabs__item) b { min-width: 20px; margin-left: 6px; padding: 1px 6px; color: #64748b; background: #eef2f6; border-radius: 9px; font-size: 10px; }.status-tabs :deep(.is-active) b { color: #2563eb; background: #eaf1ff; }
.package-filter { padding: 14px 14px 0; display: flex; flex-wrap: wrap; background: #f8fafc; border: 1px solid #edf1f5; border-radius: 10px; }.package-filter :deep(.el-input) { width: 210px; }.package-filter :deep(.el-select) { width: 165px; }.package-filter :deep(.el-date-editor) { width: 250px; }.package-toolbar { min-height: 58px; display: flex; align-items: center; justify-content: space-between; }.package-toolbar span { color: #98a2b3; font-size: 12px; }
.package-table :deep(th.el-table__cell) { height: 46px; color: #667085; background: #f7f8fb; }.package-table :deep(td.el-table__cell) { padding: 11px 0; }.package-identity, .product-cell > div:last-child, .shop-cell, .location-cell, .logistics-cell, .money-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.package-identity button { max-width: 200px; padding: 0; overflow: hidden; color: #2563eb; background: none; border: 0; font-weight: 700; text-align: left; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }.package-identity span, .product-cell span, .shop-cell span, .location-cell span, .logistics-cell span, .money-cell span { color: #667085; font-size: 11px; }.package-identity small, .product-cell small, .logistics-cell small { color: #98a2b3; font-size: 10px; }.product-cell { display: flex; align-items: center; gap: 10px; }.product-cell strong { max-width: 180px; overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.product-thumb { flex: 0 0 auto; width: 42px; height: 42px; border-radius: 8px; overflow: hidden; }.image-fallback { width: 100%; height: 100%; display: grid; place-items: center; color: #64748b; background: #eef2f6; }.shop-cell strong, .location-cell strong, .logistics-cell strong, .money-cell strong { color: #344054; font-size: 12px; }.shop-cell i { margin-right: 6px; padding: 2px 4px; color: #2563eb; background: #eef4ff; border-radius: 4px; font-style: normal; }.money-cell { text-align: right; }.empty-text { color: #98a2b3; font-size: 12px; }.abnormal-mark { margin-top: 5px; color: #dc2626; font-size: 10px; }.abnormal-mark .el-icon { margin-right: 3px; vertical-align: -1px; }.package-pagination { padding-top: 17px; display: flex; justify-content: space-between; align-items: center; color: #98a2b3; font-size: 12px; }
.package-detail { min-height: 100%; }.detail-head { min-height: 178px; padding: 36px 30px 24px; color: #fff; background: linear-gradient(130deg, #172033, #253762); position: relative; }.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: #fff; background: rgba(255, 255, 255, .08); border: 0; border-radius: 50%; cursor: pointer; }.detail-head-top { display: flex; align-items: center; justify-content: space-between; gap: 20px; }.detail-head-top span { color: #9cb9ec; font-size: 11px; }.detail-head h2 { margin: 5px 0 8px; font-size: 22px; }.detail-head > p { margin: 0 0 14px; color: #b8c7e0; font-size: 12px; }.detail-body { padding: 25px 30px 50px; }.detail-refresh-bar { min-height: 38px; margin-bottom: 14px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }.detail-refresh-bar > div { display: flex; align-items: center; gap: 10px; }.detail-refresh-bar span { color: #98a2b3; font-size: 11px; }.detail-refresh-alert { margin-bottom: 18px; }.detail-section { margin-bottom: 28px; }.detail-section h3 { margin: 0 0 15px; display: flex; align-items: center; gap: 7px; color: #1d2939; font-size: 14px; }.detail-products { display: flex; flex-direction: column; gap: 10px; }.detail-product { padding: 11px; display: grid; grid-template-columns: 52px 1fr auto; align-items: center; gap: 12px; background: #f8fafc; border-radius: 10px; }.detail-product-image { width: 52px; height: 52px; overflow: hidden; border-radius: 8px; }.detail-product > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.detail-product strong { overflow: hidden; color: #344054; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }.detail-product span, .detail-product small { color: #98a2b3; font-size: 10px; }.detail-product b, .gift-row b { color: #475467; }.gift-row { padding: 10px 12px; display: grid; grid-template-columns: 1fr 180px auto; gap: 10px; border-bottom: 1px solid #edf0f5; color: #475467; font-size: 12px; }.gift-row small { color: #98a2b3; }.detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 24px; }.detail-grid > div { display: flex; flex-direction: column; gap: 5px; }.detail-grid .full { grid-column: 1 / -1; }.detail-grid span { color: #98a2b3; font-size: 11px; }.detail-grid strong { color: #475467; font-size: 12px; font-weight: 500; word-break: break-all; }.sync-alert { margin-bottom: 18px; }
@media (max-width: 1200px) { .heading-actions > span { display: none; }.package-filter :deep(.el-date-editor) { width: 220px; } }
@media (max-width: 768px) { .package-heading { align-items: flex-start; gap: 15px; }.package-heading p, .eyebrow { display: none; }.heading-actions { flex-wrap: wrap; justify-content: flex-end; }.metric-card { min-height: 92px; padding: 13px; }.metric-icon { width: 38px; height: 38px; }.package-filter { display: grid; grid-template-columns: 1fr 1fr; }.package-filter :deep(.el-form-item), .package-filter :deep(.el-input), .package-filter :deep(.el-select), .package-filter :deep(.el-date-editor) { width: 100%; margin-right: 0; }.filter-buttons { grid-column: 1 / -1; }.detail-grid { grid-template-columns: 1fr; }.detail-grid .full { grid-column: auto; }:deep(.el-drawer) { width: 100% !important; } }
</style>
