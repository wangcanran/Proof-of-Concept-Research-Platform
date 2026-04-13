<!-- src/views/assistant/ManagerProjects.vue -->
<template>
  <div class="manager-projects-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <button type="button" class="back-workbench-box" @click="goToWorkbench">
          <el-icon class="back-icon"><ArrowLeft /></el-icon>
          <span class="back-text">返回工作台</span>
        </button>
        <h1>项目管理</h1>
        <div class="header-subtitle">
          管理您负责的项目和待领取的项目申请
        </div>
      </div>
    </div>

    <!-- 标签切换 -->
    <div class="tabs-container">
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'unassigned' }"
          @click="switchTab('unassigned')"
        >
          <span class="tab-icon">📋</span>
          <span class="tab-text">待领取项目</span>
          <span v-if="unassignedCount > 0" class="tab-badge">{{ unassignedCount }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'my' }"
          @click="switchTab('my')"
        >
          <span class="tab-icon">📁</span>
          <span class="tab-text">我的项目</span>
          <span v-if="myProjectsCount > 0" class="tab-badge">{{ myProjectsCount }}</span>
        </button>
      </div>
    </div>

    <!-- 搜索和筛选栏 -->
    <div class="filter-bar">
      <div class="search-box">
        <input
          v-model="searchKeyword"
          type="text"
          placeholder="搜索项目标题、编号、申请人..."
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

    <!-- 待领取项目列表 -->
    <div v-else-if="activeTab === 'unassigned'" class="projects-section">
      <div v-if="unassignedProjects.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <h3>暂无待领取项目</h3>
        <p>当前没有申请人提交但尚未被领取的项目</p>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredUnassignedProjects"
          :key="project.id"
          class="project-card"
          @click="viewProjectDetail(project.id)"
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
            <div class="project-status unassigned">待领取</div>
          </div>

          <div class="project-meta">
            <div class="meta-item">
              <span class="meta-label">项目编号：</span>
              <span class="meta-value">{{ project.project_code || '待生成' }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">申请人：</span>
              <span class="meta-value">{{ project.applicant_name || '未知' }}</span>
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
            <button class="action-btn primary" @click.stop="claimProject(project)">
              领取项目
            </button>
            <button class="action-btn secondary" @click.stop="viewProjectDetail(project.id)">
              查看详情
            </button>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.created_at) }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">👤</span>
              {{ project.applicant_name || '申请人' }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 我的项目列表 -->
    <div v-else-if="activeTab === 'my'" class="projects-section">
      <div v-if="myProjects.length === 0" class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>暂无负责的项目</h3>
        <p>您还没有领取任何项目，可以在"待领取项目"中领取</p>
        <button class="action-btn primary" @click="switchTab('unassigned')">
          去领取项目
        </button>
      </div>
      <div v-else class="projects-grid">
        <div
          v-for="project in filteredMyProjects"
          :key="project.id"
          class="project-card"
          @click="viewProjectDetail(project.id)"
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
              <span class="meta-label">申请人：</span>
              <span class="meta-value">{{ project.applicant_name || '未知' }}</span>
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
            <div class="action-row">
              <button class="action-btn secondary" @click.stop="viewProjectDetail(project.id)">
                查看详情
              </button>
              <button 
                v-if="canAssignReviewers(project)"
                class="action-btn primary" 
                @click.stop="assignReviewers(project)"
              >
                分配专家
              </button>
            </div>
            <div class="action-row">
              <button 
                v-if="hasReviewFeedback(project)"
                class="action-btn info" 
                @click.stop="viewReviewFeedback(project)"
              >
                查看评审意见
              </button>
              <button 
                v-if="canApproveProject(project)"
                class="action-btn success" 
                @click.stop="approveProject(project)"
              >
                审批入库
              </button>
            </div>
          </div>

          <div class="project-footer">
            <span class="footer-item">
              <span class="footer-icon">📅</span>
              {{ formatDate(project.created_at) }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">👤</span>
              {{ project.applicant_name || '申请人' }}
            </span>
            <span class="footer-item">
              <span class="footer-icon">📊</span>
              {{ getStatusText(project.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl } from '@/utils/request'
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import axios from 'axios'
import ProjectExportDialog from '@/components/ProjectExportDialog.vue'

const router = useRouter()
const route = useRoute()

// Props
const props = defineProps<{
  defaultTab?: string
}>()

const showProjectExport = ref(false)
const exportSelectedIds = ref<string[]>([])

// API配置
const API_BASE_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('userInfo')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

// 状态管理
const loading = ref(false)
const activeTab = ref<'unassigned' | 'my'>('unassigned')
const searchKeyword = ref('')
const currentUser = ref<any>(null)

// 项目数据
const unassignedProjects = ref<any[]>([])
const myProjects = ref<any[]>([])

// 计算属性
const unassignedCount = computed(() => unassignedProjects.value.length)
const myProjectsCount = computed(() => myProjects.value.length)

const filteredUnassignedProjects = computed(() => {
  if (!searchKeyword.value.trim()) return unassignedProjects.value
  const keyword = searchKeyword.value.toLowerCase().trim()
  return unassignedProjects.value.filter(p => 
    (p.title && p.title.toLowerCase().includes(keyword)) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
    (p.applicant_name && p.applicant_name.toLowerCase().includes(keyword))
  )
})

const filteredMyProjects = computed(() => {
  if (!searchKeyword.value.trim()) return myProjects.value
  const keyword = searchKeyword.value.toLowerCase().trim()
  return myProjects.value.filter(p => 
    (p.title && p.title.toLowerCase().includes(keyword)) ||
    (p.project_code && p.project_code.toLowerCase().includes(keyword)) ||
    (p.applicant_name && p.applicant_name.toLowerCase().includes(keyword))
  )
})

// 方法
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
    activeTab.value === 'unassigned' ? filteredUnassignedProjects.value : filteredMyProjects.value
  exportSelectedIds.value = list.map((p: { id: string }) => p.id)
}

function openProjectExport() {
  if (exportSelectedIds.value.length === 0) {
    ElMessage.warning('请先勾选要导出的项目，或使用「全选当前列表」')
    return
  }
  showProjectExport.value = true
}

const switchTab = (tab: 'unassigned' | 'my') => {
  activeTab.value = tab
  searchKeyword.value = ''
  exportSelectedIds.value = []
  // 更新URL但不刷新页面
  if (tab === 'unassigned') {
    router.replace('/assistant/projects/unassigned')
  } else {
    router.replace('/assistant/projects/my')
  }
}

const goToWorkbench = () => {
  router.push('/assistant/dashboard')
}

const handleSearch = () => {
  // 搜索逻辑已通过计算属性实现
}

const refreshData = async () => {
  await loadProjects()
}

const loadCurrentUser = async () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      currentUser.value = JSON.parse(userInfoStr)
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

const loadProjects = async () => {
  loading.value = true
  try {
    // 加载待领取项目（已提交但没有项目经理的项目）
    const unassignedRes = await api.get('/assistant/projects/unassigned')
    if (unassignedRes.success) {
      unassignedProjects.value = unassignedRes.data || []
    }

    // 加载我负责的项目
    const myRes = await api.get('/assistant/projects/my')
    if (myRes.success) {
      myProjects.value = myRes.data || []
    }
  } catch (error) {
    console.error('加载项目失败:', error)
    ElMessage.error('加载项目数据失败')
  } finally {
    loading.value = false
  }
}

const viewProjectDetail = (projectId: string) => {
  // 传递当前tab作为来源参数
  router.push(`/assistant/projects/detail/${projectId}?from=${activeTab.value}`)
}

const claimProject = async (project: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要领取项目 "${project.title}" 吗？领取后您将成为该项目的负责人。`,
      '确认领取',
      {
        confirmButtonText: '确定领取',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    const response = await api.post('/assistant/projects/claim', {
      projectId: project.id,
    })

    if (response.success) {
      ElMessage.success('项目领取成功')
      // 刷新数据
      await loadProjects()
      // 自动切换到"我的项目"标签
      switchTab('my')
    } else {
      ElMessage.error(response.error || '领取失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('领取项目失败:', error)
      ElMessage.error('领取项目失败')
    }
  }
}

const assignReviewers = (project: any) => {
  // 传递当前tab作为来源参数
  router.push(`/assistant/projects/${project.id}/assign-reviewers?from=${activeTab.value}`)
}

const viewReviewFeedback = (project: any) => {
  router.push(`/assistant/projects/detail/${project.id}?tab=reviews&from=${activeTab.value}`)
}

const canAssignReviewers = (project: any) => {
  // 可以分配专家的状态：评审中
  return ['under_review'].includes(project.status)
}

const hasReviewFeedback = (project: any) => {
  // 根据项目状态或review_count判断是否有评审意见
  return project.review_count > 0 || ['under_review', 'accepted', 'rejected', 'revision'].includes(project.status)
}

const canApproveProject = (project: any) => {
  // 可以审批入库的状态：评审中
  return ['under_review'].includes(project.status)
}

const approveProject = async (project: any) => {
  try {
    // 使用自定义对话框
    const result = await showApproveDialog(project)
    if (!result) return
    
    const response = await api.post(`/assistant/projects/${project.id}/approve`, {
      result: result
    })

    if (response.success) {
      ElMessage.success(result === 'accepted' ? '项目已接收入库' : '项目已拒绝入库')
      await loadProjects()
    } else {
      ElMessage.error(response.error || '审批失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('审批失败:', error)
      ElMessage.error('审批失败')
    }
  }
}

// 显示审批对话框
const showApproveDialog = (project: any): Promise<string | null> => {
  return new Promise((resolve) => {
    ElMessageBox.confirm(
      `请选择项目「${project.title}」的审批结果`,
      '审批入库',
      {
        confirmButtonText: '接收入库',
        cancelButtonText: '拒绝入库',
        distinguishCancelAndClose: true,
        type: 'info',
      }
    ).then(() => {
      resolve('accepted')
    }).catch((action) => {
      if (action === 'cancel') {
        // 点击了拒绝入库
        ElMessageBox.confirm(
          '确定要拒绝该项目入库吗？拒绝后项目将标记为未通过。',
          '确认拒绝',
          {
            confirmButtonText: '确定拒绝',
            cancelButtonText: '取消',
            type: 'warning',
          }
        ).then(() => {
          resolve('rejected')
        }).catch(() => {
          resolve(null)
        })
      } else {
        resolve(null)
      }
    })
  })
}

// 格式化方法
const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const getTechMaturityText = (maturity: string) => {
  const map: Record<string, string> = {
    rd: '研发阶段',
    pilot: '小试阶段',
    intermediate_trial: '中试阶段',
    small_batch_prod: '小批量生产',
  }
  return map[maturity] || maturity || '未指定'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待领取',
    under_review: '评审中',
    revision: '需修改',
    batch_review: '集中评审中',
    approved: '已批准',
    accepted: '已入库',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return statusMap[status] || status
}

const getStatusClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'revision',
    batch_review: 'reviewing',
    approved: 'approved',
    accepted: 'accepted',
    incubating: 'incubating',
    completed: 'completed',
    rejected: 'rejected',
    terminated: 'terminated',
  }
  return classMap[status] || status
}

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
    if ((s === 'multi_stage' || s === 'multi_stage_combo') && note) {
      return note
    }
    return pocStageMap[s] || s
  }).join('、')

  return stageTexts
}

// 监听props变化
watch(() => props.defaultTab, (newTab) => {
  if (newTab === 'unassigned' || newTab === 'my') {
    activeTab.value = newTab
  }
}, { immediate: true })

// 初始化
onMounted(async () => {
  await loadCurrentUser()
  await loadProjects()
})
</script>

<style scoped>
.manager-projects-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.back-workbench-box {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 10px 18px;
  border: 1px solid rgba(179, 27, 27, 0.35);
  border-radius: 8px;
  background: linear-gradient(180deg, #fffbfb 0%, #fff5f5 100%);
  color: #b31b1b;
  font-size: 15px;
  font-weight: 500;
  font-family: 'STZhongsong', '华文中宋', 'SimSun', serif;
  cursor: pointer;
  transition: all 0.2s;
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
  color: #2c3e50;
}

.header-subtitle {
  color: #666;
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

/* 项目列表 */
.projects-section {
  margin-bottom: 24px;
}

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

.project-status.unassigned {
  background: #fff7e6;
  color: #fa8c16;
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

.project-status.incubating {
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

.project-status.terminated {
  background: #f5f5f5;
  color: #8c8c8c;
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

.action-row {
  display: flex;
  gap: 8px;
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

.action-btn.info {
  background: #f0f5ff;
  color: #2f54eb;
  border-color: #91caff;
}

.action-btn.info:hover {
  background: #d6e4ff;
}

.action-btn.success {
  background: #52c41a;
  color: white;
  border-color: #52c41a;
}

.action-btn.success:hover {
  background: #389e0d;
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
  .manager-projects-page {
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
