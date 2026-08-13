<template>
  <BasicLayout>
    <template #wrapper>
      <el-card class="placeholder-card">
        <h2>{{ $route.meta.title }}</h2>
        <p>功能页面正在建设中。</p>
      </el-card>
    </template>
  </BasicLayout>
</template>

<script>
export default {
  name: 'CrossBorderPlaceholder'
}
</script>

<style lang="scss" scoped>
.placeholder-card {
  min-height: 220px;
}

.placeholder-card h2 {
  margin: 0 0 12px;
}

.placeholder-card p {
  color: #909399;
  margin: 0;
}
</style>
