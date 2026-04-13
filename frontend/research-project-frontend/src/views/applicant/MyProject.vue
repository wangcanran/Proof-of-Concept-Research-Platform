<!-- src/views/applicant/MyProject.vue -->
<template>
  <div class="applicant-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goToWorkbench">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回工作台</span>
        </button>
        <h1>我的项目</h1>
        <div class="header-subtitle">
          管理您的项目申报
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'draft' }"
          @click="switchTab('draft')"
        >
          <span class="tab-icon">📝</span>
          <span class="tab-text">草稿</span>
          <span v-if="draftCount > 0" class="tab-badge">{{ draftCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'submitted' }"
          @click="switchTab('submitted')"
        >
          <span class="tab-icon">📤</span>
          <span class="tab-text">已提交</span>
          <span v-if="submittedCount > 0" class="tab-badge">{{ submittedCount }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索项目标题、编号..."
          @keyup.enter="handleSearch"
        />
        <button class="search-btn" @click="handleSearch">🔍</button>
      </div>
      <div class="filter-actions">
        <button type="button" class="select-export-btn" @click="selectAllForExport">全选当前列表</button>
        <button type="button" class="export-btn" @click="openProjectExport">📥 导出 Excel</button>
        <button class="refresh-btn" @click="refreshData" :disabled="loading">
          🔄 {{ loading ? '刷新中...' : '刷新' }}
        </button>
      </div>
    </div>

    <ProjectExportDialog v-model="showProjectExport" :project-ids="exportSelectedIds" />

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目数据...</div>
    </div>

    <!-- 草稿项目列表 -->
    <div v-else-if="activeTab === 'draft'" class="projects-section">
      <div v-if="draftProjects.length === 0" class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>暂无草稿项目</h3>
        <p>您还没有保存任何草稿项目</p>
        <button class="action-btn primary" @click="goToCreateProject">
          创建新项目
        </button>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredDraftProjects"
          :key="project.id"
          class="project-card"
          @click="viewProject(project.id)"
        >
          <div class="card-header">
            <label class="card-export-check" @click.stop>
              <input
                type="checkbox"
                :checked="exportSelectedIds.includes(project.id)"
                @change="toggleExportSelect(project.id)"
              />
            </label>
            <div class="project-title">{{ project.title }}</div>
            <div class="project-status draft">草稿</div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">所属领域：</span>
              <span class="meta-value">{{ formatDomainsWithOther(project) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">技术成熟度：</span>
              <span class="meta-value">{{ getTechMaturityText(project.tech_maturity) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">预期成果转化：</span>
              <span class="meta-value">{{ formatAchievementTransformWithOther(project) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">概念验证需求：</span>
              <span class="meta-value">{{ formatPocStageWithNote(project) }}</span>
            </div>
          </div>

          <div class="project-actions">
            <button class="action-btn secondary" @click.stop="viewProject(project.id)">
              查看详情
            </button>
            <button class="action-btn primary" @click.stop="editProject(project.id)">
              继续编辑
            </button>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.updated_at || project.created_at) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 已提交项目列表 -->
    <div v-else-if="activeTab === 'submitted'" class="projects-section">
      <div v-if="submittedProjects.length === 0" class="empty-state">
        <div class="empty-icon">📤</div>
        <h3>暂无已提交项目</h3>
        <p>您还没有提交任何项目</p>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredSubmittedProjects"
          :key="project.id"
          class="project-card"
          @click="viewProject(project.id)"
        >
          <div class="card-header">
            <label class="card-export-check" @click.stop>
              <input
                type="checkbox"
                :checked="exportSelectedIds.includes(project.id)"
                @change="toggleExportSelect(project.id)"
              />
            </label>
            <div class="project-title">{{ project.title }}</div>
            <div class="project-status" :class="getStatusClass(project.status)">
              {{ getStatusText(project.status) }}
            </div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">所属领域：</span>
              <span class="meta-value">{{ formatDomainsWithOther(project) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">技术成熟度：</span>
              <span class="meta-value">{{ getTechMaturityText(project.tech_maturity) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">预期成果转化：</span>
              <span class="meta-value">{{ formatAchievementTransformWithOther(project) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">概念验证需求：</span>
              <span class="meta-value">{{ formatPocStageWithNote(project) }}</span>
            </div>
          </div>

          <div class="project-actions">
            <button class="action-btn primary" @click.stop="viewProject(project.id)">
              查看详情
            </button>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.submitted_at || project.created_at) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import request from '@/utils/request'
import ProjectExportDialog from '@/components/ProjectExportDialog.vue'

const router = useRouter()

// 状态管理
const showProjectExport = ref(false)
const exportSelectedIds = ref<string[]>([])
const loading = ref(false)
const activeTab = ref('draft')
const searchKeyword = ref('')
const projects = ref<any[]>([])

// 计算属性 - 草稿项目
const draftProjects = computed(() => {
  return projects.value.filter(p => p.status === 'draft')
})

// 计算属性 - 已提交项目（包括submitted, under_review, approved, rejected等状态）
const submittedProjects = computed(() => {
  return projects.value.filter(p => p.status !== 'draft')
})

// 统计数量
const draftCount = computed(() => draftProjects.value.length)
const submittedCount = computed(() => submittedProjects.value.length)

// 过滤后的草稿项目
const filteredDraftProjects = computed(() => {
  if (!searchKeyword.value) return draftProjects.value
  const keyword = searchKeyword.value.toLowerCase()
  return draftProjects.value.filter(p =>
    p.title.toLowerCase().includes(keyword) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword))
  )
})

// 过滤后的已提交项目
const filteredSubmittedProjects = computed(() => {
  if (!searchKeyword.value) return submittedProjects.value
  const keyword = searchKeyword.value.toLowerCase()
  return submittedProjects.value.filter(p =>
    p.title.toLowerCase().includes(keyword) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword))
  )
})

// 切换标签
const switchTab = (tab: string) => {
  activeTab.value = tab
  searchKeyword.value = ''
  exportSelectedIds.value = []
}

function toggleExportSelect(projectId: string) {
  const i = exportSelectedIds.value.indexOf(projectId)
  if (i >= 0) {
    exportSelectedIds.value = exportSelectedIds.value.filter((id) => id !== projectId)
  } else {
    exportSelectedIds.value = [...exportSelectedIds.value, projectId]
  }
}

function selectAllForExport() {
  const list =
    activeTab.value === 'draft' ? filteredDraftProjects.value : filteredSubmittedProjects.value
  exportSelectedIds.value = list.map((p: { id: string }) => p.id)
}

function openProjectExport() {
  if (exportSelectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要导出的项目，或使用「全选当前列表」')
    return
  }
  showProjectExport.value = true
}

// 加载项目列表
const loadProjects = async () => {
  loading.value = true
  try {
    const response = await request.get('/api/projects')
    if (response.success && response.data) {
      projects.value = response.data
    } else {
      ElMessage.error(response.error || '加载项目列表失败')
    }
  } catch (error: any) {
    console.error('加载项目列表失败:', error)
    ElMessage.error(error.message || '加载项目列表失败')
  } finally {
    loading.value = false
  }
}

// 刷新数据
const refreshData = () => {
  loadProjects()
}

// 搜索
const handleSearch = () => {
  // 搜索已通过计算属性自动处理
}

// 导航
const goToWorkbench = () => {
  router.push('/applicant/dashboard')
}

const goToCreateProject = () => {
  router.push('/projects/create')
}

const viewProject = (id: string) => {
  router.push(`/projects/detail/${id}`)
}

const editProject = (id: string) => {
  router.push(`/projects/edit/${id}`)
}

// 辅助函数
const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    submitted: 'submitted',
    under_review: 'reviewing',
    approved: 'approved',
    in_progress: 'in-progress',
    completed: 'completed',
    rejected: 'rejected',
  }
  return map[status] || 'submitted'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回',
  }
  return map[status] || status
}

const formatDate = (dateString?: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatCurrency = (amount: number) => {
  if (!amount) return '¥0'
  const num = Number(amount)
  if (num >= 100000000) return '¥' + (num / 100000000).toFixed(2) + '亿'
  if (num >= 10000) return '¥' + (num / 10000).toFixed(2) + '万'
  return '¥' + num.toFixed(2)
}

// 技术成熟度映射
const getTechMaturityText = (techMaturity?: string) => {
  const map: Record<string, string> = {
    'trl1': 'TRL 1 - 基本原理发现',
    'trl2': 'TRL 2 - 技术概念形成',
    'trl3': 'TRL 3 - 概念验证',
    'trl4': 'TRL 4 - 实验室验证',
    'trl5': 'TRL 5 - 相关环境验证',
    'trl6': 'TRL 6 - 系统/子系统模型验证',
    'trl7': 'TRL 7 - 系统原型验证',
    'trl8': 'TRL 8 - 系统完成并验证',
    'trl9': 'TRL 9 - 系统运行验证',
  }
  return map[techMaturity || ''] || techMaturity || '未指定'
}

// 预期成果转化形式映射
const achievementTransformMap: Record<string, string> = {
  'patent': '专利',
  'paper': '论文',
  'software_copyright': '软件著作权',
  'technical_standard': '技术标准',
  'prototype': '原型产品',
  'pilot': '中试产品',
  'industrialization': '产业化成果',
  'other': '其他',
  'tech_transfer': '技术转让',
  'tech_license': '技术许可',
  'equity_investment': '作价投资',
  'joint_dev': '联合开发',
}

// 概念验证阶段需求映射
const pocStageMap: Record<string, string> = {
  'principle_validation': '原理验证',
  'prototype_development': '样机开发',
  'pilot_test': '中试',
  'market_validation': '市场验证',
  'multi_stage': '多阶段组合',
  'multi_stage_combo': '多阶段组合',
  'creative_verify': '创意性验证',
  'feasibility_verify': '可行性验证',
  'commercial_verify': '商业化验证',
}

// 处理所属领域
const formatDomainsWithOther = (project: any): string => {
  if (!project.research_domains || !Array.isArray(project.research_domains)) {
    return project.project_domain_other_text || '未指定'
  }
  return project.research_domains.map((d: any) => {
    const name = d.name || d
    if ((name === '其他' || name === 'other') && project.project_domain_other_text) {
      return project.project_domain_other_text
    }
    return name
  }).join('、') || '未指定'
}

// 处理预期成果转化
const formatAchievementTransformWithOther = (project: any): string => {
  let transforms = project.achievement_transform
  if (!transforms) return project.achievement_transform_other_text || '未指定'

  let arr = transforms
  if (typeof transforms === 'string') {
    try {
      arr = JSON.parse(transforms)
    } catch {
      arr = transforms.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!Array.isArray(arr) || arr.length === 0) {
    return project.achievement_transform_other_text || '未指定'
  }

  return arr.map((t: string) => {
    if (t === 'other' && project.achievement_transform_other_text) {
      return project.achievement_transform_other_text
    }
    return achievementTransformMap[t] || t
  }).join('、') || '未指定'
}

// 处理概念验证阶段需求
const formatPocStageWithNote = (project: any): string => {
  let stages = project.poc_stage_requirement
  if (!stages) return project.poc_multi_stage_note || '未指定'

  let arr = stages
  if (typeof stages === 'string') {
    try {
      arr = JSON.parse(stages)
    } catch {
      arr = stages.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!Array.isArray(arr) || arr.length === 0) {
    return project.poc_multi_stage_note || '未指定'
  }

  return arr.map((s: string) => {
    if ((s === 'multi_stage' || s === 'multi_stage_combo') && project.poc_multi_stage_note) {
      return project.poc_multi_stage_note
    }
    return pocStageMap[s] || s
  }).join('、') || '未指定'
}

// 初始化
onMounted(() => {
  loadProjects()
})
</script>

<style scoped>
.applicant-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 20px;
}

/* 页面头部 */
.page-header {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.back-workbench-box:hover {
  background: #fff0f0;
  border-color: #b31b1b;
  box-shadow: 0 2px 8px rgba(179, 27, 27, 0.12);
}

.back-workbench-box .back-icon {
  font-size: 18px;
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 24px;
  color: #303133;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
}

.header-subtitle {
  color: #909399;
  font-size: 14px;
}

/* 标签切换 */
.tabs-container {
  margin-bottom: 20px;
}

.tabs {
  display: flex;
  gap: 12px;
  background: white;
  padding: 12px 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  background: #fafafa;
  color: #606266;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: #b31b1b;
  background: #fff5f5;
}

.tab-btn.active {
  border-color: #b31b1b;
  background: linear-gradient(180deg, #fff5f5 0%, #ffe8e8 100%);
  color: #b31b1b;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  background: #b31b1b;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

/* 搜索和筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  gap: 16px;
}

.search-box {
  display: flex;
  flex: 1;
  max-width: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  overflow: hidden;
}

.search-box input {
  flex: 1;
  padding: 10px 16px;
  border: none;
  outline: none;
  font-size: 14px;
}

.search-box input::placeholder {
  color: #c0c4cc;
}

.search-btn {
  padding: 10px 16px;
  background: #f5f7fa;
  border: none;
  border-left: 1px solid #dcdfe6;
  cursor: pointer;
  font-size: 16px;
}

.search-btn:hover {
  background: #e6e8eb;
}

.filter-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.export-btn {
  padding: 10px 20px;
  background: linear-gradient(180deg, #fff5f5 0%, #ffecec 100%);
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  color: #b31b1b;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #fff0f0;
  border-color: #b31b1b;
}

.select-export-btn {
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.select-export-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

.refresh-btn {
  padding: 10px 20px;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  color: #606266;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e6e8eb;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  background: white;
  border-radius: 12px;
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #b31b1b;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #b31b1b;
  font-weight: 500;
}

/* 项目网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

/* 项目卡片 */
.project-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.project-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}

.card-export-check {
  flex-shrink: 0;
  padding-top: 2px;
  cursor: pointer;
}

.card-export-check input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #b31b1b;
}

.project-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
  min-width: 0;
}

.project-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.project-status.draft {
  background: #f4f4f5;
  color: #909399;
}

.project-status.submitted {
  background: #ecf5ff;
  color: #409eff;
}

.project-status.reviewing {
  background: #fdf6ec;
  color: #e6a23c;
}

.project-status.approved {
  background: #f0f9eb;
  color: #67c23a;
}

.project-status.in-progress {
  background: #ecf5ff;
  color: #409eff;
}

.project-status.completed {
  background: #f4f4f5;
  color: #909399;
}

.project-status.rejected {
  background: #fef0f0;
  color: #f56c6c;
}

/* 项目元信息 */
.project-meta {
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: #909399;
  min-width: 85px;
  flex-shrink: 0;
}

.meta-value {
  color: #606266;
  flex: 1;
}

.meta-value.budget {
  color: #67c23a;
  font-weight: 500;
}

/* 操作按钮 */
.project-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.action-btn.primary {
  background: #b31b1b;
  color: white;
}

.action-btn.primary:hover {
  background: #8b1515;
}

.action-btn.secondary {
  background: white;
  border: 1px solid #dcdfe6;
  color: #606266;
}

.action-btn.secondary:hover {
  border-color: #b31b1b;
  color: #b31b1b;
}

/* 项目底部 */
.project-footer {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-icon {
  font-size: 14px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 18px;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #909399;
}

/* 响应式 */
@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    max-width: none;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }

  .tabs {
    flex-wrap: wrap;
  }

  .tab-btn {
    flex: 1;
    min-width: 120px;
    justify-content: center;
  }
}
</style>
