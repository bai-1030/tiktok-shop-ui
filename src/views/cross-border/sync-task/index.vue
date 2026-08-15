<template>
  <BasicLayout>
    <template #wrapper>
      <div class="sync-page">
        <section class="sync-heading">
          <div>
            <div class="eyebrow">DATA SYNCHRONIZATION</div>
            <h1>同步任务</h1>
            <p>统一监控 TikTok Shop 包裹与店铺数据的异步同步</p>
          </div>
          <div class="heading-actions">
            <span><i />调度服务正常 · 更新于 {{ lastRefresh }}</span>
            <el-button :icon="Refresh" @click="refreshTasks">刷新数据</el-button>
            <el-button type="primary" :icon="Plus" @click="openCreateTask">新建同步任务</el-button>
          </div>
        </section>

        <el-row :gutter="14" class="metric-row">
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card">
              <div class="metric-icon blue"><el-icon><Tickets /></el-icon></div>
              <div><span>今日执行</span><strong>{{ summary.today }}</strong><small>包含手动和定时任务</small></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card">
              <div class="metric-icon purple running-icon"><el-icon><Loading /></el-icon></div>
              <div><span>正在运行</span><strong>{{ summary.running }}</strong><small>{{ summary.queued }} 个等待执行</small></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="5">
            <div class="metric-card">
              <div class="metric-icon green"><el-icon><CircleCheck /></el-icon></div>
              <div><span>今日成功</span><strong>{{ summary.success }}</strong><small>成功率 {{ summary.successRate }}%</small></div>
            </div>
          </el-col>
          <el-col :xs="12" :sm="8" :lg="4">
            <div class="metric-card issue-card">
              <div class="metric-icon red"><el-icon><WarningFilled /></el-icon></div>
              <div><span>失败/异常</span><strong>{{ summary.issue }}</strong><small>建议及时重试</small></div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="16" :lg="5">
            <div class="metric-card volume-card">
              <div>
                <span>今日同步数据</span><strong>{{ formatNumber(summary.records) }}</strong><small>成功写入与更新记录</small>
              </div>
              <div class="mini-bars"><i v-for="height in [34, 58, 45, 70, 62, 86, 76]" :key="height" :style="{ height: `${height}%` }" /></div>
            </div>
          </el-col>
        </el-row>

        <el-card class="sync-card" shadow="never">
          <el-tabs v-model="activeView" class="workspace-tabs" @tab-change="handleViewChange">
            <el-tab-pane name="records">
              <template #label><span class="workspace-label"><el-icon><Document /></el-icon>执行记录</span></template>
            </el-tab-pane>
            <el-tab-pane name="schedules">
              <template #label><span class="workspace-label"><el-icon><Timer /></el-icon>定时策略</span></template>
            </el-tab-pane>
          </el-tabs>

          <template v-if="activeView === 'records'">
            <el-tabs v-model="activeStatus" class="status-tabs" @tab-change="handleStatusTab">
              <el-tab-pane v-for="tab in statusTabs" :key="tab.value" :name="tab.value">
                <template #label><span>{{ tab.label }}<b v-if="tab.count">{{ tab.count }}</b></span></template>
              </el-tab-pane>
            </el-tabs>

            <el-form ref="queryForm" :model="queryParams" :inline="true" class="task-filter">
              <el-form-item prop="keyword"><el-input v-model="queryParams.keyword" placeholder="任务编号 / 名称 / 店铺" clearable :prefix-icon="Search" @keyup.enter="handleQuery" /></el-form-item>
              <el-form-item prop="taskType"><el-select v-model="queryParams.taskType" placeholder="全部同步类型" clearable><el-option v-for="type in taskTypeOptions" :key="type.value" :label="type.label" :value="type.value" /></el-select></el-form-item>
              <el-form-item prop="shopId"><el-select v-model="queryParams.shopId" placeholder="全部店铺" clearable filterable><el-option v-for="shop in shopOptions" :key="shop.value" :label="shop.label" :value="shop.value" /></el-select></el-form-item>
              <el-form-item prop="trigger"><el-select v-model="queryParams.trigger" placeholder="全部触发方式" clearable><el-option v-for="trigger in triggerOptions" :key="trigger.value" :label="trigger.label" :value="trigger.value" /></el-select></el-form-item>
              <el-form-item prop="dateRange"><el-date-picker v-model="queryParams.dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" /></el-form-item>
              <el-form-item class="filter-buttons"><el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button><el-button :icon="RefreshLeft" @click="resetQuery">重置</el-button></el-form-item>
            </el-form>

            <div class="task-toolbar">
              <div>
                <el-button :icon="RefreshRight" :disabled="!retryableSelectedCount" @click="batchRetry">批量重试<span v-if="retryableSelectedCount">（{{ retryableSelectedCount }}）</span></el-button>
                <el-button :icon="Download" :disabled="!selectedIds.length" @click="exportSelection">导出结果</el-button>
              </div>
              <div class="toolbar-meta"><span>已选 {{ selectedIds.length }} 项</span><el-tag type="success" effect="plain" round>实时队列</el-tag></div>
            </div>

            <el-table v-loading="loading" :data="pagedTasks" row-key="id" class="task-table" @selection-change="handleSelectionChange">
              <template #empty><el-empty description="暂无符合条件的同步任务" :image-size="90" /></template>
              <el-table-column type="selection" width="46" align="center" reserve-selection />
              <el-table-column label="任务信息" min-width="230" fixed="left">
                <template #default="scope">
                  <div class="task-identity">
                    <button type="button" @click="openDetail(scope.row)">{{ scope.row.taskName }}</button>
                    <span>{{ scope.row.taskNo }}</span>
                    <small>创建于 {{ scope.row.createdAt }}</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="同步类型" width="132">
                <template #default="scope"><div class="type-cell"><i :style="{ background: taskTypeMeta(scope.row.taskType).color }" /><div><strong>{{ taskTypeMeta(scope.row.taskType).label }}</strong><span>{{ scope.row.mode === 'full' ? '全量同步' : '增量同步' }}</span></div></div></template>
              </el-table-column>
              <el-table-column label="店铺 / 站点" min-width="175">
                <template #default="scope"><div class="shop-cell"><strong>{{ scope.row.shopName }}</strong><span><i>{{ scope.row.siteCode }}</i>{{ scope.row.siteName }}</span></div></template>
              </el-table-column>
              <el-table-column label="触发方式" width="108" align="center">
                <template #default="scope"><span class="trigger-pill" :class="scope.row.trigger"><el-icon><Timer v-if="scope.row.trigger === 'schedule'" /><User v-else /></el-icon>{{ triggerLabel(scope.row.trigger) }}</span></template>
              </el-table-column>
              <el-table-column label="执行进度" min-width="190">
                <template #default="scope">
                  <div class="progress-cell">
                    <div><span>{{ progressText(scope.row) }}</span><strong>{{ scope.row.progress }}%</strong></div>
                    <el-progress :percentage="scope.row.progress" :stroke-width="6" :show-text="false" :status="progressStatus(scope.row.status)" />
                    <small>{{ scope.row.successCount }} 成功 · {{ scope.row.skippedCount }} 跳过 · {{ scope.row.failedCount }} 失败</small>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="执行状态" width="120" align="center">
                <template #default="scope"><el-tag :type="statusMeta(scope.row.status).type" effect="light" round><el-icon v-if="scope.row.status === 'running'" class="is-loading"><Loading /></el-icon>{{ statusMeta(scope.row.status).label }}</el-tag><div v-if="scope.row.errorSummary" class="error-mark"><el-icon><WarningFilled /></el-icon>查看异常</div></template>
              </el-table-column>
              <el-table-column label="耗时" width="92" align="right">
                <template #default="scope"><span class="duration-text">{{ formatDuration(scope.row.durationSeconds, scope.row.status) }}</span></template>
              </el-table-column>
              <el-table-column label="操作" width="220" align="center" fixed="right">
                <template #default="scope">
                  <el-button type="primary" link :icon="View" @click="openDetail(scope.row)">详情</el-button>
                  <el-button v-if="['failed', 'partial', 'cancelled'].includes(scope.row.status)" type="warning" link :icon="RefreshRight" @click="retryTask(scope.row)">重试</el-button>
                  <el-button v-else-if="['queued', 'running'].includes(scope.row.status)" type="danger" link :icon="CircleClose" @click="cancelTask(scope.row)">取消</el-button>
                  <el-button v-else type="primary" link :icon="VideoPlay" @click="runAgain(scope.row)">再次执行</el-button>
                </template>
              </el-table-column>
            </el-table>

            <div class="task-pagination"><span>共 {{ taskTotal }} 条执行记录</span><el-pagination v-model:current-page="queryParams.pageIndex" v-model:page-size="queryParams.pageSize" background layout="sizes, prev, pager, next, jumper" :page-sizes="[10, 20, 50]" :total="taskTotal" /></div>
          </template>

          <template v-else>
            <div class="schedule-intro">
              <div><el-icon><Clock /></el-icon><div><strong>自动调度策略</strong><span>统一维护同步频率，业务任务按店铺顺序执行并自动避免并发冲突。</span></div></div>
              <div><el-button type="primary" :icon="Plus" @click="openScheduleEditor(null)">新建策略</el-button><el-tag type="success" effect="plain" round>{{ enabledScheduleCount }} 条策略运行中</el-tag></div>
            </div>
            <el-table :data="schedules" row-key="id" class="schedule-table">
              <el-table-column label="策略名称" min-width="235">
                <template #default="scope"><div class="schedule-name"><div class="schedule-icon" :style="{ color: taskTypeMeta(scope.row.taskType).color, background: `${taskTypeMeta(scope.row.taskType).color}16` }"><el-icon><Connection /></el-icon></div><div><strong>{{ scope.row.name }}</strong><span>{{ scope.row.description }}</span></div></div></template>
              </el-table-column>
              <el-table-column label="执行频率" width="145"><template #default="scope"><div class="frequency-cell"><strong>{{ frequencyMeta(scope.row.frequency).label }}</strong><span>{{ frequencyMeta(scope.row.frequency).cron }}</span></div></template></el-table-column>
              <el-table-column label="作用范围" min-width="145"><template #default="scope"><span class="scope-text">{{ scope.row.scope }}</span></template></el-table-column>
              <el-table-column label="最近执行" width="164"><template #default="scope"><div class="last-run"><strong>{{ scope.row.lastRun }}</strong><el-tag :type="statusMeta(scope.row.lastStatus).type" size="small" effect="plain">{{ statusMeta(scope.row.lastStatus).label }}</el-tag></div></template></el-table-column>
              <el-table-column label="下次执行" width="164"><template #default="scope"><span :class="['next-run', { paused: !scope.row.enabled }]">{{ scope.row.nextRun }}</span></template></el-table-column>
              <el-table-column label="近 30 日成功率" width="130" align="center"><template #default="scope"><div class="health-cell"><strong :class="{ warning: scope.row.successRate < 98 }">{{ scope.row.successRate }}%</strong><el-progress :percentage="scope.row.successRate" :show-text="false" :stroke-width="4" :color="scope.row.successRate < 98 ? '#f59e0b' : '#10b981'" /></div></template></el-table-column>
              <el-table-column label="状态" width="100" align="center"><template #default="scope"><span :class="['schedule-state', { active: scope.row.enabled }]"><i />{{ scope.row.enabled ? '运行中' : '已暂停' }}</span></template></el-table-column>
              <el-table-column label="操作" width="235" align="center" fixed="right">
                <template #default="scope"><el-button type="primary" link :icon="VideoPlay" @click="runSchedule(scope.row)">立即执行</el-button><el-button type="primary" link :icon="EditPen" @click="openScheduleEditor(scope.row)">配置</el-button><el-button :type="scope.row.enabled ? 'danger' : 'success'" link :icon="SwitchButton" @click="toggleSchedule(scope.row)">{{ scope.row.enabled ? '暂停' : '恢复' }}</el-button></template>
              </el-table-column>
            </el-table>
          </template>
        </el-card>

        <el-drawer v-model="detailOpen" size="660px" :with-header="false" destroy-on-close>
          <template v-if="detailTask">
            <div class="detail-head">
              <button type="button" class="drawer-close" @click="detailOpen = false"><el-icon><Close /></el-icon></button>
              <div class="detail-head-top"><div><span>同步任务</span><h2>{{ detailTask.taskName }}</h2></div><el-tag :type="statusMeta(detailTask.status).type" effect="dark" round>{{ statusMeta(detailTask.status).label }}</el-tag></div>
              <p>{{ detailTask.taskNo }} · {{ detailTask.shopName }}</p>
              <div class="detail-progress"><div><span>{{ progressText(detailTask) }}</span><strong>{{ detailTask.progress }}%</strong></div><el-progress :percentage="detailTask.progress" :stroke-width="7" :show-text="false" :status="progressStatus(detailTask.status)" /></div>
            </div>
            <div class="detail-body">
              <section class="detail-metrics">
                <div><span>处理总数</span><strong>{{ formatNumber(detailTask.totalCount) }}</strong></div>
                <div><span>成功</span><strong class="success">{{ formatNumber(detailTask.successCount) }}</strong></div>
                <div><span>跳过</span><strong>{{ formatNumber(detailTask.skippedCount) }}</strong></div>
                <div><span>失败</span><strong class="danger">{{ formatNumber(detailTask.failedCount) }}</strong></div>
              </section>
              <section v-if="detailTask.errorSummary" class="detail-alert"><el-icon><WarningFilled /></el-icon><div><strong>{{ detailTask.status === 'failed' ? '任务执行失败' : '存在未同步记录' }}</strong><p>{{ detailTask.errorSummary }}</p></div><el-button link :icon="CopyDocument" @click="copyError(detailTask.errorSummary)">复制</el-button></section>
              <section class="detail-section">
                <h3><el-icon><DataLine /></el-icon>执行步骤</h3>
                <div class="step-list">
                  <div v-for="(step, index) in detailTask.steps" :key="step.title" :class="['step-item', step.status]">
                    <div class="step-index"><el-icon v-if="step.status === 'success'"><Check /></el-icon><el-icon v-else-if="step.status === 'error'"><Close /></el-icon><span v-else>{{ index + 1 }}</span></div>
                    <div><strong>{{ step.title }}</strong><span>{{ step.description }}</span></div>
                    <small>{{ stepStatusLabel(step.status) }}</small>
                  </div>
                </div>
              </section>
              <section class="detail-section">
                <h3><el-icon><Tickets /></el-icon>任务参数</h3>
                <div class="detail-grid">
                  <div><span>同步类型</span><strong>{{ taskTypeMeta(detailTask.taskType).label }}</strong></div>
                  <div><span>同步模式</span><strong>{{ detailTask.mode === 'full' ? '全量同步' : '增量同步' }}</strong></div>
                  <div><span>触发方式</span><strong>{{ triggerLabel(detailTask.trigger) }}</strong></div>
                  <div><span>执行人</span><strong>{{ detailTask.operator }}</strong></div>
                  <div><span>开始时间</span><strong>{{ detailTask.startedAt || '等待执行' }}</strong></div>
                  <div><span>结束时间</span><strong>{{ detailTask.finishedAt || '—' }}</strong></div>
                  <div v-if="detailTask.params.dateRange.length" class="full"><span>数据时间范围</span><strong>{{ detailTask.params.dateRange.join(' 至 ') }}</strong></div>
                  <div v-if="detailTask.remark" class="full"><span>任务备注</span><strong>{{ detailTask.remark }}</strong></div>
                </div>
              </section>
              <section v-if="detailTask.failures.length" class="detail-section">
                <div class="section-title-row"><h3><el-icon><WarningFilled /></el-icon>失败明细</h3><el-button link :icon="Download" @click="exportFailures(detailTask)">导出失败记录</el-button></div>
                <el-table :data="detailTask.failures" size="small" class="failure-table"><el-table-column prop="rowNo" label="#" width="45" /><el-table-column prop="entityId" label="数据标识" width="135" /><el-table-column prop="reason" label="失败原因" min-width="250" /></el-table>
              </section>
              <section class="detail-section">
                <h3><el-icon><Document /></el-icon>执行日志</h3>
                <div class="log-console"><div v-for="(log, index) in detailTask.logs" :key="index"><span>{{ log.time }}</span><b :class="log.level.toLowerCase()">{{ log.level }}</b><p>{{ log.message }}</p></div></div>
              </section>
            </div>
            <div class="detail-footer"><el-button @click="detailOpen = false">关闭</el-button><el-button v-if="['failed', 'partial', 'cancelled'].includes(detailTask.status)" type="primary" :icon="RefreshRight" @click="retryTask(detailTask)">重试任务</el-button><el-button v-else-if="['queued', 'running'].includes(detailTask.status)" type="danger" :icon="CircleClose" @click="cancelTask(detailTask)">取消任务</el-button><el-button v-else type="primary" :icon="VideoPlay" @click="runAgain(detailTask)">再次执行</el-button></div>
          </template>
        </el-drawer>

        <el-dialog v-model="taskDialogOpen" title="新建同步任务" width="680px" :close-on-click-modal="false">
          <el-alert title="任务将写入持久化队列，由后台执行器异步处理；关闭页面不会中断任务。" type="info" :closable="false" show-icon class="demo-alert" />
          <el-form ref="taskForm" :model="taskForm" :rules="taskRules" label-position="top">
            <div class="form-section-title">同步范围</div>
            <el-row :gutter="18">
              <el-col :xs="24" :sm="12"><el-form-item label="妙手配置" prop="miaoshouConfigId"><el-select v-model="taskForm.miaoshouConfigId" placeholder="请选择妙手配置" style="width: 100%" @change="handleTaskConfigChange"><el-option v-for="config in miaoshouConfigs" :key="config.id" :label="config.configName || config.name" :value="config.id" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="同步类型" prop="taskType"><el-select v-model="taskForm.taskType" placeholder="请选择同步类型" style="width: 100%"><el-option v-for="type in taskTypeOptions" :key="type.value" :label="type.label" :value="type.value"><div class="type-option"><i :style="{ background: type.color }" /><span>{{ type.label }}</span><small>{{ type.description }}</small></div></el-option></el-select></el-form-item></el-col>
              <el-col v-if="['package', 'tracking'].includes(taskForm.taskType)" :span="24"><el-form-item label="目标店铺"><el-select v-model="taskForm.shopIds" multiple collapse-tags collapse-tags-tooltip placeholder="不选择表示全部启用店铺" filterable style="width: 100%"><el-option v-for="shop in taskShopOptions" :key="shop.value" :label="shop.label" :value="shop.value" /></el-select></el-form-item></el-col>
              <el-col v-else-if="taskForm.taskType === 'shop'" :span="24"><el-form-item label="目标站点" prop="sites"><el-select v-model="taskForm.sites" multiple placeholder="请选择站点" filterable allow-create default-first-option style="width: 100%"><el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" /></el-select></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="同步模式" prop="mode"><el-radio-group v-model="taskForm.mode"><el-radio-button value="incremental">增量同步</el-radio-button><el-radio-button value="full">全量同步</el-radio-button></el-radio-group></el-form-item></el-col>
              <el-col :xs="24" :sm="12"><el-form-item label="执行方式" prop="queueMode"><el-radio-group v-model="taskForm.queueMode"><el-radio-button value="immediate">立即执行</el-radio-button><el-radio-button value="queued">加入队列</el-radio-button></el-radio-group></el-form-item></el-col>
              <el-col v-if="['package', 'tracking'].includes(taskForm.taskType)" :span="24"><el-form-item label="订单修改时间范围"><el-date-picker v-model="taskForm.dateRange" type="datetimerange" value-format="YYYY-MM-DD HH:mm:ss" range-separator="至" start-placeholder="开始时间（可选）" end-placeholder="结束时间（可选）" :disabled-date="disableFutureDate" style="width: 100%" /></el-form-item></el-col>
            </el-row>
            <el-alert v-if="taskForm.mode === 'full'" title="全量同步将重新扫描店铺全部数据，耗时较长，请避免频繁执行。" type="warning" :closable="false" show-icon class="mode-alert" />
            <el-form-item label="任务备注"><el-input v-model="taskForm.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="填写本次同步目的或注意事项" /></el-form-item>
          </el-form>
          <template #footer><el-button @click="taskDialogOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitTask">创建任务</el-button></template>
        </el-dialog>

        <el-dialog v-model="scheduleDialogOpen" title="配置定时策略" width="560px" :close-on-click-modal="false">
          <el-alert title="策略由持久化调度器触发，服务重启后仍会继续计算下一次执行时间。" type="info" :closable="false" show-icon class="demo-alert" />
          <el-form ref="scheduleForm" :model="scheduleForm" :rules="scheduleRules" label-position="top">
            <el-form-item label="策略名称" prop="name"><el-input v-model="scheduleForm.name" /></el-form-item>
            <el-row :gutter="16"><el-col :span="12"><el-form-item label="妙手配置" prop="miaoshouConfigId"><el-select v-model="scheduleForm.miaoshouConfigId" style="width: 100%"><el-option v-for="config in miaoshouConfigs" :key="config.id" :label="config.configName || config.name" :value="config.id" /></el-select></el-form-item></el-col><el-col :span="12"><el-form-item label="同步类型" prop="taskType"><el-select v-model="scheduleForm.taskType" style="width: 100%"><el-option v-for="type in taskTypeOptions" :key="type.value" :label="type.label" :value="type.value" /></el-select></el-form-item></el-col></el-row>
            <el-form-item v-if="['package', 'tracking'].includes(scheduleForm.taskType)" label="目标店铺"><el-select v-model="scheduleForm.shopIds" multiple collapse-tags placeholder="不选择表示全部启用店铺" style="width: 100%"><el-option v-for="shop in scheduleShopOptions" :key="shop.value" :label="shop.label" :value="shop.value" /></el-select></el-form-item>
            <el-form-item v-else label="目标站点" prop="sites"><el-select v-model="scheduleForm.sites" multiple filterable allow-create default-first-option style="width: 100%"><el-option v-for="site in siteOptions" :key="site.value" :label="site.label" :value="site.value" /></el-select></el-form-item>
            <el-form-item label="执行频率" prop="frequency"><el-select v-model="scheduleForm.frequency" style="width: 100%"><el-option v-for="frequency in frequencyOptions" :key="frequency.value" :label="`${frequency.label}（${frequency.cron}）`" :value="frequency.value" /></el-select></el-form-item>
            <el-form-item label="任务错过后的处理"><el-radio-group v-model="scheduleForm.misfirePolicy"><el-radio value="once">恢复后执行一次</el-radio><el-radio value="skip">跳过本次</el-radio></el-radio-group></el-form-item>
            <el-form-item label="并发策略"><el-radio-group v-model="scheduleForm.concurrent"><el-radio value="forbid">禁止同类任务并发</el-radio><el-radio value="allow">允许并发</el-radio></el-radio-group></el-form-item>
            <el-form-item label="策略状态"><el-switch v-model="scheduleForm.enabled" active-text="启用" inactive-text="暂停" /></el-form-item>
          </el-form>
          <template #footer><el-button @click="scheduleDialogOpen = false">取消</el-button><el-button type="primary" :loading="saving" @click="submitSchedule">保存策略</el-button></template>
        </el-dialog>
      </div>
    </template>
  </BasicLayout>
