<!-- src/views/assistant/TerminateProjects.vue -->
<template>
  <div class="terminate-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回</span>
        </button>
        <h1>终止项目</h1>
        <div class="header-subtitle">管理可终止的项目</div>
      </div>
    </div>

    <!-- 主要内容 -->
    <div class="content-wrapper">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <!-- 空状态 -->
      <div v-else-if="projects.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <p>暂无可终止的项目</p>
        <p class="empty-subtext">状态为已批准且有服务申请记录的项目将显示在这里</p>
      </div>

      <!-- 项目列表 -->
      <div v-else class="projects-grid">
        <div 
          v-for="project in projects" 
          :key="project.id" 
          class="project-card"
        >
          <div class="card-header">
            <span class="card-project-title">{{ project.title }}</span>
            <span class="card-status approved">已批准</span>
          </div>
          <div class="card-body">
            <div class="card-info">
              <span class="info-label">项目编号</span>
              <span class="info-value">{{ project.project_code || '-' }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">申请人</span>
              <span class="info-value">{{ project.applicant_name }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">服务申请总数</span>
              <span class="info-value">{{ project.total_requests }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">已同意</span>
              <span class="info-value success">{{ project.approved_requests }}</span>
            </div>
            <div class="card-info">
              <span class="info-label">已拒绝</span>
              <span class="info-value danger">{{ project.rejected_requests }}</span>
            </div>
          </div>
          <div class="card-footer">
            <button class="btn-view-detail" @click="goToDetail(project.id)">查看详情</button>
            <button class="btn-terminate" @click="confirmTerminate(project)">终止项目</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'

const router = useRouter()

// API配置
const API_BASE_URL = getApiBaseUrl()
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应式数据
const loading = ref(false)
const projects = ref<any[]>([])

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    const res = await api.get('/incubation/terminable-projects')
    if (res.data.success) {
      projects.value = res.data.data
    }
  } catch (error: any) {
    console.error('加载项目列表失败:', error)
    ElMessage.error(error.response?.data?.error || '加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// 查看项目详情
const goToDetail = (projectId: string) => {
  router.push(`/assistant/projects/detail/${projectId}?from=terminate`)
}

// 确认终止项目
const confirmTerminate = async (project: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要终止项目「${project.title}」吗？终止后申请人将无法再提交服务申请。`,
      '确认终止项目',
      {
        confirmButtonText: '确定终止',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const res = await api.put(`/incubation/projects/${project.id}/terminate`)
    if (res.data.success) {
      ElMessage.success('项目已终止')
      loadProjects()
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('终止项目失败:', error)
      ElMessage.error(error.response?.data?.error || '终止项目失败')
    }
  }
}

// 返回
const goBack = () => {
  router.push('/assistant/dashboard')
}

onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.terminate-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.page-header {
  background: white;
  padding: 20px 32px;
  border-bottom: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
  width: fit-content;
}

.back-btn:hover {
  background: #e8e8e8;
  color: #333;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
  font-weight: 600;
}

.header-subtitle {
  color: #999;
  font-size: 14px;
}

.content-wrapper {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 加载状态 */
.loading-state {
  padding: 64px;
  text-align: center;
  color: #999;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #f0f0f0;
  border-top-color: #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  padding: 64px;
  text-align: center;
  color: #999;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 13px;
  color: #bbb;
}

/* 项目卡片网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.project-card {
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
}

.project-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.card-project-title {
  flex: 1;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
  margin-right: 12px;
}

.card-status {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  white-space: nowrap;
}

.card-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.card-body {
  padding: 16px 20px;
}

.card-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.card-info:last-child {
  margin-bottom: 0;
}

.card-info .info-label {
  font-size: 13px;
  color: #999;
}

.card-info .info-value {
  font-size: 13px;
  color: #333;
  font-weight: 500;
}

.card-info .info-value.success {
  color: #52c41a;
}

.card-info .info-value.danger {
  color: #ff4d4f;
}

.card-footer {
  padding: 16px 20px;
  display: flex;
  gap: 12px;
  border-top: 1px solid #f0f0f0;
}

.btn-view-detail {
  flex: 1;
  padding: 10px 24px;
  background: #F0F9F0;
  border: none;
  border-radius: 6px;
  color: #2E8B57;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-view-detail:hover {
  background: #E0F0E0;
}

.btn-terminate {
  flex: 1;
  padding: 10px 24px;
  background: #B22222;
  border: none;
  border-radius: 6px;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-terminate:hover {
  background: #8B0000;
}
</style>
