<template>
  <div class="project-detail-view">
    <!-- 项目基本信息 -->
    <el-card class="basic-info-card">
      <template #header>
        <h3>项目基本信息</h3>
      </template>

      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="项目编号">
          <el-tag type="primary">{{ project.project_code }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目状态">
          <el-tag :type="getStatusTag(project.status)" size="small">
            {{ getStatusText(project.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="项目标题">{{ project.title }}</el-descriptions-item>
        <el-descriptions-item label="项目类别">{{ project.category }}</el-descriptions-item>
        <el-descriptions-item label="研究领域">{{ project.research_field }}</el-descriptions-item>
        <el-descriptions-item label="关键词">{{ project.keywords }}</el-descriptions-item>
        <el-descriptions-item label="项目预算">
          ¥{{ formatNumber(project.budget_total) }}
        </el-descriptions-item>
        <el-descriptions-item label="研究周期">
          {{ project.duration_months }}个月
        </el-descriptions-item>
        <el-descriptions-item label="申请人">{{ project.applicant_name }}</el-descriptions-item>
        <el-descriptions-item label="申请单位">{{
          project.applicant_department
        }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">
          {{ formatDate(project.created_at) }}
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <!-- 项目摘要 -->
    <el-card class="abstract-card">
      <template #header>
        <h3>项目摘要</h3>
      </template>
      <div class="abstract-content">
        {{ project.abstract }}
      </div>
    </el-card>

    <!-- 项目背景和目标 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="12">
        <el-card class="section-card">
          <template #header>
            <h4>研究背景</h4>
          </template>
          <div class="section-content">
            {{ project.background || '暂无研究背景说明' }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="section-card">
          <template #header>
            <h4>研究目标</h4>
          </template>
          <div class="section-content">
            {{ project.objectives || '暂无研究目标说明' }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 研究方法和预期成果 -->
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="12">
        <el-card class="section-card">
          <template #header>
            <h4>研究方法</h4>
          </template>
          <div class="section-content">
            {{ project.methodology || '暂无研究方法说明' }}
          </div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card class="section-card">
          <template #header>
            <h4>预期成果</h4>
          </template>
          <div class="section-content">
            {{ project.expected_outcomes || '暂无预期成果说明' }}
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button type="primary" size="large" @click="startReview">
        <el-icon><Edit /></el-icon>
        开始评审此项目
      </el-button>
      <el-button type="info" size="large" @click="$emit('close')">
        <el-icon><Close /></el-icon>
        关闭
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Edit, Close } from '@element-plus/icons-vue'

const props = defineProps<{
  project: any
}>()

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

const startReview = () => {
  ElMessage.info('正在跳转到评审页面...')
  emit('close')

  router.push({
    name: 'ReviewTaskDetail',
    query: {
      projectId: props.project.id,
      projectTitle: props.project.title,
      projectCode: props.project.project_code,
      createNew: 'true',
    },
  })
}

const getStatusTag = (status: string) => {
  const tagMap: Record<string, string> = {
    draft: '',
    submitted: 'info',
    under_review: 'warning',
    approved: 'success',
    in_progress: 'primary',
    completed: 'success',
    rejected: 'danger',
    terminated: 'danger',
  }
  return tagMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已拒绝',
    terminated: '已终止',
  }
  return textMap[status] || status
}

const formatNumber = (num: number | string | null) => {
  if (num === null || num === undefined || num === '') return '0'
  const number = Number(num)
  if (isNaN(number)) return '0'
  return number.toLocaleString('zh-CN')
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}
</script>

<style scoped>
.project-detail-view {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 10px;
}

.basic-info-card,
.abstract-card,
.section-card {
  margin-bottom: 16px;
}

.abstract-content,
.section-content {
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}

.section-card h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.action-buttons {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  justify-content: center;
  gap: 20px;
}

/* 滚动条样式 */
.project-detail-view::-webkit-scrollbar {
  width: 6px;
}

.project-detail-view::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.project-detail-view::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.project-detail-view::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
