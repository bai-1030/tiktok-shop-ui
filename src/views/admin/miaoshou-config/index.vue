<template>
  <BasicLayout>
    <template #wrapper>
      <el-card class="box-card">
        <el-form ref="queryForm" :model="queryParams" :inline="true" class="search-form">
          <el-form-item label="配置名称" prop="configName">
            <el-input v-model="queryParams.configName" placeholder="请输入配置名称" clearable size="small" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="AppKey" prop="appKey">
            <el-input v-model="queryParams.appKey" placeholder="请输入 AppKey" clearable size="small" @keyup.enter="handleQuery" />
          </el-form-item>
          <el-form-item label="状态" prop="status">
            <el-select v-model="queryParams.status" placeholder="全部" clearable size="small">
              <el-option label="启用" :value="1" />
              <el-option label="禁用" :value="2" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" size="small" :icon="Search" @click="handleQuery">搜索</el-button>
            <el-button size="small" :icon="Refresh" @click="resetQuery">重置</el-button>
          </el-form-item>
        </el-form>

        <div class="toolbar mb8">
          <el-button v-permisaction="['admin:miaoshouConfig:add']" type="primary" size="small" :icon="Plus" @click="handleAdd">新增</el-button>
          <el-button v-permisaction="['admin:miaoshouConfig:edit']" type="primary" size="small" :icon="Edit" :disabled="single" @click="handleUpdate()">修改</el-button>
          <el-button v-permisaction="['admin:miaoshouConfig:remove']" type="danger" size="small" :icon="Delete" :disabled="multiple" @click="handleDelete()">删除</el-button>
        </div>

        <el-table v-loading="loading" :data="configList" border stripe @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="55" align="center" />
          <el-table-column label="配置名称" prop="configName" min-width="150" show-overflow-tooltip />
          <el-table-column label="API 地址" prop="apiBaseUrl" min-width="250" show-overflow-tooltip />
          <el-table-column label="AppKey" prop="appKey" min-width="160" show-overflow-tooltip />
          <el-table-column label="签名方式" prop="signType" width="140" />
          <el-table-column label="状态" prop="status" width="120" align="center">
            <template #default="scope">
              <el-switch
                v-permisaction="['admin:miaoshouConfig:status']"
                :model-value="scope.row.status === 1"
                active-text="启用"
                inactive-text="禁用"
                @change="handleStatus(scope.row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="更新时间" prop="updatedAt" width="180">
            <template #default="scope"><span>{{ parseTime(scope.row.updatedAt) }}</span></template>
          </el-table-column>
          <el-table-column label="操作" width="230" align="center" fixed="right">
            <template #default="scope">
              <el-button v-permisaction="['admin:miaoshouConfig:edit']" type="primary" link size="small" :icon="Edit" @click="handleUpdate(scope.row)">修改</el-button>
              <el-button v-permisaction="['admin:miaoshouConfig:test']" type="success" link size="small" :icon="Connection" @click="handleTest(scope.row)">验证凭证</el-button>
              <el-button v-permisaction="['admin:miaoshouConfig:remove']" type="danger" link size="small" :icon="Delete" @click="handleDelete(scope.row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <pagination
          v-show="total > 0"
          v-model:page="queryParams.pageIndex"
          v-model:limit="queryParams.pageSize"
          :total="total"
          @pagination="getList"
        />

        <el-dialog v-model="open" :title="title" width="620px" :close-on-click-modal="false">
          <el-form ref="form" :model="form" :rules="rules" label-width="130px">
            <el-form-item label="配置名称" prop="configName"><el-input v-model="form.configName" placeholder="例如：妙手生产环境" /></el-form-item>
            <el-form-item label="API 地址" prop="apiBaseUrl"><el-input v-model="form.apiBaseUrl" placeholder="请输入妙手 API 地址" /></el-form-item>
            <el-form-item label="AppKey" prop="appKey"><el-input v-model="form.appKey" placeholder="请输入 AppKey" /></el-form-item>
            <el-form-item label="AppSecret" prop="appSecret">
              <el-input v-model="form.appSecret" type="password" show-password :placeholder="isEdit ? '留空表示不修改' : '请输入 AppSecret'" autocomplete="new-password" />
            </el-form-item>
            <el-form-item label="签名方式" prop="signType"><el-input v-model="form.signType" disabled /></el-form-item>
            <el-form-item label="签名版本" prop="signVersion"><el-input v-model="form.signVersion" placeholder="例如：1.0" /></el-form-item>
            <el-form-item label="请求超时（秒）" prop="requestTimeoutSeconds"><el-input-number v-model="form.requestTimeoutSeconds" :min="1" :max="600" controls-position="right" /></el-form-item>
            <el-form-item label="状态" prop="status"><el-radio-group v-model="form.status"><el-radio :label="1">启用</el-radio><el-radio :label="2">禁用</el-radio></el-radio-group></el-form-item>
            <el-form-item label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
          </el-form>
          <template #footer><div class="dialog-footer"><el-button type="primary" @click="submitForm">确定</el-button><el-button @click="cancel">取消</el-button></div></template>
        </el-dialog>
      </el-card>
    </template>
  </BasicLayout>