</template>

<script>
import { ElMessageBox } from 'element-plus'
import {
  Check, CircleCheck, CircleClose, Clock, Close, Connection, CopyDocument, DataLine,
  Document, Download, EditPen, Loading, Plus, Refresh, RefreshLeft, RefreshRight, Search,
  SwitchButton, Tickets, Timer, User, VideoPlay, View, WarningFilled
} from '@element-plus/icons-vue'
import { listMiaoshouConfig } from '@/api/admin/miaoshou-config'
import { listCrossBorderShops } from '@/api/cross-border/shop'
import {
  cancelCrossBorderSyncTask, createCrossBorderSyncSchedule, createCrossBorderSyncTask,
  getCrossBorderSyncTask, getCrossBorderSyncTaskSummary, listCrossBorderSyncSchedules,
  listCrossBorderSyncTasks, retryCrossBorderSyncTask, runCrossBorderSyncSchedule,
  runCrossBorderSyncTaskAgain, toggleCrossBorderSyncSchedule, updateCrossBorderSyncSchedule
} from '@/api/cross-border/sync-task'

const taskTypeOptions = [
  { value: 'package', label: '包裹与订单', shortLabel: '包裹', color: '#2563eb', description: '同步包裹并由包裹数据反推订单' },
  { value: 'tracking', label: '包裹物流轨迹', shortLabel: '轨迹', color: '#0891b2', description: '逐包裹同步物流轨迹并自动去重' },
  { value: 'shop', label: '店铺资料', shortLabel: '店铺', color: '#7c3aed', description: '按站点同步妙手店铺和授权资料' }
]
const taskStatusOptions = [
  { value: 'queued', label: '等待执行', type: 'info' },
  { value: 'running', label: '运行中', type: 'primary' },
  { value: 'success', label: '执行成功', type: 'success' },
  { value: 'partial', label: '部分成功', type: 'warning' },
  { value: 'failed', label: '执行失败', type: 'danger' },
  { value: 'cancelled', label: '已取消', type: 'info' }
]
const triggerOptions = [
  { value: 'schedule', label: '定时触发' },
  { value: 'manual', label: '手动执行' },
  { value: 'retry', label: '失败重试' }
]
const frequencyOptions = [
  { value: '5m', label: '每 5 分钟', cron: '0 */5 * * * *' },
  { value: '30m', label: '每 30 分钟', cron: '0 */30 * * * *' },
  { value: '1h', label: '每小时', cron: '0 0 * * * *' },
  { value: 'daily2', label: '每天凌晨 02:00', cron: '0 0 2 * * *' },
  { value: 'daily8', label: '每天上午 08:00', cron: '0 0 8 * * *' }
]

