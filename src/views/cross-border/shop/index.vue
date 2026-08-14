<template>
  <BasicLayout>
    <template #wrapper>
      <div class="shop-page">
        <section class="page-heading">
          <div><div class="eyebrow">TIKTOK SHOP OPERATIONS</div><h1>店铺管理</h1><p>集中管理妙手店铺、授权状态与本地运营信息</p></div>
          <el-button v-permisaction="['admin:crossBorder:shop:sync']" type="primary" :icon="Refresh" @click="handleSync">从妙手同步</el-button>
        </section>

        <el-row :gutter="14" class="summary-row">
          <el-col :xs="12" :md="6"><div class="summary-card summary-card--blue"><div class="summary-icon"><el-icon><Shop /></el-icon></div><div><div class="summary-label">店铺总数</div><div class="summary-value">{{ summary.total }}</div><div class="summary-caption">覆盖 {{ summary.sites }} 个站点</div></div></div></el-col>
          <el-col :xs="12" :md="6"><div class="summary-card summary-card--green"><div class="summary-icon"><el-icon><CircleCheckFilled /></el-icon></div><div><div class="summary-label">正常运营</div><div class="summary-value">{{ summary.active }}</div><div class="summary-caption">{{ summary.activeRate }}% 运营中</div></div></div></el-col>
          <el-col :xs="12" :md="6"><div class="summary-card summary-card--orange"><div class="summary-icon"><el-icon><WarningFilled /></el-icon></div><div><div class="summary-label">授权过期</div><div class="summary-value">{{ summary.expired }}</div><div class="summary-caption">另有 {{ summary.expiring }} 家即将过期</div></div></div></el-col>
          <el-col :xs="12" :md="6"><div class="summary-card summary-card--slate"><div class="summary-icon"><el-icon><CircleCloseFilled /></el-icon></div><div><div class="summary-label">已停用</div><div class="summary-value">{{ summary.disabled }}</div><div class="summary-caption">不参与后续同步任务</div></div></div></el-col>
        </el-row>

        <el-card class="content-card" shadow="never">
          <el-form ref="queryForm" :model="queryParams" :inline="true" class="filter-form">
            <el-form-item label="店铺搜索" prop="keyword"><el-input v-model="queryParams.keyword" placeholder="店铺名称 / 编号" clearable :prefix-icon="Search" @keyup.enter="handleQuery" /></el-form-item>
            <el-form-item label="所属站点" prop="siteCode"><el-select v-model="queryParams.siteCode" placeholder="全部站点" clearable filterable><el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" /></el-select></el-form-item>
            <el-form-item label="店铺状态" prop="status"><el-select v-model="queryParams.status" placeholder="全部状态" clearable><el-option label="正常运营" value="active" /><el-option label="已停用" value="disabled" /></el-select></el-form-item>
            <el-form-item label="授权状态" prop="authStatus"><el-select v-model="queryParams.authStatus" placeholder="全部状态" clearable><el-option label="授权正常" value="valid" /><el-option label="即将过期" value="expiring" /><el-option label="授权过期" value="expired" /><el-option label="未知" value="unknown" /></el-select></el-form-item>
            <el-form-item class="filter-actions"><el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button><el-button :icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
          </el-form>

          <div class="list-toolbar">
            <div>
              <el-button v-permisaction="['admin:crossBorder:shop:sync']" type="primary" :icon="Refresh" @click="handleSync">同步店铺</el-button>
              <el-button v-permisaction="['admin:crossBorder:shop:syncRecords']" @click="openSyncRecords">同步记录</el-button>
              <el-button v-permisaction="['admin:crossBorder:shop:status']" :icon="CircleCheck" :disabled="!selectedIds.length" @click="handleBatchStatus('active')">批量启用</el-button>
              <el-button v-permisaction="['admin:crossBorder:shop:status']" :icon="CircleClose" :disabled="!selectedIds.length" @click="handleBatchStatus('disabled')">批量停用</el-button>
            </div>
            <span class="selection-tip">已选择 {{ selectedIds.length }} 项</span>
          </div>

          <el-table v-loading="loading" :data="shops" row-key="id" class="shop-table" @selection-change="handleSelectionChange">
            <template #empty><el-empty description="暂无店铺，请先从妙手同步" :image-size="90" /></template>
            <el-table-column type="selection" width="46" align="center" reserve-selection />
            <el-table-column label="店铺信息" min-width="250" fixed="left"><template #default="scope"><div class="shop-identity"><div class="shop-avatar" :style="{ background: scope.row.color }">{{ scope.row.initials }}</div><div class="shop-copy"><button class="shop-name" type="button" @click="openDetail(scope.row)">{{ scope.row.shopName }}</button><span>{{ scope.row.shopCode }}</span></div></div></template></el-table-column>
            <el-table-column label="平台" prop="platform" width="90" />
            <el-table-column label="站点 / 币种" width="145"><template #default="scope"><div class="site-cell"><span class="site-flag">{{ scope.row.siteCode }}</span><div><strong>{{ scope.row.siteName || scope.row.siteCode }}</strong><small>{{ scope.row.currency || '-' }}</small></div></div></template></el-table-column>
            <el-table-column label="负责人" min-width="150"><template #default="scope"><div class="owner-cell"><strong>{{ scope.row.owner || '未设置' }}</strong><span>{{ scope.row.phone || '暂无联系方式' }}</span></div></template></el-table-column>
            <el-table-column label="远端状态" prop="remoteStatus" width="110" align="center" />
            <el-table-column label="授权状态" width="120" align="center"><template #default="scope"><el-tag :type="authMeta(scope.row.authStatus).type" effect="light" round>{{ authMeta(scope.row.authStatus).label }}</el-tag></template></el-table-column>
            <el-table-column label="店铺状态" width="118" align="center"><template #default="scope"><el-switch v-permisaction="['admin:crossBorder:shop:status']" :model-value="scope.row.status === 'active'" inline-prompt active-text="启用" inactive-text="停用" @change="handleStatusChange(scope.row)" /></template></el-table-column>
            <el-table-column label="最近同步" min-width="170"><template #default="scope"><div class="sync-cell"><el-icon><Clock /></el-icon><span>{{ scope.row.lastSync || '尚未同步' }}</span></div></template></el-table-column>
            <el-table-column label="操作" width="150" align="center" fixed="right"><template #default="scope"><el-button type="primary" link :icon="View" @click="openDetail(scope.row)">查看</el-button><el-button v-permisaction="['admin:crossBorder:shop:edit']" type="primary" link :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button></template></el-table-column>
          </el-table>

          <div class="pagination-wrap"><span>共 {{ total }} 家店铺</span><el-pagination v-model:current-page="queryParams.pageIndex" v-model:page-size="queryParams.pageSize" background layout="sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50, 100]" :total="total" @current-change="getList" @size-change="handlePageSizeChange" /></div>
        </el-card>

        <el-dialog v-model="editorOpen" title="编辑店铺运营信息" width="720px" :close-on-click-modal="false" destroy-on-close>
          <el-alert title="店铺名称、平台、站点和授权信息来自妙手，只能通过同步更新。" type="info" :closable="false" show-icon class="form-alert" />
          <el-form ref="editorForm" :model="form" :rules="rules" label-position="top" class="shop-form">
            <div class="form-section-title">店铺信息</div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="店铺名称"><el-input v-model="form.shopName" disabled /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="店铺编号" prop="shopCode"><el-input v-model="form.shopCode" maxlength="128" /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="TikTok 站点"><el-input :model-value="`${form.siteName || '-'} (${form.siteCode || '-'})`" disabled /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="默认币种" prop="currency"><el-input v-model="form.currency" maxlength="3" /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="店铺状态" prop="localStatus"><el-radio-group v-model="form.localStatus"><el-radio-button :value="1">正常运营</el-radio-button><el-radio-button :value="2">停用</el-radio-button></el-radio-group></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="授权状态"><el-input :model-value="authMeta(form.authStatus).label" disabled /></el-form-item></el-col>
            </el-row>
            <div class="form-section-title">负责人信息</div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="8"><el-form-item label="负责人" prop="ownerName"><el-input v-model="form.ownerName" /></el-form-item></el-col>
              <el-col :xs="24" :sm="8"><el-form-item label="联系电话" prop="contactPhone"><el-input v-model="form.contactPhone" /></el-form-item></el-col>
              <el-col :xs="24" :sm="8"><el-form-item label="联系邮箱" prop="contactEmail"><el-input v-model="form.contactEmail" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="500" show-word-limit /></el-form-item></el-col>
            </el-row>
          </el-form>
          <template #footer><el-button @click="editorOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitForm">保存</el-button></template>
        </el-dialog>

        <el-dialog v-model="syncOpen" title="从妙手同步店铺" width="580px" :close-on-click-modal="false" destroy-on-close>
          <el-alert title="同步只读取妙手店铺资料并幂等写入本地数据库，不会修改妙手侧数据。" type="info" :closable="false" show-icon class="form-alert" />
          <el-form ref="syncFormRef" :model="syncForm" :rules="syncRules" label-position="top">
            <el-form-item label="妙手配置" prop="miaoshouConfigId"><el-select v-model="syncForm.miaoshouConfigId" placeholder="请选择已启用的配置" filterable style="width: 100%"><el-option v-for="config in miaoshouConfigs" :key="config.id" :label="config.configName" :value="config.id" /></el-select></el-form-item>
            <el-form-item label="平台" prop="platform"><el-select v-model="syncForm.platform" style="width: 100%"><el-option label="TikTok Shop" value="tiktok" /></el-select></el-form-item>
            <el-form-item label="同步站点" prop="sites"><el-select v-model="syncForm.sites" multiple filterable collapse-tags placeholder="请选择一个或多个站点" style="width: 100%"><el-option v-for="site in siteOptions" :key="site.value" :label="`${site.label} (${site.value})`" :value="site.value" /></el-select></el-form-item>
          </el-form>
          <template #footer><el-button @click="syncOpen = false">取消</el-button><el-button type="primary" :loading="syncing" @click="submitSync">开始同步</el-button></template>
        </el-dialog>

        <el-dialog v-model="syncRecordsOpen" title="店铺同步记录" width="980px" destroy-on-close>
          <el-table v-loading="syncRecordsLoading" :data="syncRecords" border stripe>
            <el-table-column label="批次号" prop="batchNo" min-width="210" show-overflow-tooltip />
            <el-table-column label="平台 / 站点" width="135"><template #default="scope">{{ scope.row.platform }} / {{ scope.row.siteCode }}</template></el-table-column>
            <el-table-column label="状态" width="90" align="center"><template #default="scope"><el-tag :type="syncStatusMeta(scope.row.syncStatus).type">{{ syncStatusMeta(scope.row.syncStatus).label }}</el-tag></template></el-table-column>
            <el-table-column label="远端" prop="remoteCount" width="70" align="right" /><el-table-column label="新增" prop="insertedCount" width="70" align="right" /><el-table-column label="更新" prop="updatedCount" width="70" align="right" /><el-table-column label="未变化" prop="unchangedCount" width="80" align="right" />
            <el-table-column label="错误信息" prop="errorMessage" min-width="180" show-overflow-tooltip />
            <el-table-column label="开始时间" width="175"><template #default="scope">{{ parseTime(scope.row.startedAt) }}</template></el-table-column>
          </el-table>
          <div class="pagination-wrap"><span>共 {{ syncRecordTotal }} 条记录</span><el-pagination v-model:current-page="syncRecordQuery.pageIndex" v-model:page-size="syncRecordQuery.pageSize" background layout="prev, pager, next" :total="syncRecordTotal" @current-change="getSyncRecords" /></div>
        </el-dialog>

        <el-drawer v-model="detailOpen" size="560px" :with-header="false" destroy-on-close>
          <template v-if="detailShop">
            <div class="drawer-hero"><button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button><div class="drawer-shop-avatar" :style="{ background: detailShop.color }">{{ detailShop.initials }}</div><div class="drawer-shop-title"><span>{{ detailShop.shopCode }}</span><h2>{{ detailShop.shopName }}</h2><div><el-tag :type="detailShop.status === 'active' ? 'success' : 'info'" round>{{ statusLabel(detailShop.status) }}</el-tag><el-tag :type="authMeta(detailShop.authStatus).type" round>{{ authMeta(detailShop.authStatus).label }}</el-tag></div></div></div>
            <div class="drawer-content">
              <section class="detail-section"><h3>平台资料</h3><div class="detail-grid"><div><span>妙手店铺 ID</span><strong>{{ detailShop.remoteShopId }}</strong></div><div><span>平台</span><strong>{{ detailShop.platform }}</strong></div><div><span>所属站点</span><strong>{{ detailShop.siteName }}（{{ detailShop.siteCode }}）</strong></div><div><span>远端状态</span><strong>{{ detailShop.remoteStatus || '-' }}</strong></div><div><span>店铺昵称</span><strong>{{ detailShop.shopNick || '-' }}</strong></div><div><span>默认币种</span><strong>{{ detailShop.currency || '-' }}</strong></div></div></section>
              <section class="detail-section"><h3>负责人信息</h3><div class="detail-grid"><div><span>负责人</span><strong>{{ detailShop.owner || '-' }}</strong></div><div><span>联系电话</span><strong>{{ detailShop.phone || '-' }}</strong></div><div class="full"><span>联系邮箱</span><strong>{{ detailShop.email || '-' }}</strong></div></div></section>
              <section class="detail-section"><h3>授权与同步</h3><div class="timeline-list"><div><i class="success" /><span>最近同步</span><strong>{{ detailShop.lastSync || '尚未同步' }}</strong></div><div><i :class="detailShop.authStatus" /><span>授权有效期</span><strong>{{ detailShop.authExpiry || '未知' }}</strong></div><div><i /><span>最后授权</span><strong>{{ detailShop.lastAuth || '未知' }}</strong></div><div><i /><span>创建时间</span><strong>{{ parseTime(detailShop.createdAt) }}</strong></div></div></section>
              <section class="detail-section"><h3>运营备注</h3><p class="detail-note">{{ detailShop.remark || '暂无备注' }}</p></section>
            </div>
            <div class="drawer-footer"><el-button v-permisaction="['admin:crossBorder:shop:edit']" type="primary" @click="handleEdit(detailShop)">编辑运营资料</el-button></div>
          </template>
        </el-drawer>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { ElMessageBox } from 'element-plus'
