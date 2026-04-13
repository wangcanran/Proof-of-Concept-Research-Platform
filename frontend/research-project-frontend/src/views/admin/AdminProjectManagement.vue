<!-- 管理员：项目管理（导出全部项目 Excel） -->
<template>
  <div class="admin-project-mgmt assistant-ruc-theme">
    <div class="page-hero">
      <h1>项目管理</h1>
      <p class="sub">
        在弹出窗口中<strong>先勾选要导出的项目</strong>，再勾选需要导出的字段（管理员默认可选范围内全部项目）。
      </p>
      <el-button color="#b31b1b" :dark="true" size="large" @click="showExport = true">导出项目 Excel</el-button>
    </div>
    <ProjectExportDialog v-model="showExport" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ProjectExportDialog from '@/components/ProjectExportDialog.vue'

const showExport = ref(false)
</script>

<style scoped>
.admin-project-mgmt {
  padding: 24px 28px;
  max-width: 720px;
}
.page-hero h1 {
  margin: 0 0 12px;
  font-size: 22px;
  color: #303133;
}
.sub {
  margin: 0 0 20px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}
</style>
