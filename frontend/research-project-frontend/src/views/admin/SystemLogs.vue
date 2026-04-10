<!-- 系统日志：占位页 -->
<template>
  <div class="admin-placeholder-page">
    <h1 class="page-title">系统日志</h1>
    <p class="page-desc">操作与审计日志查询。后续可在此接入检索、导出与留存策略。</p>
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