import { CircleCheck, CircleCheckFilled, CircleClose, CircleCloseFilled, Clock, Close, Edit, Refresh, Search, Shop, View, WarningFilled } from '@element-plus/icons-vue'
import { listMiaoshouConfig } from '@/api/admin/miaoshou-config'
import { batchUpdateCrossBorderShopStatus, getCrossBorderShop, getCrossBorderShopSummary, listCrossBorderShops, listCrossBorderShopSyncRecords, syncCrossBorderShops, updateCrossBorderShop, updateCrossBorderShopStatus } from '@/api/cross-border/shop'

const siteOptions = [
  { value: 'US', label: '美国' }, { value: 'GB', label: '英国' }, { value: 'DE', label: '德国' }, { value: 'FR', label: '法国' }, { value: 'ES', label: '西班牙' }, { value: 'IT', label: '意大利' },
  { value: 'MY', label: '马来西亚' }, { value: 'PH', label: '菲律宾' }, { value: 'TH', label: '泰国' }, { value: 'VN', label: '越南' }, { value: 'ID', label: '印度尼西亚' }, { value: 'SG', label: '新加坡' },
  { value: 'BR', label: '巴西' }, { value: 'MX', label: '墨西哥' }, { value: 'JP', label: '日本' }, { value: 'TIKTOKGLOBAL', label: 'TikTok Global' }
]