</template>

<script>
import { Search, Refresh, Plus, Edit, Delete, Connection } from '@element-plus/icons-vue'
import { listMiaoshouConfig, getMiaoshouConfig, addMiaoshouConfig, updateMiaoshouConfig, deleteMiaoshouConfig, updateMiaoshouConfigStatus, testMiaoshouConfig } from '@/api/admin/miaoshou-config'

export default {
  name: 'MiaoshouAPIConfigManage',
  setup() { return { Search, Refresh, Plus, Edit, Delete, Connection } },
  data() {
    return {
      loading: true, ids: [], single: true, multiple: true, total: 0, configList: [], open: false, title: '', isEdit: false,
      queryParams: { pageIndex: 1, pageSize: 10, configName: undefined, appKey: undefined, status: undefined },
      form: {},
      rules: {
        configName: [{ required: true, message: '配置名称不能为空', trigger: 'blur' }],
        apiBaseUrl: [{ required: true, message: 'API 地址不能为空', trigger: 'blur' }, { type: 'url', message: '请输入正确的 URL', trigger: 'blur' }],
        appKey: [{ required: true, message: 'AppKey 不能为空', trigger: 'blur' }],
        appSecret: []
      }
    }
  },
  created() { this.getList() },
  methods: {
    getList() {
      this.loading = true
      listMiaoshouConfig(this.queryParams).then(response => { this.configList = response.data.list; this.total = response.data.count }).finally(() => { this.loading = false })
    },
    reset() {
      this.form = { id: undefined, configName: '', apiBaseUrl: 'https://openapi-erp.91miaoshou.com', appKey: '', appSecret: '', signType: 'HMAC-SHA256', signVersion: '1.0', requestTimeoutSeconds: 30, status: 1, remark: '' }
      this.resetForm('form')
    },
    handleQuery() { this.queryParams.pageIndex = 1; this.getList() },
    resetQuery() { this.resetForm('queryForm'); this.handleQuery() },
    handleSelectionChange(selection) { this.ids = selection.map(item => item.id); this.single = selection.length !== 1; this.multiple = selection.length === 0 },
    handleAdd() { this.reset(); this.isEdit = false; this.title = '新增妙手配置'; this.open = true },
    handleUpdate(row) {
      this.reset()
      getMiaoshouConfig((row && row.id) || this.ids[0]).then(response => { this.form = { ...response.data, appSecret: '', signType: 'HMAC-SHA256' }; this.isEdit = true; this.title = '修改妙手配置'; this.open = true })
    },
    handleStatus(row) {
      const status = row.status === 1 ? 2 : 1
      updateMiaoshouConfigStatus(row.id, status).then(() => { this.msgSuccess('状态更新成功'); this.getList() })
    },
    handleTest(row) {
      testMiaoshouConfig(row.id).then(response => {
        const result = response.data || {}
        this.msgSuccess(`妙手凭证验证成功，返回 ${result.shopCount || 0} 个店铺`)
      })
    },
    submitForm() {
      this.$refs.form.validate(valid => {
        if (!valid) return
        if (!this.isEdit && !this.form.appSecret) {
          this.msgError('AppSecret 不能为空')
          return
        }
        const action = this.form.id ? updateMiaoshouConfig(this.form) : addMiaoshouConfig(this.form)
        action.then(() => { this.msgSuccess(this.form.id ? '修改成功' : '新增成功'); this.open = false; this.getList() })
      })
    },
    cancel() { this.open = false; this.reset() },
    handleDelete(row) {
      const ids = row ? [row.id] : this.ids
      this.$confirm('确认删除选中的妙手 API 配置吗？', '提示', { type: 'warning' }).then(() => deleteMiaoshouConfig(ids)).then(() => { this.msgSuccess('删除成功'); this.getList() }).catch(() => {})
    }
  }
}
</script>