export default {
  name: 'SyncTask',
  setup() {
    return {
      Check, CircleCheck, CircleClose, Clock, Close, Connection, CopyDocument, DataLine,
      Document, Download, EditPen, Loading, Plus, Refresh, RefreshLeft, RefreshRight, Search,
      SwitchButton, Tickets, Timer, User, VideoPlay, View, WarningFilled
    }
  },
  data() {
    const taskSiteValidator = (rule, value, callback) => {
      if (this.taskForm.taskType === 'shop' && (!value || !value.length)) callback(new Error('请选择至少一个站点'))
      else callback()
    }
    const scheduleSiteValidator = (rule, value, callback) => {
      if (this.scheduleForm.taskType === 'shop' && (!value || !value.length)) callback(new Error('请选择至少一个站点'))
      else callback()
    }
    return {
      syncTasks: [],
      taskTotal: 0,
      schedules: [],
      frequencyOptions,
      shopOptions: [],
      shops: [],
      miaoshouConfigs: [],
      taskStatusOptions,
      taskTypeOptions,
      triggerOptions,
      summary: { today: 0, running: 0, queued: 0, success: 0, issue: 0, records: 0, successRate: 100 },
      activeView: 'records',
      activeStatus: 'all',
      loading: false,
      saving: false,
      lastRefresh: '',
      selectedIds: [],
      detailOpen: false,
      detailTask: null,
      taskDialogOpen: false,
      taskForm: {},
      scheduleDialogOpen: false,
      editingSchedule: null,
      scheduleForm: {},
      pollTimer: null,
      queryParams: { keyword: '', taskType: '', shopId: '', trigger: '', dateRange: [], pageIndex: 1, pageSize: 10 },
      taskRules: {
        miaoshouConfigId: [{ required: true, message: '请选择妙手配置', trigger: 'change' }],
        taskType: [{ required: true, message: '请选择同步类型', trigger: 'change' }],
        sites: [{ validator: taskSiteValidator, trigger: 'change' }],
        mode: [{ required: true, message: '请选择同步模式', trigger: 'change' }],
        queueMode: [{ required: true, message: '请选择执行方式', trigger: 'change' }]
      },
      scheduleRules: {
        name: [{ required: true, message: '请输入策略名称', trigger: 'blur' }],
        miaoshouConfigId: [{ required: true, message: '请选择妙手配置', trigger: 'change' }],
        taskType: [{ required: true, message: '请选择同步类型', trigger: 'change' }],
        sites: [{ validator: scheduleSiteValidator, trigger: 'change' }],
        frequency: [{ required: true, message: '请选择执行频率', trigger: 'change' }]
      }
    }
  },
  computed: {
    statusTabs() {
      const countMap = {
        all: this.taskTotal,
        queued: this.summary.queued,
        running: this.summary.running,
        success: this.summary.success,
        partial: this.syncTasks.filter(item => item.status === 'partial').length,
        failed: this.summary.issue,
        cancelled: this.syncTasks.filter(item => item.status === 'cancelled').length
      }
      return [{ value: 'all', label: '全部任务' }, ...this.taskStatusOptions].map(item => ({ ...item, count: countMap[item.value] || 0 }))
    },
    filteredTasks() { return this.syncTasks },
    pagedTasks() { return this.syncTasks },
    retryableSelectedCount() {
      return this.syncTasks.filter(task => this.selectedIds.includes(task.id) && ['failed', 'partial', 'cancelled'].includes(task.status)).length
    },
    enabledScheduleCount() { return this.schedules.filter(schedule => schedule.enabled).length },
    taskShopOptions() { return this.shopOptions.filter(item => !this.taskForm.miaoshouConfigId || item.miaoshouConfigId === this.taskForm.miaoshouConfigId) },
    scheduleShopOptions() { return this.shopOptions.filter(item => !this.scheduleForm.miaoshouConfigId || item.miaoshouConfigId === this.scheduleForm.miaoshouConfigId) },
    siteOptions() {
      const sites = new Map()
      this.shops.forEach(shop => {
        if (shop.siteCode) sites.set(shop.siteCode, shop.siteName || shop.siteCode)
      })
      return [...sites.entries()].map(([value, name]) => ({ value, label: name + '（' + value + '）' }))
    }
  },
  watch: {
    'queryParams.pageIndex'() { this.getTasks() },
    'queryParams.pageSize'() {
      if (this.queryParams.pageIndex !== 1) this.queryParams.pageIndex = 1
      else this.getTasks()
    }
  },
  created() {
    this.taskForm = this.createEmptyTaskForm()
    this.scheduleForm = this.createEmptyScheduleForm()
    Promise.allSettled([this.loadMiaoshouConfigs(), this.loadShops(), this.loadAllData()])
    this.pollTimer = window.setInterval(() => this.pollData(), 3000)
  },
  beforeUnmount() {
    if (this.pollTimer) window.clearInterval(this.pollTimer)
  },
  methods: {
    createEmptyTaskForm() {
      return { taskType: 'package', miaoshouConfigId: undefined, shopIds: [], sites: [], mode: 'incremental', queueMode: 'immediate', dateRange: [], remark: '' }
    },
    createEmptyScheduleForm() {
      return { name: '', taskType: 'package', miaoshouConfigId: undefined, shopIds: [], sites: [], mode: 'incremental', frequency: '30m', misfirePolicy: 'once', concurrent: 'forbid', enabled: true, description: '' }
    },
    nowText() { return this.formatTime(new Date()) },
    formatTime(value) {
      if (!value) return ''
      const date = value instanceof Date ? value : new Date(value)
      if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19)
      const pad = item => String(item).padStart(2, '0')
      return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    },
    disableFutureDate(value) { return value.getTime() > Date.now() },
    taskTypeMeta(type) { return this.taskTypeOptions.find(item => item.value === type) || { label: type, color: '#64748b' } },
    statusMeta(status) { return this.taskStatusOptions.find(item => item.value === status) || { label: status || '未知', type: 'info' } },
    frequencyMeta(frequency) { return this.frequencyOptions.find(item => item.value === frequency) || { label: frequency, cron: '' } },
    triggerLabel(trigger) { return (this.triggerOptions.find(item => item.value === trigger) || {}).label || trigger },
    formatNumber(value) { return Number(value || 0).toLocaleString('zh-CN') },
    formatDuration(seconds, status) {
      if (status === 'queued') return '等待中'
      if (!seconds) return '—'
      if (seconds < 60) return seconds + 's'
      return Math.floor(seconds / 60) + 'm ' + seconds % 60 + 's'
    },
    progressText(task) {
      if (task.status === 'queued') return '等待调度资源'
      if (task.status === 'running') return '已处理 ' + this.formatNumber(task.successCount + task.failedCount + task.skippedCount) + ' / ' + this.formatNumber(task.totalCount)
      if (task.status === 'cancelled') return '执行已中止'
      return '共处理 ' + this.formatNumber(task.totalCount) + ' 条'
    },
    progressStatus(status) {
      if (status === 'success') return 'success'
      if (status === 'failed') return 'exception'
      if (status === 'partial') return 'warning'
      return undefined
    },
    stepStatusLabel(status) { return { pending: '等待', process: '进行中', success: '完成', error: '失败' }[status] },
    buildRuntimeSteps(status, progress) {
      const definitions = [
        ['校验任务参数', '读取妙手配置并验证同步范围'],
        ['调用妙手接口', '按页拉取包裹或店铺数据'],
        ['幂等写入数据', '识别新增、更新与未变化记录'],
        ['汇总执行结果', '持久化统计、错误和关联记录']
      ]
      return definitions.map((definition, index) => {
        const completed = Math.floor(Number(progress || 0) / 25)
        let stepStatus = status === 'success' || status === 'partial' ? 'success' : index < completed ? 'success' : index === completed && status === 'running' ? 'process' : 'pending'
        if (status === 'failed' && index === Math.min(completed, 3)) stepStatus = 'error'
        return { title: definition[0], description: definition[1], status: stepStatus }
      })
    },
    mapTask(row) {
      const params = row.params || {}
      const dateRange = [params.gmtModifiedFrom, params.gmtModifiedTo].filter(Boolean)
      const createdAt = this.formatTime(row.createdAt)
      const startedAt = this.formatTime(row.startedAt)
      const finishedAt = this.formatTime(row.finishedAt)
      const logs = [{ time: createdAt.slice(11), level: 'INFO', message: '任务已写入持久化队列' }]
      if (startedAt) logs.push({ time: startedAt.slice(11), level: 'INFO', message: '后台执行器已领取任务并开始同步' })
      if (finishedAt) {
        const level = row.status === 'success' ? 'SUCCESS' : row.status === 'partial' ? 'WARN' : row.status === 'cancelled' ? 'WARN' : 'ERROR'
        logs.push({ time: finishedAt.slice(11), level, message: row.errorMessage || ('任务执行结束，状态：' + this.statusMeta(row.status).label) })
      }
      const shopIDs = row.shopIds || params.shopIds || []
      return {
        ...row,
        shopId: shopIDs.length === 1 ? String(shopIDs[0]) : '',
        shopName: row.targetName || '全部启用店铺',
        siteCode: row.siteCode || 'ALL',
        siteName: row.siteName || '多站点',
        trigger: row.triggerType || 'manual',
        createdAt,
        startedAt,
        finishedAt,
        errorSummary: row.errorMessage || '',
        params: { ...params, dateRange, conflictPolicy: 'platformPriority' },
        steps: this.buildRuntimeSteps(row.status, row.progress),
        logs,
        failures: []
      }
    },
    mapSchedule(row) {
      return {
        ...row,
        enabled: Number(row.enabled) === 1,
        scope: row.scopeName || '全部启用店铺',
        lastRun: this.formatTime(row.lastRunAt) || '尚未执行',
        nextRun: Number(row.enabled) === 1 ? (this.formatTime(row.nextRunAt) || '等待调度计算') : '已暂停',
        lastStatus: row.lastStatus || 'queued',
        successRate: Number(row.successRate == null ? 100 : row.successRate)
      }
    },
    getTasks() {
      this.loading = true
      const range = this.queryParams.dateRange || []
      return listCrossBorderSyncTasks({
        keyword: this.queryParams.keyword || undefined,
        taskType: this.queryParams.taskType || undefined,
        status: this.activeStatus === 'all' ? undefined : this.activeStatus,
        triggerType: this.queryParams.trigger || undefined,
        shopId: this.queryParams.shopId || undefined,
        createdFrom: range[0],
        createdTo: range[1],
        pageIndex: this.queryParams.pageIndex,
        pageSize: this.queryParams.pageSize
      }).then(response => {
        this.syncTasks = (response.data.list || []).map(this.mapTask)
        this.taskTotal = response.data.count || 0
        if (this.detailTask) {
          const current = this.syncTasks.find(item => item.id === this.detailTask.id)
          if (current) this.detailTask = current
        }
        this.lastRefresh = this.nowText()
      }).finally(() => { this.loading = false })
    },
    getSummary() {
      return getCrossBorderSyncTaskSummary().then(response => { this.summary = { ...this.summary, ...(response.data || {}) } })
    },
    getSchedules() {
      return listCrossBorderSyncSchedules().then(response => { this.schedules = (response.data || []).map(this.mapSchedule) })
    },
    loadAllData() { return Promise.all([this.getTasks(), this.getSummary(), this.getSchedules()]) },
    pollData() {
      if (document.hidden) return
      const calls = [this.getTasks(), this.getSummary()]
      if (this.activeView === 'schedules') calls.push(this.getSchedules())
      Promise.allSettled(calls)
    },
    loadMiaoshouConfigs() {
      return listMiaoshouConfig({ pageIndex: 1, pageSize: 100, status: 1 }).then(response => {
        this.miaoshouConfigs = response.data.list || []
        const first = this.miaoshouConfigs[0]
        if (first) {
          if (!this.taskForm.miaoshouConfigId) this.taskForm.miaoshouConfigId = first.id
          if (!this.scheduleForm.miaoshouConfigId) this.scheduleForm.miaoshouConfigId = first.id
        }
      })
    },
    loadShops() {
      return listCrossBorderShops({ pageIndex: 1, pageSize: 200, localStatus: 1 }).then(response => {
        this.shops = response.data.list || []
        this.shopOptions = this.shops.map(shop => ({
          value: String(shop.remoteShopId),
          label: (shop.shopName || shop.platformShopName || shop.shopNick || ('店铺 ' + shop.remoteShopId)) + ' · ' + (shop.siteCode || '-'),
          siteCode: shop.siteCode,
          siteName: shop.siteName,
          miaoshouConfigId: shop.miaoshouConfigId
        }))
      })
    },
    handleTaskConfigChange() { this.taskForm.shopIds = [] },
    handleViewChange(name) {
      this.selectedIds = []
      if (name === 'schedules') this.getSchedules()
    },
    handleStatusTab() { this.queryParams.pageIndex = 1; this.getTasks() },
    handleQuery() { this.queryParams.pageIndex = 1; this.getTasks() },
    resetQuery() {
      const pageSize = this.queryParams.pageSize
      this.queryParams = { keyword: '', taskType: '', shopId: '', trigger: '', dateRange: [], pageIndex: 1, pageSize }
      this.activeStatus = 'all'
      this.getTasks()
    },
    refreshTasks() { return this.loadAllData().then(() => this.msgSuccess('同步任务数据已刷新')) },
    handleSelectionChange(rows) { this.selectedIds = rows.map(row => row.id) },
    openDetail(task) {
      this.detailTask = task
      this.detailOpen = true
      getCrossBorderSyncTask(task.id).then(response => { this.detailTask = this.mapTask(response.data || task) })
    },
    openCreateTask() {
      this.taskForm = this.createEmptyTaskForm()
      if (this.miaoshouConfigs.length) this.taskForm.miaoshouConfigId = this.miaoshouConfigs[0].id
      this.taskDialogOpen = true
      this.$nextTick(() => this.$refs.taskForm?.clearValidate())
    },
    normalizedTaskRange() {
      const range = this.taskForm.dateRange || []
      if (range.length !== 2) return []
      const now = new Date()
      const end = new Date(range[1].replace(' ', 'T'))
      return [range[0], end > now ? this.formatTime(now) : range[1]]
    },
    submitTask() {
      this.$refs.taskForm.validate(valid => {
        if (!valid) return
        const range = this.normalizedTaskRange()
        const payload = {
          taskType: this.taskForm.taskType,
          miaoshouConfigId: this.taskForm.miaoshouConfigId,
          platform: 'tiktok',
          shopIds: ['package', 'tracking'].includes(this.taskForm.taskType) ? this.taskForm.shopIds.map(Number) : [],
          sites: this.taskForm.taskType === 'shop' ? this.taskForm.sites : [],
          mode: this.taskForm.mode,
          queueMode: this.taskForm.queueMode,
          gmtModifiedFrom: range[0] || '',
          gmtModifiedTo: range[1] || '',
          remark: this.taskForm.remark
        }
        this.saving = true
        createCrossBorderSyncTask(payload).then(() => {
          this.taskDialogOpen = false
          this.activeView = 'records'
          this.activeStatus = 'all'
          this.queryParams.pageIndex = 1
          return Promise.all([this.getTasks(), this.getSummary()])
        }).then(() => this.msgSuccess('同步任务已进入后台队列')).finally(() => { this.saving = false })
      })
    },
    retryTask(task) {
      this.detailOpen = false
      ElMessageBox.confirm('确认重试任务“' + task.taskName + '”吗？系统将创建一条新的执行记录。', '重试同步任务', { confirmButtonText: '开始重试', cancelButtonText: '取消', type: 'warning' })
        .then(() => retryCrossBorderSyncTask(task.id))
        .then(() => this.loadAllData())
        .then(() => this.msgSuccess('重试任务已进入后台队列'))
        .catch(() => {})
    },
    runAgain(task) {
      runCrossBorderSyncTaskAgain(task.id).then(() => {
        this.detailOpen = false
        return this.loadAllData()
      }).then(() => this.msgSuccess('任务已再次进入后台队列'))
    },
    cancelTask(task) {
      this.detailOpen = false
      ElMessageBox.confirm('确认取消任务“' + task.taskName + '”吗？已写入的数据不会回滚。', '取消同步任务', { confirmButtonText: '确认取消', cancelButtonText: '返回', type: 'warning' })
        .then(() => cancelCrossBorderSyncTask(task.id))
        .then(() => this.loadAllData())
        .then(() => this.msgSuccess('取消请求已提交'))
        .catch(() => {})
    },
    batchRetry() {
      const selected = this.syncTasks.filter(task => this.selectedIds.includes(task.id) && ['failed', 'partial', 'cancelled'].includes(task.status))
      if (!selected.length) return
      ElMessageBox.confirm('确认重试选中的 ' + selected.length + ' 条异常任务吗？', '批量重试', { confirmButtonText: '开始重试', cancelButtonText: '取消', type: 'warning' })
        .then(() => Promise.all(selected.map(task => retryCrossBorderSyncTask(task.id))))
        .then(() => this.loadAllData())
        .then(() => this.msgSuccess('已创建 ' + selected.length + ' 条重试任务'))
        .catch(() => {})
    },
    runSchedule(schedule) {
      runCrossBorderSyncSchedule(schedule.id).then(() => {
        this.activeView = 'records'
        this.activeStatus = 'all'
        return this.loadAllData()
      }).then(() => this.msgSuccess('定时策略已手动触发'))
    },
    toggleSchedule(schedule) {
      const action = schedule.enabled ? '暂停' : '恢复'
      ElMessageBox.confirm('确认' + action + '定时策略“' + schedule.name + '”吗？', action + '定时策略', { confirmButtonText: '确认' + action, cancelButtonText: '取消', type: schedule.enabled ? 'warning' : 'info' })
        .then(() => toggleCrossBorderSyncSchedule(schedule.id, !schedule.enabled))
        .then(() => this.getSchedules())
        .then(() => this.msgSuccess('定时策略已' + action))
        .catch(() => {})
    },
    openScheduleEditor(schedule) {
      this.editingSchedule = schedule
      this.scheduleForm = schedule ? {
        name: schedule.name,
        description: schedule.description || '',
        taskType: schedule.taskType,
        miaoshouConfigId: schedule.miaoshouConfigId,
        shopIds: schedule.shopIds || [],
        sites: schedule.sites || [],
        mode: schedule.mode || 'incremental',
        frequency: schedule.frequency,
        misfirePolicy: schedule.misfirePolicy || 'once',
        concurrent: schedule.concurrentPolicy || 'forbid',
        enabled: schedule.enabled
      } : this.createEmptyScheduleForm()
      if (!this.scheduleForm.miaoshouConfigId && this.miaoshouConfigs.length) this.scheduleForm.miaoshouConfigId = this.miaoshouConfigs[0].id
      this.scheduleDialogOpen = true
      this.$nextTick(() => this.$refs.scheduleForm?.clearValidate())
    },
    submitSchedule() {
      this.$refs.scheduleForm.validate(valid => {
        if (!valid) return
        const frequency = this.frequencyMeta(this.scheduleForm.frequency)
        const payload = {
          name: this.scheduleForm.name,
          description: this.scheduleForm.description || (this.taskTypeMeta(this.scheduleForm.taskType).label + '自动同步'),
          taskType: this.scheduleForm.taskType,
          miaoshouConfigId: this.scheduleForm.miaoshouConfigId,
          platform: 'tiktok',
          shopIds: ['package', 'tracking'].includes(this.scheduleForm.taskType) ? this.scheduleForm.shopIds.map(Number) : [],
          sites: this.scheduleForm.taskType === 'shop' ? this.scheduleForm.sites : [],
          mode: this.scheduleForm.mode,
          frequency: this.scheduleForm.frequency,
          cronExpression: frequency.cron,
          timezone: 'Asia/Shanghai',
          enabled: this.scheduleForm.enabled,
          misfirePolicy: this.scheduleForm.misfirePolicy,
          concurrentPolicy: this.scheduleForm.concurrent
        }
        this.saving = true
        const request = this.editingSchedule
          ? updateCrossBorderSyncSchedule(this.editingSchedule.id, payload)
          : createCrossBorderSyncSchedule(payload)
        request.then(() => {
          this.scheduleDialogOpen = false
          return this.getSchedules()
        }).then(() => this.msgSuccess(this.editingSchedule ? '定时策略已更新' : '定时策略已创建')).finally(() => { this.saving = false })
      })
    },
    copyError(text) {
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => this.msgSuccess('错误信息已复制')).catch(() => this.msgError('复制失败，请手动选择文本'))
      else this.msgError('当前浏览器不支持自动复制')
    },
    exportSelection() {
      const selected = this.syncTasks.filter(task => this.selectedIds.includes(task.id))
      if (!selected.length) return
      const rows = selected.map(task => [task.taskNo, task.taskName, this.taskTypeMeta(task.taskType).label, task.shopName, this.triggerLabel(task.trigger), this.statusMeta(task.status).label, task.totalCount, task.successCount, task.failedCount, task.createdAt, task.finishedAt])
      this.downloadCsv('同步任务执行记录', ['任务编号', '任务名称', '同步类型', '店铺', '触发方式', '状态', '总数', '成功', '失败', '创建时间', '结束时间'], rows)
      this.msgSuccess('已导出 ' + selected.length + ' 条任务记录')
    },
    exportFailures(task) {
      const rows = task.failures.map(item => [item.rowNo, item.entityId, item.reason])
      this.downloadCsv(task.taskNo + '_失败记录', ['序号', '数据标识', '失败原因'], rows)
      this.msgSuccess('已导出 ' + rows.length + ' 条失败记录')
    },
    downloadCsv(name, headers, rows) {
      const escapeCell = value => '"' + String(value == null ? '' : value).replace(/"/g, '""') + '"'
      const csv = [headers, ...rows].map(row => row.map(escapeCell).join(',')).join('\n')
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = name + '_' + this.nowText().slice(0, 10) + '.csv'
      link.click()
      URL.revokeObjectURL(url)
    }
  }
}
</script>