export default {
  name: 'ShopManage',
  setup() { return { CircleCheck, CircleCheckFilled, CircleClose, CircleCloseFilled, Clock, Close, Edit, Refresh, Search, Shop, View, WarningFilled } },
  data() {
    return {
      siteOptions,
      shops: [], total: 0, loading: false, saving: false, selectedIds: [],
      summary: { total: 0, sites: 0, active: 0, disabled: 0, expired: 0, expiring: 0, activeRate: 0 },
      queryParams: { keyword: '', siteCode: '', status: '', authStatus: '', pageIndex: 1, pageSize: 10 },
      editorOpen: false, detailOpen: false, detailShop: null, form: {},
      syncOpen: false, syncing: false, miaoshouConfigs: [], syncForm: { miaoshouConfigId: undefined, platform: 'tiktok', sites: ['US'] },
      syncRecordsOpen: false, syncRecordsLoading: false, syncRecords: [], syncRecordTotal: 0, syncRecordQuery: { pageIndex: 1, pageSize: 10 },
      rules: {
        shopCode: [{ required: true, message: '请输入店铺编号', trigger: 'blur' }],
        localStatus: [{ required: true, message: '请选择店铺状态', trigger: 'change' }],
        contactEmail: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }]
      },
      syncRules: {
        miaoshouConfigId: [{ required: true, message: '请选择妙手配置', trigger: 'change' }],
        platform: [{ required: true, message: '请选择平台', trigger: 'change' }],
        sites: [{ type: 'array', required: true, min: 1, message: '至少选择一个站点', trigger: 'change' }]
      }
    }
  },
  created() {
    this.getList()
    this.getSummary()
    this.loadMiaoshouConfigs()
  },
  methods: {
    authMeta(status) {
      const metadata = {
        valid: { label: '授权正常', type: 'success' },
        expiring: { label: '即将过期', type: 'warning' },
        expired: { label: '授权过期', type: 'danger' },
        unknown: { label: '未知', type: 'info' }
      }
      return metadata[status] || { label: '未知', type: 'info' }
    },
    syncStatusMeta(status) {
      const metadata = {
        success: { label: '成功', type: 'success' },
        failed: { label: '失败', type: 'danger' },
        running: { label: '进行中', type: 'warning' }
      }
      return metadata[status] || { label: status || '未知', type: 'info' }
    },
    statusLabel(status) { return status === 'active' ? '正常运营' : '已停用' },
    getList() {
      this.loading = true
      const params = { ...this.queryParams, localStatus: this.queryParams.status === 'active' ? 1 : (this.queryParams.status === 'disabled' ? 2 : undefined) }
      delete params.status
      return listCrossBorderShops(params).then(response => { this.shops = response.data.list || []; this.total = response.data.count || 0 }).finally(() => { this.loading = false })
    },
    getSummary() { return getCrossBorderShopSummary().then(response => { this.summary = response.data || this.summary }) },
    loadMiaoshouConfigs() {
      return listMiaoshouConfig({ pageIndex: 1, pageSize: 100, status: 1 }).then(response => {
        this.miaoshouConfigs = response.data.list || []
        if (!this.syncForm.miaoshouConfigId && this.miaoshouConfigs.length) this.syncForm.miaoshouConfigId = this.miaoshouConfigs[0].id
      })
    },
    handleQuery() { this.queryParams.pageIndex = 1; this.getList() },
    resetQuery() { const pageSize = this.queryParams.pageSize; this.queryParams = { keyword: '', siteCode: '', status: '', authStatus: '', pageIndex: 1, pageSize }; this.getList() },
    handlePageSizeChange() { this.queryParams.pageIndex = 1; this.getList() },
    handleSelectionChange(selection) { this.selectedIds = selection.map(shop => shop.id) },
    handleEdit(shop) {
      this.detailOpen = false
      getCrossBorderShop(shop.id).then(response => {
        const data = response.data
        this.form = { ...data, ownerName: data.ownerName || data.owner || '', contactPhone: data.contactPhone || data.phone || '', contactEmail: data.contactEmail || data.email || '' }
        this.editorOpen = true
        this.$nextTick(() => this.$refs.editorForm?.clearValidate())
      })
    },
    submitForm() {
      this.$refs.editorForm.validate(valid => {
        if (!valid) return
        this.saving = true
        const payload = { shopCode: this.form.shopCode, currency: String(this.form.currency || '').toUpperCase(), ownerName: this.form.ownerName, contactPhone: this.form.contactPhone, contactEmail: this.form.contactEmail, localStatus: this.form.localStatus, remark: this.form.remark }
        updateCrossBorderShop(this.form.id, payload).then(() => { this.msgSuccess('店铺运营信息已更新'); this.editorOpen = false; return Promise.all([this.getList(), this.getSummary()]) }).finally(() => { this.saving = false })
      })
    },
    openDetail(shop) { this.detailShop = shop; this.detailOpen = true; getCrossBorderShop(shop.id).then(response => { this.detailShop = response.data }) },
    handleStatusChange(shop) {
      const nextStatus = shop.status === 'active' ? 'disabled' : 'active'
      const localStatus = nextStatus === 'active' ? 1 : 2
      ElMessageBox.confirm(`确认${nextStatus === 'active' ? '启用' : '停用'}店铺“${shop.shopName}”吗？`, '店铺状态确认', { type: 'warning' })
        .then(() => updateCrossBorderShopStatus(shop.id, localStatus)).then(() => { this.msgSuccess('店铺状态已更新'); return Promise.all([this.getList(), this.getSummary()]) }).catch(() => {})
    },
    handleBatchStatus(status) {
      const label = status === 'active' ? '启用' : '停用'
      const localStatus = status === 'active' ? 1 : 2
      ElMessageBox.confirm(`确认批量${label}选中的 ${this.selectedIds.length} 家店铺吗？`, `批量${label}`, { type: 'warning' })
        .then(() => batchUpdateCrossBorderShopStatus(this.selectedIds, localStatus)).then(() => { this.msgSuccess(`已批量${label} ${this.selectedIds.length} 家店铺`); this.selectedIds = []; return Promise.all([this.getList(), this.getSummary()]) }).catch(() => {})
    },
    handleSync() {
      if (!this.miaoshouConfigs.length) { this.msgError('没有已启用的妙手配置'); return }
      this.syncForm = { miaoshouConfigId: this.syncForm.miaoshouConfigId || this.miaoshouConfigs[0].id, platform: 'tiktok', sites: this.syncForm.sites?.length ? this.syncForm.sites : ['US'] }
      this.syncOpen = true
      this.$nextTick(() => this.$refs.syncFormRef?.clearValidate())
    },
    submitSync() {
      this.$refs.syncFormRef.validate(valid => {
        if (!valid) return
        this.syncing = true
        syncCrossBorderShops({ ...this.syncForm, triggerType: 'manual' }).then(response => {
          const result = response.data || {}
          const message = `同步完成：新增 ${result.insertedCount || 0}，更新 ${result.updatedCount || 0}，未变化 ${result.unchangedCount || 0}，失败 ${result.failedCount || 0}`
          result.failedCount ? this.msgError(message) : this.msgSuccess(message)
          this.syncOpen = false
          return Promise.all([this.getList(), this.getSummary()])
        }).finally(() => { this.syncing = false })
      })
    },
    openSyncRecords() { this.syncRecordsOpen = true; this.syncRecordQuery.pageIndex = 1; this.getSyncRecords() },
    getSyncRecords() {
      this.syncRecordsLoading = true
      return listCrossBorderShopSyncRecords(this.syncRecordQuery).then(response => { this.syncRecords = response.data.list || []; this.syncRecordTotal = response.data.count || 0 }).finally(() => { this.syncRecordsLoading = false })
    }
  }
}
</script>

