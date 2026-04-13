<!-- src/views/applicant/ProjectManagement.vue -->
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
            <button class="action-btn secondary" @click.stop="viewProject(project.id)">
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
/** 导出 Excel：勾选的项目 id */
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
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'in-progress',
    in_progress: 'in-progress',
    completed: 'completed',
    rejected: 'rejected',
    revision: 'revision',
  }
  return map[status] || 'submitted'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    submitted: '已提交',
    under_review: '评审中',
    batch_review: '批量评审',
    approved: '已批准',
    incubating: '孵化中',
    in_progress: '进行中',
    completed: '已完成',
    rejected: '已驳回',
    revision: '待修改',
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

// 技术成熟度映射
const getTechMaturityText = (techMaturity?: string) => {
  const map: Record<string, string> = {
    'rd': '研发阶段',
    'pilot': '小试阶段',
    'intermediate_trial': '中试阶段',
    'small_batch_prod': '小批量生产',
  }
  return map[techMaturity || ''] || techMaturity || '未指定'
}

// 预期成果转化形式映射
const achievementTransformMap: Record<string, string> = {
  'tech_transfer': '技术转让',
  'tech_license': '技术许可',
  'equity_investment': '作价投资',
  'joint_dev': '联合开发',
  'other': '其他',
}

// 概念验证阶段需求映射
const pocStageMap: Record<string, string> = {
  'creative_verify': '创意性验证',
  'feasibility_verify': '可行性验证',
  'commercial_verify': '商业化验证',
  'multi_stage_combo': '多阶段组合',
}

// 处理所属领域
const formatDomainsWithOther = (project: any): string => {
  let domains = project.research_domains
  const otherText = project.project_domain_other_text

  if (typeof domains === 'string') {
    try {
      domains = JSON.parse(domains)
    } catch {
      domains = domains ? [domains] : []
    }
  }

  if (!domains || !Array.isArray(domains) || domains.length === 0) {
    return otherText || '未指定'
  }

  const domainNames = domains.map((d: any) => {
    const name = d.name || d
    if (name === '其他' || name === 'other') {
      return otherText || name
    }
    return name
  }).join('、')

  return domainNames
}

// 处理预期成果转化
const formatAchievementTransformWithOther = (project: any): string => {
  let transforms = project.achievement_transform
  const otherText = project.achievement_transform_other_text

  if (typeof transforms === 'string') {
    try {
      transforms = JSON.parse(transforms)
    } catch {
      transforms = transforms.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!transforms || !Array.isArray(transforms) || transforms.length === 0) {
    return otherText || '未指定'
  }

  const transformTexts = transforms.map((t: string) => {
    if (t === 'other') {
      return otherText || achievementTransformMap[t] || t
    }
    return achievementTransformMap[t] || t
  }).join('、')

  return transformTexts
}

// 处理概念验证阶段需求
const formatPocStageWithNote = (project: any): string => {
  let stages = project.poc_stage_requirement
  const note = project.poc_multi_stage_note

  if (typeof stages === 'string') {
    try {
      stages = JSON.parse(stages)
    } catch {
      stages = stages.split(',').map((s: string) => s.trim()).filter(Boolean)
    }
  }

  if (!stages || !Array.isArray(stages) || stages.length === 0) {
    return note || '未指定'
  }

  const stageTexts = stages.map((s: string) => {
    if (s === 'multi_stage_combo' && note) {
      return note
    }
    return pocStageMap[s] || s
  }).join('、')

  return stageTexts
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
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.tabs {
  display: flex;
  gap: 12px;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border: none;
  background: #f5f7fa;
  color: #666;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #b31b1b;
  color: white;
}

.tab-icon {
  font-size: 18px;
}

.tab-badge {
  background: rgba(255, 255, 255, 0.3);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  margin-left: 4px;
}

.tab-btn.active .tab-badge {
  background: rgba(255, 255, 255, 0.25);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.search-box {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-box input {
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  width: 320px;
}

.search-box input:focus {
  outline: none;
  border-color: #b31b1b;
  box-shadow: 0 0 0 2px rgba(179, 27, 27, 0.2);
}

.search-btn {
  padding: 10px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.filter-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.export-btn {
  padding: 10px 20px;
  background: linear-gradient(180deg, #fff5f5 0%, #ffecec 100%);
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  color: #b31b1b;
  font-size: 14px;
  font-weight: 500;
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
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s;
  cursor: pointer;
}

.refresh-btn:hover:not(:disabled) {
  background: #e8e8e8;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 项目列表 */
.projects-section {
  margin-bottom: 24px;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  font-weight: bold;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
  opacity: 0.6;
}

.empty-state h3 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.empty-state p {
  margin: 0 0 24px 0;
  color: #666;
}

/* 项目卡片网格 */
.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 24px;
}

@media (max-width: 768px) {
  .projects-grid {
    grid-template-columns: 1fr;
  }
}

.project-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s;
  cursor: pointer;
  border: 1px solid transparent;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #b31b1b;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
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
  color: #2c3e50;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.project-status.draft {
  background: #fff7e6;
  color: #fa8c16;
}

.project-status.submitted {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}

.project-status.reviewing {
  background: #f0f5ff;
  color: #2f54eb;
}

.project-status.revision {
  background: #fff0f6;
  color: #eb2f96;
}

.project-status.approved {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.incubating,
.project-status.in-progress {
  background: #e6fffb;
  color: #13c2c2;
}

.project-status.completed {
  background: #f6ffed;
  color: #52c41a;
}

.project-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 项目元信息 */
.project-meta {
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-label {
  color: #999;
  min-width: 100px;
}

.meta-value {
  color: #2c3e50;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

/* 项目操作按钮 */
.project-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.action-btn {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #d9d9d9;
  background: white;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: 500;
}

.action-btn:hover {
  background: #f5f5f5;
}

.action-btn.primary {
  background: #b31b1b;
  color: white;
  border-color: #b31b1b;
}

.action-btn.primary:hover {
  background: #8b0000;
}

.action-btn.secondary {
  background: #f6ffed;
  color: #52c41a;
  border-color: #b7eb8f;
}

.action-btn.secondary:hover {
  background: #d9f7be;
}

/* 项目页脚 */
.project-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
  color: #999;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.footer-icon {
  font-size: 14px;
}

/* 响应式调整 */
@media (max-width: 992px) {
  .filter-bar {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .search-box input {
    width: 100%;
  }

  .tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
  }

  .tab-btn {
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .applicant-projects-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .back-workbench-box {
    width: 100%;
    justify-content: center;
  }

  .project-card {
    padding: 20px;
  }

  .project-actions {
    flex-direction: column;
  }

  .project-footer {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