<style lang="scss" scoped>
.sync-page { min-height: calc(100vh - 110px); }
.sync-heading { min-height: 112px; margin-bottom: 14px; padding: 20px 24px; display: flex; align-items: center; justify-content: space-between; color: #fff; background: linear-gradient(118deg, #12182b 0%, #25305b 53%, #155b6e 100%); border-radius: 14px; box-shadow: 0 8px 28px rgba(24, 41, 77, .2); overflow: hidden; position: relative; }
.sync-heading::before { content: ''; position: absolute; right: 25%; top: -96px; width: 190px; height: 190px; border: 30px solid rgba(255, 255, 255, .04); border-radius: 50%; }
.sync-heading > * { position: relative; z-index: 1; }
.sync-heading h1 { margin: 3px 0 5px; font-size: 24px; line-height: 1.25; letter-spacing: 1px; }
.sync-heading p { margin: 0; color: rgba(255, 255, 255, .67); font-size: 13px; }
.eyebrow { color: #6fe1e9; font-size: 10px; font-weight: 700; letter-spacing: 2px; }
.heading-actions { display: flex; align-items: center; gap: 10px; }
.heading-actions > span { margin-right: 4px; color: rgba(255, 255, 255, .61); font-size: 11px; }
.heading-actions > span i { width: 6px; height: 6px; margin-right: 7px; display: inline-block; background: #34d399; border-radius: 50%; box-shadow: 0 0 0 4px rgba(52, 211, 153, .12); }
.heading-actions :deep(.el-button:not(.el-button--primary)) { color: #e8eef9; background: rgba(255, 255, 255, .08); border-color: rgba(255, 255, 255, .18); }
.metric-row { margin-bottom: 1px; }
.metric-card { min-height: 108px; margin-bottom: 14px; padding: 18px; display: flex; align-items: center; gap: 14px; background: #fff; border: 1px solid #edf0f6; border-radius: 13px; box-shadow: 0 3px 16px rgba(23, 34, 66, .05); transition: transform .2s ease, box-shadow .2s ease; }
.metric-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(23, 34, 66, .09); }
.metric-card > div:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }
.metric-card span { color: #667085; font-size: 12px; }
.metric-card strong { margin: 2px 0; color: #172033; font-size: 27px; line-height: 1.1; font-variant-numeric: tabular-nums; }
.metric-card small { color: #98a2b3; font-size: 10px; white-space: nowrap; }
.metric-icon { width: 46px; height: 46px; display: grid; place-items: center; border-radius: 13px; font-size: 22px; flex: 0 0 auto; }
.metric-icon.blue { color: #2563eb; background: #eaf1ff; }
.metric-icon.purple { color: #7c3aed; background: #f2ecff; }
.metric-icon.green { color: #059669; background: #e7f8f1; }
.metric-icon.red { color: #dc2626; background: #feeeee; }
.running-icon .el-icon { animation: rotate 1.6s linear infinite; }
.issue-card { border-color: #fee2e2; background: linear-gradient(135deg, #fff, #fffafa); }
.volume-card { justify-content: space-between; }
.volume-card > div:first-child { display: flex; flex-direction: column; }
.volume-card strong { font-size: 23px; }
.mini-bars { width: 68px; height: 48px; display: flex; align-items: flex-end; gap: 4px; }
.mini-bars i { width: 6px; background: linear-gradient(#36a5f5, #2563eb); border-radius: 3px 3px 1px 1px; opacity: .78; }
.sync-card { border: 0; border-radius: 14px; box-shadow: 0 3px 18px rgba(23, 34, 66, .06); }
.sync-card :deep(.el-card__body) { padding: 0; }
.workspace-tabs { padding: 0 20px; background: #fff; border-radius: 14px 14px 0 0; }
.workspace-tabs :deep(.el-tabs__header) { margin: 0; }
.workspace-tabs :deep(.el-tabs__nav-wrap::after) { height: 1px; background: #edf0f5; }
.workspace-tabs :deep(.el-tabs__item) { height: 56px; color: #667085; font-size: 14px; }
.workspace-tabs :deep(.el-tabs__item.is-active) { color: #2563eb; font-weight: 600; }
.workspace-label { display: flex; align-items: center; gap: 6px; }
.status-tabs { padding: 0 20px; background: #fbfcfe; }
.status-tabs :deep(.el-tabs__header) { margin: 0; }
.status-tabs :deep(.el-tabs__nav-wrap::after) { display: none; }
.status-tabs :deep(.el-tabs__item) { height: 47px; padding: 0 15px; color: #7b8494; font-size: 12px; }
.status-tabs :deep(.el-tabs__item.is-active) { color: #2563eb; font-weight: 600; }
.status-tabs b { min-width: 19px; height: 18px; margin-left: 5px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; color: #6b7280; background: #e9edf3; border-radius: 9px; font-size: 10px; }
.status-tabs :deep(.is-active) b { color: #2563eb; background: #e5edff; }
.task-filter { display: flex; align-items: center; padding: 15px 18px 5px; border-top: 1px solid #edf0f5; border-bottom: 1px solid #edf0f5; background: #fbfcfe; }
.task-filter :deep(.el-form-item) { margin-right: 10px; margin-bottom: 10px; }
.task-filter :deep(.el-input) { width: 218px; }
.task-filter :deep(.el-select) { width: 142px; }
.task-filter :deep(.el-date-editor) { width: 242px; }
.filter-buttons { margin-left: auto; margin-right: 0 !important; white-space: nowrap; }
.task-toolbar { min-height: 62px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; }
.toolbar-meta { display: flex; align-items: center; gap: 12px; color: #98a2b3; font-size: 12px; }
.task-table, .schedule-table { width: 100%; }
.task-table :deep(th.el-table__cell), .schedule-table :deep(th.el-table__cell) { height: 46px; color: #667085; background: #f7f8fb; font-weight: 600; }
.task-table :deep(td.el-table__cell), .schedule-table :deep(td.el-table__cell) { padding: 11px 0; }
.task-identity, .shop-cell { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.task-identity button { max-width: 218px; padding: 0; color: #344054; background: none; border: 0; font-family: inherit; font-size: 12px; font-weight: 600; text-align: left; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-identity button:hover { color: #2563eb; }
.task-identity span { color: #2563eb; font-family: Consolas, monospace; font-size: 10px; }
.task-identity small, .shop-cell span { color: #98a2b3; font-size: 10px; }
.type-cell { display: flex; align-items: center; gap: 9px; }
.type-cell > i { width: 8px; height: 31px; border-radius: 4px; flex: 0 0 auto; }
.type-cell > div { display: flex; flex-direction: column; gap: 3px; }
.type-cell strong, .shop-cell strong { color: #344054; font-size: 12px; font-weight: 600; }
.type-cell span { color: #98a2b3; font-size: 10px; }
.shop-cell i { min-width: 27px; margin-right: 6px; padding: 2px 4px; display: inline-block; color: #475467; background: #eef2f6; border-radius: 4px; font-size: 9px; font-style: normal; text-align: center; }
.trigger-pill { display: inline-flex; align-items: center; gap: 4px; color: #667085; font-size: 11px; }
.trigger-pill.schedule { color: #2563eb; }
.progress-cell { display: flex; flex-direction: column; gap: 5px; }
.progress-cell > div { display: flex; justify-content: space-between; color: #667085; font-size: 10px; }
.progress-cell > div strong { color: #344054; font-size: 11px; }
.progress-cell small { color: #98a2b3; font-size: 9px; }
.task-table :deep(.el-tag) { gap: 3px; }
.error-mark { margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 3px; color: #dc2626; font-size: 9px; }
.duration-text { color: #667085; font-variant-numeric: tabular-nums; font-size: 11px; }
.task-pagination { min-height: 70px; padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #eef1f6; }
.task-pagination > span { color: #98a2b3; font-size: 12px; }
.schedule-intro { min-height: 76px; padding: 14px 20px; display: flex; align-items: center; justify-content: space-between; background: #fbfcfe; border-bottom: 1px solid #edf0f5; }
.schedule-intro > div { display: flex; align-items: center; gap: 12px; }
.schedule-intro > div > .el-icon { width: 38px; height: 38px; color: #2563eb; background: #eaf1ff; border-radius: 10px; font-size: 20px; }
.schedule-intro > div > div { display: flex; flex-direction: column; gap: 4px; }
.schedule-intro strong { color: #344054; font-size: 13px; }
.schedule-intro span { color: #7b8494; font-size: 11px; }
.schedule-name { display: flex; align-items: center; gap: 11px; }
.schedule-icon { width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; font-size: 18px; flex: 0 0 auto; }
.schedule-name > div:last-child { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.schedule-name strong { color: #344054; font-size: 12px; }
.schedule-name span { max-width: 290px; color: #98a2b3; font-size: 10px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.frequency-cell, .last-run { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.frequency-cell strong, .last-run strong { color: #475467; font-size: 11px; font-weight: 500; }
.frequency-cell span { color: #98a2b3; font-family: Consolas, monospace; font-size: 9px; }
.scope-text, .next-run { color: #667085; font-size: 11px; }
.next-run.paused { color: #b1b8c5; }
.health-cell { padding: 0 8px; }
.health-cell strong { color: #059669; font-size: 12px; }
.health-cell strong.warning { color: #d97706; }
.health-cell :deep(.el-progress) { margin-top: 5px; }
.schedule-state { display: inline-flex; align-items: center; gap: 6px; color: #98a2b3; font-size: 11px; }
.schedule-state i { width: 7px; height: 7px; background: #b8c0cc; border-radius: 50%; }
.schedule-state.active { color: #059669; }
.schedule-state.active i { background: #10b981; box-shadow: 0 0 0 4px rgba(16, 185, 129, .1); }
.detail-head { min-height: 190px; padding: 36px 30px 25px; color: #fff; background: linear-gradient(130deg, #172033, #244568); position: relative; }
.drawer-close { position: absolute; top: 16px; right: 18px; width: 30px; height: 30px; display: grid; place-items: center; color: rgba(255, 255, 255, .75); background: rgba(255, 255, 255, .08); border: 0; border-radius: 50%; cursor: pointer; }
.detail-head-top { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; }
.detail-head-top span, .detail-head > p { color: rgba(255, 255, 255, .62); font-size: 11px; }
.detail-head h2 { margin: 5px 0 0; font-size: 20px; }
.detail-head > p { margin: 9px 0 17px; }
.detail-progress > div { margin-bottom: 7px; display: flex; justify-content: space-between; color: rgba(255, 255, 255, .72); font-size: 11px; }
.detail-progress > div strong { color: #fff; }
.detail-progress :deep(.el-progress-bar__outer) { background: rgba(255, 255, 255, .15); }
.detail-body { padding: 24px 28px 92px; }
.detail-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; }
.detail-metrics > div { padding: 13px 10px; display: flex; flex-direction: column; gap: 6px; background: #f8fafc; border: 1px solid #edf0f5; border-radius: 9px; }
.detail-metrics span { color: #98a2b3; font-size: 9px; }
.detail-metrics strong { color: #344054; font-size: 16px; }
.detail-metrics strong.success { color: #059669; }
.detail-metrics strong.danger { color: #dc2626; }
.detail-alert { margin-top: 18px; padding: 13px; display: flex; align-items: flex-start; gap: 10px; color: #b42318; background: #fff4f2; border: 1px solid #fee4e2; border-radius: 9px; }
.detail-alert > .el-icon { margin-top: 2px; flex: 0 0 auto; }
.detail-alert > div { min-width: 0; flex: 1; }
.detail-alert strong { font-size: 12px; }
.detail-alert p { margin: 4px 0 0; color: #c24135; font-size: 10px; line-height: 1.5; }
.detail-section { margin-top: 27px; }
.detail-section h3 { margin: 0 0 15px; display: flex; align-items: center; gap: 7px; color: #1d2939; font-size: 14px; }
.detail-section h3 .el-icon { color: #2563eb; }
.section-title-row { display: flex; align-items: flex-start; justify-content: space-between; }
.step-list { padding-left: 4px; }
.step-item { min-height: 56px; display: grid; grid-template-columns: 28px 1fr 54px; gap: 10px; position: relative; }
.step-item:not(:last-child)::after { content: ''; position: absolute; left: 13px; top: 28px; bottom: 0; width: 1px; background: #e4e8ef; }
.step-index { width: 28px; height: 28px; display: grid; place-items: center; color: #98a2b3; background: #f1f4f8; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 0 1px #dce2ea; font-size: 10px; z-index: 1; }
.step-item.success .step-index { color: #fff; background: #10b981; box-shadow: 0 0 0 1px #a7e6cf; }
.step-item.process .step-index { color: #fff; background: #2563eb; box-shadow: 0 0 0 3px #dbe7ff; }
.step-item.error .step-index { color: #fff; background: #ef4444; box-shadow: 0 0 0 2px #fee2e2; }
.step-item > div:nth-child(2) { display: flex; flex-direction: column; gap: 4px; }
.step-item strong { color: #344054; font-size: 11px; }
.step-item span { color: #98a2b3; font-size: 9px; }
.step-item small { padding-top: 7px; color: #98a2b3; font-size: 9px; text-align: right; }
.step-item.success small { color: #059669; }
.step-item.process small { color: #2563eb; }
.step-item.error small { color: #dc2626; }
.detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 17px 24px; }
.detail-grid > div { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.detail-grid .full { grid-column: 1 / -1; }
.detail-grid span { color: #98a2b3; font-size: 10px; }
.detail-grid strong { color: #475467; font-size: 11px; font-weight: 500; word-break: break-word; }
.failure-table { border: 1px solid #edf0f5; border-radius: 8px; }
.failure-table :deep(th.el-table__cell) { background: #f8fafc; }
.log-console { max-height: 245px; padding: 14px; overflow-y: auto; color: #cbd5e1; background: #111827; border-radius: 9px; font-family: Consolas, monospace; font-size: 9px; line-height: 1.7; }
.log-console > div { display: grid; grid-template-columns: 58px 48px 1fr; gap: 7px; }
.log-console span { color: #64748b; }
.log-console b { font-weight: 600; }
.log-console b.info { color: #60a5fa; }
.log-console b.success { color: #34d399; }
.log-console b.warn { color: #fbbf24; }
.log-console b.error { color: #fb7185; }
.log-console p { margin: 0; word-break: break-word; }
.detail-footer { position: absolute; left: 0; right: 0; bottom: 0; padding: 16px 28px; display: flex; justify-content: flex-end; background: rgba(255, 255, 255, .96); border-top: 1px solid #edf0f5; backdrop-filter: blur(8px); }
.demo-alert { margin-bottom: 18px; }
.form-section-title { margin: 2px 0 14px; padding-left: 10px; color: #1d2939; border-left: 3px solid #2563eb; font-size: 13px; font-weight: 600; }
.form-section-title:not(:first-of-type) { margin-top: 7px; }
.mode-alert { margin: -2px 0 18px; }
.type-option { display: flex; align-items: center; gap: 7px; }
.type-option i { width: 7px; height: 7px; border-radius: 50%; }
.type-option small { margin-left: auto; color: #98a2b3; font-size: 9px; }
@keyframes rotate { to { transform: rotate(360deg); } }
@media (max-width: 1280px) {
  .task-filter { align-items: flex-end; flex-wrap: wrap; }
  .filter-buttons { margin-left: 0; }
}
@media (max-width: 768px) {
  .sync-heading { padding: 17px; align-items: flex-start; gap: 14px; }
  .sync-heading p, .eyebrow, .heading-actions > span { display: none; }
  .sync-heading h1 { margin-top: 4px; font-size: 20px; }
  .heading-actions { flex-wrap: wrap; justify-content: flex-end; }
  .heading-actions .el-button + .el-button { margin-left: 0; }
  .metric-card { min-height: 94px; padding: 14px; gap: 10px; }
  .metric-card strong { font-size: 22px; }
  .metric-card small { display: none; }
  .metric-icon { width: 40px; height: 40px; font-size: 19px; }
  .status-tabs, .workspace-tabs { padding: 0 12px; }
  .task-filter { display: grid; grid-template-columns: 1fr 1fr; padding: 14px; }
  .task-filter :deep(.el-form-item), .task-filter :deep(.el-input), .task-filter :deep(.el-select), .task-filter :deep(.el-date-editor) { width: 100%; margin-right: 0; }
  .task-filter :deep(.el-form-item:nth-last-child(2)), .filter-buttons { grid-column: 1 / -1; }
  .task-toolbar { align-items: flex-start; gap: 10px; }
  .task-toolbar > div:first-child { display: flex; flex-wrap: wrap; gap: 6px; }
  .task-toolbar .el-button + .el-button { margin-left: 0; }
  .toolbar-meta > span { display: none; }
  .task-pagination { align-items: flex-start; gap: 12px; overflow-x: auto; }
  .task-pagination > span { display: none; }
  .schedule-intro { align-items: flex-start; gap: 12px; }
  .schedule-intro span { display: none; }
  .detail-metrics { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
  .detail-grid .full { grid-column: auto; }
  :deep(.el-drawer) { width: 100% !important; }
  :deep(.el-dialog) { width: calc(100% - 24px) !important; }
}
</style>
