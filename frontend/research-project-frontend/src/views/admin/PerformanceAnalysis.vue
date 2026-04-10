<!-- 性能分析：占位页 -->
<template>
  <div class="admin-placeholder-page">
    <h1 class="page-title">性能分析</h1>
    <p class="page-desc">接口耗时与慢查询分析。后续可在此接入链路追踪与瓶颈定位。</p>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="功能开发中" />
    </el-card>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.admin-placeholder-page {
  max-width: 960px;
}

.page-title {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.placeholder-card {
  border-radius: 12px;
}
</style>
