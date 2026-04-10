<!-- 项目阶段管理：占位页，保证路由与构建可用 -->
<template>
  <div class="project-stages assistant-ruc-theme">
    <div class="page-header">
      <el-button text type="primary" class="back-btn" @click="goProject">
        <el-icon class="back-icon"><ArrowLeft /></el-icon>
        返回项目详情
      </el-button>
      <h1 class="page-title">项目阶段管理</h1>
      <p class="page-desc">
        项目编号：<strong>{{ projectId }}</strong>。此页面为预留入口，后续可在此维护各阶段里程碑与交付物。
      </p>
    </div>
    <el-card shadow="never" class="placeholder-card">
      <el-empty description="功能开发中" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

const projectId = computed(() => String(route.params.id ?? ''))

function goProject() {
  const id = route.params.id
  if (id) router.push(`/projects/detail/${id}`)
  else router.push('/applicant/dashboard')
}
</script>

<style scoped>
.project-stages {
  padding: 8px 0 24px;
  max-width: 960px;
  margin: 0 auto;
}

.back-btn {
  padding-left: 0;
}

.back-icon {
  margin-right: 4px;
}

.page-title {
  margin: 12px 0 8px;
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}

.page-desc {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.5;
}

.placeholder-card {
  border-radius: 12px;
}
</style>
