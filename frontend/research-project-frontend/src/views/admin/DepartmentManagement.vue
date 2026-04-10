<!-- 部门管理：占位页 -->
<template>
  <div class="admin-placeholder-page">
    <h1 class="page-title">部门管理</h1>
    <p class="page-desc">维护组织架构与部门信息。后续可在此接入部门树、成员关联等能力。</p>
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
