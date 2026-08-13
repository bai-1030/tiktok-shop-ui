<template>
  <BasicLayout>
    <template #wrapper>
      <div class="shop-page">
        <section class="page-heading">
          <div>
            <div class="eyebrow">TIKTOK SHOP OPERATIONS</div>
            <h1>店铺管理</h1>
            <p>集中管理跨境店铺、授权状态与运营信息</p>
          </div>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增店铺</el-button>
        </section>

        <el-row :gutter="14" class="summary-row">
          <el-col :xs="12" :sm="12" :md="6">
            <div class="summary-card summary-card--blue">
              <div class="summary-icon"><el-icon><Shop /></el-icon></div>
              <div><div class="summary-label">店铺总数</div><div class="summary-value">{{ summary.total }}</div><div class="summary-caption">覆盖 {{ summary.sites }} 个站点</div></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="summary-card summary-card--green">
              <div class="summary-icon"><el-icon><CircleCheckFilled /></el-icon></div>
              <div><div class="summary-label">正常运营</div><div class="summary-value">{{ summary.active }}</div><div class="summary-caption">{{ summary.activeRate }}% 运营中</div></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="summary-card summary-card--orange">
              <div class="summary-icon"><el-icon><WarningFilled /></el-icon></div>
              <div><div class="summary-label">授权过期</div><div class="summary-value">{{ summary.expired }}</div><div class="summary-caption">需尽快重新授权</div></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="12" :md="6">
            <div class="summary-card summary-card--slate">
              <div class="summary-icon"><el-icon><CircleCloseFilled /></el-icon></div>
              <div><div class="summary-label">已停用</div><div class="summary-value">{{ summary.disabled }}</div><div class="summary-caption">不参与任务同步</div></div>
            </div>
          </el-col>
        </el-row>

        <el-card class="content-card" shadow="never">
          <el-form ref="queryForm" :model="queryParams" :inline="true" class="filter-form">
            <el-form-item label="店铺搜索" prop="keyword">
              <el-input v-model="queryParams.keyword" placeholder="店铺名称 / 编号" clearable :prefix-icon="Search" @keyup.enter="handleQuery" />
            </el-form-item>
            <el-form-item label="所属站点" prop="siteCode">
              <el-select v-model="queryParams.siteCode" placeholder="全部站点" clearable>
                <el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="店铺状态" prop="status">
              <el-select v-model="queryParams.status" placeholder="全部状态" clearable>
                <el-option label="正常运营" value="active" />
                <el-option label="已停用" value="disabled" />
              </el-select>
            </el-form-item>
            <el-form-item label="授权状态" prop="authStatus">
              <el-select v-model="queryParams.authStatus" placeholder="全部状态" clearable>
                <el-option label="授权正常" value="valid" />
                <el-option label="即将过期" value="expiring" />
                <el-option label="授权过期" value="expired" />
              </el-select>
            </el-form-item>
            <el-form-item class="filter-actions">
              <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
              <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="list-toolbar">
            <div>
              <el-button type="primary" :icon="Plus" @click="handleAdd">新增店铺</el-button>
              <el-button :icon="CircleCheck" :disabled="!selectedIds.length" @click="handleBatchStatus('active')">批量启用</el-button>
              <el-button :icon="CircleClose" :disabled="!selectedIds.length" @click="handleBatchStatus('disabled')">批量停用</el-button>
            </div>
            <span class="selection-tip">已选择 {{ selectedIds.length }} 项</span>
          </div>

          <el-table
            v-loading="loading"
            :data="pagedShops"
            row-key="id"
            class="shop-table"
            @selection-change="handleSelectionChange"
          >
            <template #empty>
              <el-empty description="暂无符合条件的店铺" :image-size="90" />
            </template>
            <el-table-column type="selection" width="46" align="center" reserve-selection />
            <el-table-column label="店铺信息" min-width="250" fixed="left">
              <template #default="scope">
                <div class="shop-identity">
                  <div class="shop-avatar" :style="{ background: scope.row.color }">{{ scope.row.initials }}</div>
                  <div class="shop-copy">
                    <button class="shop-name" type="button" @click="openDetail(scope.row)">{{ scope.row.shopName }}</button>
                    <span>{{ scope.row.shopCode }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="站点 / 币种" width="132">
              <template #default="scope">
                <div class="site-cell"><span class="site-flag">{{ scope.row.siteCode }}</span><div><strong>{{ scope.row.siteName }}</strong><small>{{ scope.row.currency }}</small></div></div>
              </template>
            </el-table-column>
            <el-table-column label="负责人" min-width="150">
              <template #default="scope">
                <div class="owner-cell"><strong>{{ scope.row.owner }}</strong><span>{{ scope.row.phone }}</span></div>
              </template>
            </el-table-column>
            <el-table-column label="授权状态" width="128" align="center">
              <template #default="scope">
                <el-tag :type="authMeta(scope.row.authStatus).type" effect="light" round>{{ authMeta(scope.row.authStatus).label }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="店铺状态" width="118" align="center">
              <template #default="scope">
                <el-switch
                  :model-value="scope.row.status === 'active'"
                  inline-prompt
                  active-text="启用"
                  inactive-text="停用"
                  @change="handleStatusChange(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="最近同步" min-width="170">
              <template #default="scope">
                <div class="sync-cell"><el-icon><Clock /></el-icon><span>{{ scope.row.lastSync }}</span></div>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="250" align="center" fixed="right">
              <template #default="scope">
                <el-button type="primary" link :icon="View" @click="openDetail(scope.row)">查看</el-button>
                <el-button type="primary" link :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
                <el-button v-if="scope.row.authStatus !== 'valid'" type="warning" link :icon="Key" @click="handleReauthorize(scope.row)">授权</el-button>
                <el-dropdown v-else trigger="click" @command="command => handleRowCommand(command, scope.row)">
                  <el-button link class="more-button">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="reauthorize" :icon="Key">重新授权</el-dropdown-item>
                      <el-dropdown-item command="delete" :icon="Delete" divided>删除店铺</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrap">
            <span>共 {{ filteredShops.length }} 家店铺</span>
            <el-pagination
              v-model:current-page="queryParams.pageIndex"
              v-model:page-size="queryParams.pageSize"
              background
              layout="sizes, prev, pager, next, jumper"
              :page-sizes="[5, 10, 20]"
              :total="filteredShops.length"
            />
          </div>
        </el-card>

        <el-dialog v-model="editorOpen" :title="editorTitle" width="720px" :close-on-click-modal="false" destroy-on-close>
          <el-alert title="当前为前端模拟数据，提交后不会写入数据库" type="info" :closable="false" show-icon class="mock-alert" />
          <el-form ref="editorForm" :model="form" :rules="rules" label-position="top" class="shop-form">
            <div class="form-section-title">店铺信息</div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="店铺名称" prop="shopName"><el-input v-model="form.shopName" placeholder="请输入店铺名称" maxlength="60" show-word-limit /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="店铺编号" prop="shopCode"><el-input v-model="form.shopCode" placeholder="例如 MY-SHOP-001" maxlength="30" /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="TikTok 站点" prop="siteCode"><el-select v-model="form.siteCode" placeholder="请选择站点" style="width: 100%" @change="handleSiteChange"><el-option v-for="site in siteOptions" :key="site.value" :label="`${site.label} (${site.value})`" :value="site.value" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="默认币种" prop="currency"><el-input v-model="form.currency" disabled /></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="店铺状态" prop="status"><el-radio-group v-model="form.status"><el-radio-button value="active">正常运营</el-radio-button><el-radio-button value="disabled">停用</el-radio-button></el-radio-group></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="授权状态"><el-select v-model="form.authStatus" style="width: 100%"><el-option label="授权正常" value="valid" /><el-option label="即将过期" value="expiring" /><el-option label="授权过期" value="expired" /></el-select></el-form-item></el-col>
            </el-row>
            <div class="form-section-title">负责人信息</div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="8"><el-form-item label="负责人" prop="owner"><el-input v-model="form.owner" placeholder="请输入姓名" /></el-form-item></el-col>
              <el-col :xs="24" :sm="8"><el-form-item label="联系电话" prop="phone"><el-input v-model="form.phone" placeholder="含国家区号" /></el-form-item></el-col>
              <el-col :xs="24" :sm="8"><el-form-item label="联系邮箱" prop="email"><el-input v-model="form.email" placeholder="name@example.com" /></el-form-item></el-col>
              <el-col :span="24"><el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="填写店铺运营说明" /></el-form-item></el-col>
            </el-row>
          </el-form>
          <template #footer>
            <el-button @click="editorOpen = false">取消</el-button>
            <el-button type="primary" :loading="saving" @click="submitForm">保存店铺</el-button>
          </template>
        </el-dialog>

        <el-drawer v-model="detailOpen" size="560px" :with-header="false" destroy-on-close>
          <template v-if="detailShop">
            <div class="drawer-hero">
              <button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button>
              <div class="drawer-shop-avatar" :style="{ background: detailShop.color }">{{ detailShop.initials }}</div>
              <div class="drawer-shop-title"><span>{{ detailShop.shopCode }}</span><h2>{{ detailShop.shopName }}</h2><div><el-tag :type="detailShop.status === 'active' ? 'success' : 'info'" round>{{ statusLabel(detailShop.status) }}</el-tag><el-tag :type="authMeta(detailShop.authStatus).type" round>{{ authMeta(detailShop.authStatus).label }}</el-tag></div></div>
            </div>
            <div class="drawer-content">
              <div class="detail-metrics">
                <div><span>近30天订单</span><strong>{{ formatNumber(detailShop.orders) }}</strong></div>
                <div><span>近30天销售额</span><strong>{{ detailShop.currency }} {{ formatMoney(detailShop.revenue) }}</strong></div>
                <div><span>在线商品</span><strong>{{ formatNumber(detailShop.products) }}</strong></div>
              </div>
              <section class="detail-section">
                <h3>基本资料</h3>
                <div class="detail-grid"><div><span>所属站点</span><strong>{{ detailShop.siteName }}（{{ detailShop.siteCode }}）</strong></div><div><span>默认币种</span><strong>{{ detailShop.currency }}</strong></div><div><span>负责人</span><strong>{{ detailShop.owner }}</strong></div><div><span>联系电话</span><strong>{{ detailShop.phone }}</strong></div><div class="full"><span>联系邮箱</span><strong>{{ detailShop.email }}</strong></div></div>
              </section>
              <section class="detail-section">
                <h3>授权与同步</h3>
                <div class="timeline-list"><div><i class="success" /><span>最近同步</span><strong>{{ detailShop.lastSync }}</strong></div><div><i :class="detailShop.authStatus" /><span>授权有效期</span><strong>{{ detailShop.authExpiry }}</strong></div><div><i /><span>创建时间</span><strong>{{ detailShop.createdAt }}</strong></div></div>
              </section>
              <section class="detail-section"><h3>运营备注</h3><p class="detail-note">{{ detailShop.remark || '暂无备注' }}</p></section>
            </div>
            <div class="drawer-footer"><el-button @click="handleEdit(detailShop)">编辑资料</el-button><el-button type="primary" :icon="Key" @click="handleReauthorize(detailShop)">重新授权</el-button></div>
          </template>
        </el-drawer>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  CircleCheck,
  CircleCheckFilled,
  CircleClose,
  CircleCloseFilled,
  Clock,
  Close,
  Delete,
  Edit,
  Key,
  Plus,
  Refresh,
  Search,
  Shop,
  View,
  WarningFilled
} from '@element-plus/icons-vue'
import { createMockShops, siteOptions } from './mock-data'

const palette = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#db2777', '#f97316', '#4f46e5']

export default {
  name: 'ShopManage',
  setup() {
    return { ArrowDown, CircleCheck, CircleCheckFilled, CircleClose, CircleCloseFilled, Clock, Close, Delete, Edit, Key, Plus, Refresh, Search, Shop, View, WarningFilled }
  },
  data() {
    const validateShopCode = (rule, value, callback) => {
      const duplicate = this.shops.some(shop => shop.shopCode.toLowerCase() === String(value).trim().toLowerCase() && shop.id !== this.form.id)
      duplicate ? callback(new Error('店铺编号已存在')) : callback()
    }
    return {
      shops: createMockShops(),
      siteOptions,
      loading: false,
      saving: false,
      selectedIds: [],
      editorOpen: false,
      editorMode: 'add',
      detailOpen: false,
      detailShop: null,
      queryParams: { keyword: '', siteCode: '', status: '', authStatus: '', pageIndex: 1, pageSize: 10 },
      form: {},
      rules: {
        shopName: [{ required: true, message: '请输入店铺名称', trigger: 'blur' }],
        shopCode: [{ required: true, message: '请输入店铺编号', trigger: 'blur' }, { validator: validateShopCode, trigger: 'blur' }],
        siteCode: [{ required: true, message: '请选择 TikTok 站点', trigger: 'change' }],
        owner: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
        phone: [{ required: true, message: '请输入联系电话', trigger: 'blur' }],
        email: [{ type: 'email', message: '请输入正确的邮箱地址', trigger: ['blur', 'change'] }]
      }
    }
  },
  computed: {
    summary() {
      const total = this.shops.length
      const active = this.shops.filter(shop => shop.status === 'active').length
      return {
        total,
        sites: new Set(this.shops.map(shop => shop.siteCode)).size,
        active,
        activeRate: total ? Math.round(active / total * 100) : 0,
        expired: this.shops.filter(shop => shop.authStatus === 'expired').length,
        disabled: this.shops.filter(shop => shop.status === 'disabled').length
      }
    },
    filteredShops() {
      const keyword = this.queryParams.keyword.trim().toLowerCase()
      return this.shops.filter(shop => {
        const matchKeyword = !keyword || shop.shopName.toLowerCase().includes(keyword) || shop.shopCode.toLowerCase().includes(keyword)
        return matchKeyword &&
          (!this.queryParams.siteCode || shop.siteCode === this.queryParams.siteCode) &&
          (!this.queryParams.status || shop.status === this.queryParams.status) &&
          (!this.queryParams.authStatus || shop.authStatus === this.queryParams.authStatus)
      })
    },
    pagedShops() {
      const start = (this.queryParams.pageIndex - 1) * this.queryParams.pageSize
      return this.filteredShops.slice(start, start + this.queryParams.pageSize)
    },
    editorTitle() {
      return this.editorMode === 'add' ? '新增店铺' : '编辑店铺'
    }
  },
  watch: {
    'queryParams.pageSize'() { this.queryParams.pageIndex = 1 },
    filteredShops() {
      const maxPage = Math.max(1, Math.ceil(this.filteredShops.length / this.queryParams.pageSize))
      if (this.queryParams.pageIndex > maxPage) this.queryParams.pageIndex = maxPage
    }
  },
  methods: {
    authMeta(status) {
      return {
        valid: { label: '授权正常', type: 'success' },
        expiring: { label: '即将过期', type: 'warning' },
        expired: { label: '授权过期', type: 'danger' }
      }[status] || { label: '未知', type: 'info' }
    },
    statusLabel(status) { return status === 'active' ? '正常运营' : '已停用' },
    formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN') },
    formatMoney(value) { return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    nowText() {
      const date = new Date()
      const pad = value => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
    },
    createEmptyForm() {
      return { id: undefined, shopName: '', shopCode: '', siteCode: '', siteName: '', currency: '', owner: '', phone: '', email: '', status: 'active', authStatus: 'valid', remark: '' }
    },
    handleQuery() {
      this.loading = true
      this.queryParams.pageIndex = 1
      window.setTimeout(() => { this.loading = false }, 260)
    },
    resetQuery() {
      this.queryParams = { keyword: '', siteCode: '', status: '', authStatus: '', pageIndex: 1, pageSize: this.queryParams.pageSize }
      this.handleQuery()
    },
    handleSelectionChange(selection) { this.selectedIds = selection.map(shop => shop.id) },
    handleAdd() {
      this.editorMode = 'add'
      this.form = this.createEmptyForm()
      this.editorOpen = true
      this.$nextTick(() => this.$refs.editorForm?.clearValidate())
    },
    handleEdit(shop) {
      this.detailOpen = false
      this.editorMode = 'edit'
      this.form = { ...shop }
      this.editorOpen = true
      this.$nextTick(() => this.$refs.editorForm?.clearValidate())
    },
    handleSiteChange(siteCode) {
      const site = this.siteOptions.find(option => option.value === siteCode)
      if (site) { this.form.siteName = site.label; this.form.currency = site.currency }
    },
    submitForm() {
      this.$refs.editorForm.validate(valid => {
        if (!valid) return
        this.saving = true
        window.setTimeout(() => {
          const now = this.nowText()
          if (this.editorMode === 'edit') {
            const index = this.shops.findIndex(shop => shop.id === this.form.id)
            if (index !== -1) this.shops.splice(index, 1, { ...this.shops[index], ...this.form, updatedAt: now })
            this.msgSuccess('店铺信息已更新（模拟）')
          } else {
            const id = Math.max(...this.shops.map(shop => shop.id), 1000) + 1
            const initials = this.form.shopName.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'TS'
            this.shops.unshift({ ...this.form, id, initials, color: palette[id % palette.length], authExpiry: '2027-08-13 23:59:59', lastSync: '尚未同步', updatedAt: now, createdAt: now, orders: 0, revenue: 0, products: 0 })
            this.msgSuccess('店铺已新增（模拟）')
          }
          this.saving = false
          this.editorOpen = false
        }, 450)
      })
    },
    openDetail(shop) { this.detailShop = shop; this.detailOpen = true },
    handleStatusChange(shop) {
      const nextStatus = shop.status === 'active' ? 'disabled' : 'active'
      ElMessageBox.confirm(`确认${nextStatus === 'active' ? '启用' : '停用'}店铺“${shop.shopName}”吗？`, '店铺状态确认', { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' })
        .then(() => { shop.status = nextStatus; shop.updatedAt = this.nowText(); this.msgSuccess(`店铺已${nextStatus === 'active' ? '启用' : '停用'}（模拟）`) })
        .catch(() => {})
    },
    handleBatchStatus(status) {
      const label = status === 'active' ? '启用' : '停用'
      ElMessageBox.confirm(`确认批量${label}选中的 ${this.selectedIds.length} 家店铺吗？`, `批量${label}`, { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' })
        .then(() => {
          this.shops.forEach(shop => { if (this.selectedIds.includes(shop.id)) { shop.status = status; shop.updatedAt = this.nowText() } })
          this.msgSuccess(`已批量${label} ${this.selectedIds.length} 家店铺（模拟）`)
        }).catch(() => {})
    },
    handleReauthorize(shop) {
      ElMessageBox.confirm(`将为“${shop.shopName}”模拟刷新 TikTok Shop 授权，是否继续？`, '重新授权', { confirmButtonText: '开始授权', cancelButtonText: '取消', type: 'info' })
        .then(() => {
          shop.authStatus = 'valid'; shop.authExpiry = '2027-08-13 23:59:59'; shop.lastSync = this.nowText(); shop.updatedAt = shop.lastSync
          this.msgSuccess('授权已刷新（模拟）')
        }).catch(() => {})
    },
    handleDelete(shop) {
      ElMessageBox.confirm(`删除后当前页面将不再显示“${shop.shopName}”，确认删除吗？`, '删除店铺', { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' })
        .then(() => { this.shops = this.shops.filter(item => item.id !== shop.id); this.selectedIds = this.selectedIds.filter(id => id !== shop.id); this.detailOpen = false; this.msgSuccess('店铺已删除（模拟）') })
        .catch(() => {})
    },
    handleRowCommand(command, shop) { command === 'delete' ? this.handleDelete(shop) : this.handleReauthorize(shop) }
  }
}
</script>

<style lang="scss" scoped>
.shop-page { min-height: calc(100vh - 110px); }
.page-heading { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; margin-bottom: 14px; color: #fff; background: linear-gradient(118deg, #151a2d 0%, #242b50 53%, #243d68 100%); border-radius: 14px; box-shadow: 0 8px 28px rgba(30, 41, 81, .18); overflow: hidden; position: relative; }
.page-heading::after { content: ''; position: absolute; width: 210px; height: 210px; right: 12%; top: -130px; border: 34px solid rgba(255, 255, 255, .045); border-radius: 50%; }
.page-heading > * { position: relative; z-index: 1; }
.page-heading h1 { margin: 3px 0 4px; font-size: 24px; line-height: 1.25; letter-spacing: 1px; }
.page-heading p { margin: 0; color: rgba(255, 255, 255, .66); font-size: 13px; }
.eyebrow { font-size: 10px; letter-spacing: 2px; color: #8fb4ff; font-weight: 700; }
.summary-row { margin-bottom: 2px; }
.summary-card { min-height: 112px; margin-bottom: 14px; padding: 20px; display: flex; align-items: center; gap: 16px; background: #fff; border: 1px solid #edf0f7; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); transition: transform .2s ease, box-shadow .2s ease; }
.summary-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(23, 34, 66, .09); }
.summary-icon { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 13px; font-size: 23px; flex: 0 0 auto; }
.summary-label { color: #64748b; font-size: 13px; }
.summary-value { margin: 2px 0 1px; color: #172033; font-size: 28px; line-height: 1.1; font-weight: 700; font-variant-numeric: tabular-nums; }
.summary-caption { color: #9aa4b5; font-size: 11px; }
.summary-card--blue .summary-icon { color: #2563eb; background: #eaf1ff; }
.summary-card--green .summary-icon { color: #059669; background: #e7f8f1; }
.summary-card--orange .summary-icon { color: #ea580c; background: #fff2e8; }
.summary-card--slate .summary-icon { color: #64748b; background: #eef2f6; }
.content-card { border: 0; border-radius: 14px; box-shadow: 0 3px 18px rgba(23, 34, 66, .06); }
.content-card :deep(.el-card__body) { padding: 0; }
.filter-form { display: flex; align-items: flex-end; gap: 2px; padding: 18px 18px 8px; border-bottom: 1px solid #eef1f6; background: #fbfcfe; border-radius: 14px 14px 0 0; }
.filter-form :deep(.el-form-item) { margin-right: 12px; margin-bottom: 10px; }
.filter-form :deep(.el-form-item__label) { color: #64748b; font-size: 12px; }
.filter-form :deep(.el-input) { width: 195px; }
.filter-form :deep(.el-select) { width: 140px; }
.filter-actions { margin-left: auto; margin-right: 0 !important; }
.list-toolbar { min-height: 62px; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; }
.selection-tip { color: #94a3b8; font-size: 12px; }
.shop-table { width: 100%; }
.shop-table :deep(th.el-table__cell) { height: 46px; background: #f7f8fb; color: #667085; font-weight: 600; }
.shop-table :deep(td.el-table__cell) { padding: 11px 0; }
.shop-identity { display: flex; align-items: center; gap: 11px; }
.shop-avatar, .drawer-shop-avatar { display: grid; place-items: center; color: #fff; font-weight: 700; letter-spacing: .5px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .25); }
.shop-avatar { width: 38px; height: 38px; border-radius: 10px; font-size: 12px; flex: 0 0 auto; }
.shop-copy, .owner-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.shop-name { max-width: 190px; padding: 0; border: 0; background: none; color: #172033; font-family: inherit; font-weight: 600; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: left; cursor: pointer; }
.shop-name:hover { color: #2563eb; }
.shop-copy span, .owner-cell span { color: #98a2b3; font-size: 11px; }
.owner-cell strong { color: #344054; font-size: 13px; }
.site-cell { display: flex; align-items: center; gap: 8px; }
.site-flag { width: 30px; height: 24px; display: grid; place-items: center; color: #344054; background: #f1f4f8; border: 1px solid #e5e9f0; border-radius: 6px; font-size: 10px; font-weight: 700; }
.site-cell div { display: flex; flex-direction: column; }
.site-cell strong { color: #344054; font-size: 12px; font-weight: 600; }
.site-cell small { color: #98a2b3; font-size: 10px; }
.sync-cell { display: flex; align-items: center; gap: 5px; color: #667085; font-size: 12px; }
.sync-cell .el-icon { color: #98a2b3; }
.more-button { margin-left: 10px; color: #667085; }
.pagination-wrap { min-height: 70px; display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-top: 1px solid #eef1f6; }
.pagination-wrap > span { color: #98a2b3; font-size: 12px; }
.mock-alert { margin-bottom: 18px; }
.form-section-title { margin: 3px 0 14px; padding-left: 10px; border-left: 3px solid #2563eb; color: #1d2939; font-weight: 600; }
.form-section-title:not(:first-of-type) { margin-top: 8px; }
.shop-form :deep(.el-form-item) { margin-bottom: 18px; }
.shop-form :deep(.el-form-item__label) { padding-bottom: 6px; color: #475467; line-height: 1; }
.drawer-hero { min-height: 172px; padding: 36px 30px 24px; display: flex; align-items: center; gap: 18px; color: #fff; background: linear-gradient(130deg, #172033, #253762); position: relative; }
.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: rgba(255, 255, 255, .75); background: rgba(255, 255, 255, .08); border: 0; border-radius: 50%; cursor: pointer; }
.drawer-shop-avatar { width: 66px; height: 66px; border-radius: 17px; font-size: 19px; flex: 0 0 auto; }
.drawer-shop-title > span { color: #9cb9ec; font-size: 11px; letter-spacing: 1px; }
.drawer-shop-title h2 { margin: 4px 0 10px; font-size: 21px; }
.drawer-shop-title .el-tag + .el-tag { margin-left: 7px; }
.drawer-content { padding: 24px 28px 90px; }
.detail-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.detail-metrics > div { padding: 15px 12px; display: flex; flex-direction: column; gap: 7px; background: #f7f9fc; border: 1px solid #edf0f5; border-radius: 10px; }
.detail-metrics span, .detail-grid span { color: #98a2b3; font-size: 11px; }
.detail-metrics strong { color: #1d2939; font-size: 15px; }
.detail-section { margin-top: 26px; }
.detail-section h3 { margin: 0 0 15px; color: #1d2939; font-size: 14px; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 18px 24px; }
.detail-grid > div { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.detail-grid .full { grid-column: 1 / -1; }
.detail-grid strong { color: #475467; font-size: 12px; font-weight: 500; word-break: break-all; }
.timeline-list { padding-left: 6px; }
.timeline-list > div { min-height: 38px; display: grid; grid-template-columns: 14px 90px 1fr; align-items: start; gap: 6px; color: #667085; font-size: 12px; position: relative; }
.timeline-list > div:not(:last-child)::after { content: ''; position: absolute; left: 4px; top: 12px; bottom: -5px; width: 1px; background: #e3e8ef; }
.timeline-list i { width: 9px; height: 9px; margin-top: 3px; background: #94a3b8; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 2px #dbe1ea; z-index: 1; }
.timeline-list i.success, .timeline-list i.valid { background: #10b981; box-shadow: 0 0 0 2px #b8ead8; }
.timeline-list i.expiring { background: #f59e0b; box-shadow: 0 0 0 2px #fde2a7; }
.timeline-list i.expired { background: #ef4444; box-shadow: 0 0 0 2px #fecaca; }
.timeline-list strong { color: #475467; font-weight: 500; text-align: right; }
.detail-note { margin: 0; padding: 13px 15px; color: #667085; background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 4px 8px 8px 4px; font-size: 12px; line-height: 1.7; }
.drawer-footer { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 28px; display: flex; justify-content: flex-end; background: rgba(255, 255, 255, .96); border-top: 1px solid #edf0f5; backdrop-filter: blur(8px); }
.drawer-footer .el-button + .el-button { margin-left: 10px; }
@media (max-width: 1120px) { .filter-actions { margin-left: 0; } .filter-form { align-items: flex-end; } }
@media (max-width: 768px) {
  .page-heading { padding: 16px; } .page-heading p, .eyebrow { display: none; } .page-heading h1 { font-size: 20px; }
  .summary-card { min-height: 96px; padding: 14px; gap: 10px; } .summary-icon { width: 40px; height: 40px; } .summary-value { font-size: 22px; } .summary-caption { display: none; }
  .filter-form { display: grid; grid-template-columns: 1fr 1fr; padding: 14px; } .filter-form :deep(.el-form-item), .filter-form :deep(.el-input), .filter-form :deep(.el-select) { width: 100%; margin-right: 0; } .filter-actions { grid-column: 1 / -1; }
  .list-toolbar { align-items: flex-start; gap: 10px; } .list-toolbar > div { display: flex; flex-wrap: wrap; gap: 6px; } .list-toolbar .el-button + .el-button { margin-left: 0; }
  .pagination-wrap { align-items: flex-start; gap: 12px; overflow-x: auto; } .pagination-wrap > span { display: none; }
  .detail-metrics { grid-template-columns: 1fr; } .detail-grid { grid-template-columns: 1fr; } .detail-grid .full { grid-column: auto; }
  :deep(.el-drawer) { width: 100% !important; }
}
</style>