<style lang="scss" scoped>
.shop-page { min-height: calc(100vh - 110px); }
.page-heading { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; margin-bottom: 14px; color: #fff; background: linear-gradient(118deg, #151a2d, #242b50 53%, #243d68); border-radius: 14px; box-shadow: 0 8px 28px rgba(30, 41, 81, .18); overflow: hidden; position: relative; }
.page-heading::after { content: ''; position: absolute; width: 210px; height: 210px; right: 12%; top: -130px; border: 34px solid rgba(255, 255, 255, .045); border-radius: 50%; }
.page-heading > * { position: relative; z-index: 1; }.page-heading h1 { margin: 3px 0 4px; font-size: 24px; }.page-heading p { margin: 0; color: rgba(255, 255, 255, .66); font-size: 13px; }.eyebrow { color: #8fb4ff; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
.summary-card { min-height: 112px; margin-bottom: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid #edf0f7; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); }.summary-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 13px; font-size: 23px; }.summary-label { color: #64748b; font-size: 13px; }.summary-value { margin: 2px 0; color: #172033; font-size: 28px; font-weight: 700; }.summary-caption { color: #9aa4b5; font-size: 11px; }
.summary-card--blue .summary-icon { color: #2563eb; background: #eaf1ff; }.summary-card--green .summary-icon { color: #059669; background: #e7f8f1; }.summary-card--orange .summary-icon { color: #ea580c; background: #fff2e8; }.summary-card--slate .summary-icon { color: #64748b; background: #eef2f6; }
.content-card { border: 0; border-radius: 13px; }.filter-form { padding: 16px 16px 0; display: flex; flex-wrap: wrap; background: #f8fafc; border: 1px solid #edf1f5; border-radius: 10px; }.filter-form :deep(.el-input) { width: 190px; }.filter-form :deep(.el-select) { width: 150px; }.list-toolbar { padding: 15px 0 12px; display: flex; justify-content: space-between; align-items: center; }.selection-tip { color: #98a2b3; font-size: 12px; }
.shop-table :deep(th.el-table__cell) { height: 46px; color: #667085; background: #f7f8fb; }.shop-table :deep(td.el-table__cell) { padding: 11px 0; }.shop-identity, .site-cell, .sync-cell { display: flex; align-items: center; gap: 10px; }.shop-avatar, .drawer-shop-avatar { display: grid; place-items: center; color: #fff; font-weight: 700; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }.shop-avatar { width: 38px; height: 38px; border-radius: 10px; font-size: 12px; }.shop-copy, .owner-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }.shop-name { max-width: 190px; padding: 0; color: #172033; background: none; border: 0; font-weight: 600; text-align: left; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }.shop-copy span, .owner-cell span { color: #98a2b3; font-size: 11px; }.site-flag { min-width: 30px; padding: 4px; color: #2563eb; background: #eef4ff; border-radius: 5px; font-size: 10px; font-weight: 700; text-align: center; }.site-cell div { display: flex; flex-direction: column; }.site-cell small { color: #98a2b3; }.sync-cell { color: #667085; font-size: 12px; }
.pagination-wrap { padding-top: 17px; display: flex; justify-content: space-between; align-items: center; color: #98a2b3; font-size: 12px; }.form-alert { margin-bottom: 18px; }.form-section-title { margin: 3px 0 14px; padding-left: 10px; color: #1d2939; border-left: 3px solid #2563eb; font-weight: 600; }.form-section-title:not(:first-of-type) { margin-top: 8px; }
.drawer-hero { min-height: 172px; padding: 36px 30px 24px; display: flex; align-items: center; gap: 18px; color: #fff; background: linear-gradient(130deg, #172033, #253762); position: relative; }.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: #fff; background: rgba(255, 255, 255, .08); border: 0; border-radius: 50%; cursor: pointer; }.drawer-shop-avatar { width: 66px; height: 66px; border-radius: 17px; font-size: 19px; }.drawer-shop-title > span { color: #9cb9ec; font-size: 11px; }.drawer-shop-title h2 { margin: 4px 0 10px; }.drawer-shop-title .el-tag + .el-tag { margin-left: 7px; }.drawer-content { padding: 24px 28px 90px; }.detail-section { margin-bottom: 26px; }.detail-section h3 { margin: 0 0 15px; color: #1d2939; font-size: 14px; }.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 24px; }.detail-grid > div { display: flex; flex-direction: column; gap: 5px; }.detail-grid .full { grid-column: 1 / -1; }.detail-grid span { color: #98a2b3; font-size: 11px; }.detail-grid strong { color: #475467; font-size: 12px; font-weight: 500; word-break: break-all; }
.timeline-list > div { min-height: 38px; display: grid; grid-template-columns: 14px 90px 1fr; gap: 6px; color: #667085; font-size: 12px; }.timeline-list i { width: 9px; height: 9px; margin-top: 3px; background: #94a3b8; border-radius: 50%; }.timeline-list i.success, .timeline-list i.valid { background: #10b981; }.timeline-list i.expiring { background: #f59e0b; }.timeline-list i.expired { background: #ef4444; }.timeline-list strong { text-align: right; }.detail-note { padding: 13px 15px; color: #667085; background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 4px 8px 8px 4px; font-size: 12px; line-height: 1.7; }.drawer-footer { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 28px; display: flex; justify-content: flex-end; background: #fff; border-top: 1px solid #edf0f5; }
@media (max-width: 768px) { .page-heading p, .eyebrow { display: none; }.summary-card { min-height: 96px; padding: 14px; }.filter-form { display: grid; grid-template-columns: 1fr 1fr; }.filter-form :deep(.el-form-item), .filter-form :deep(.el-input), .filter-form :deep(.el-select) { width: 100%; margin-right: 0; }.filter-actions { grid-column: 1 / -1; }.list-toolbar { align-items: flex-start; gap: 10px; }.list-toolbar > div { display: flex; flex-wrap: wrap; gap: 6px; }.detail-grid { grid-template-columns: 1fr; }.detail-grid .full { grid-column: auto; }:deep(.el-drawer) { width: 100% !important; } }
</style>
