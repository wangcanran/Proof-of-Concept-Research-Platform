<template>
  <div class="project-detail">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <h1>项目详情</h1>
        <div class="header-subtitle" v-if="project">
          <span class="project-no">{{ project.project_code || '暂未编号' }}</span>
          <div class="status-badge" :class="getStatusClass(project.status)">
            {{ getStatusText(project.status) }}
          </div>
        </div>
        <div v-if="loading" class="loading-indicator">加载中...</div>
      </div>
      <div class="header-actions" v-if="project">
        <button class="action-btn primary" @click="editProject" v-if="project.status === 'draft'">
          继续编辑
        </button>
        <button class="action-btn danger" @click="deleteProject" v-if="project.status === 'draft'">
          删除草稿
        </button>
        <button class="action-btn secondary" @click="exportProject">📄 导出项目</button>
        <button class="action-btn secondary" @click="openPrintDialog">🖨️ 打印</button>
      </div>
    </div>

    <!-- 数据库状态提示 -->
    <div v-if="showDebugInfo" class="db-status-bar">
      <div class="db-status-content">
        <span class="db-status-label">📊 API状态：</span>
        <span class="db-status-value" :class="{ connected: dbConnected }">
          {{ dbConnected ? '✅ 已连接' : '❌ 未连接' }}
        </span>
        <span class="db-user-info" v-if="currentUser">
          当前用户：{{ currentUser.name }} ({{ getUserRoleText(currentUser.role) }})
        </span>
        <button @click="toggleDebugInfo" class="db-toggle-btn">
          {{ showDebugInfo ? '隐藏' : '显示' }}调试
        </button>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button @click="errorMessage = ''" class="error-close">×</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading && !project" class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">正在加载项目详情...</div>
    </div>

    <!-- 项目信息卡片 -->
    <div v-if="project" class="project-info-card">
      <div class="info-header">
        <h2>{{ project.title }}</h2>
        <div class="project-type">{{ project.research_field || '未分类' }}</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>研究领域：</label>
          <span>{{ project.research_field || '未指定' }}</span>
        </div>
        <div class="info-item">
          <label>项目负责人：</label>
          <span>{{ project.applicant_name || currentUser?.name || '申请人' }}</span>
        </div>
        <div class="info-item">
          <label>项目经理：</label>
          <span>{{ project.manager_name || '待分配' }}</span>
        </div>
        <div class="info-item">
          <label>研究期限：</label>
          <span>{{ formatDate(project.start_date) }} 至 {{ formatDate(project.end_date) }}</span>
        </div>
        <div class="info-item">
          <label>研究周期：</label>
          <span>{{ project.duration_months || 0 }} 个月</span>
        </div>
        <div class="info-item">
          <label>申请经费：</label>
          <span class="budget-amount">¥ {{ formatAmount(project.budget_total || 0) }}</span>
        </div>
        <div class="info-item" v-if="project.approved_budget">
          <label>批准经费：</label>
          <span class="approved-budget">¥ {{ formatAmount(project.approved_budget) }}</span>
        </div>
        <div class="info-item">
          <label>提交日期：</label>
          <span>{{ formatDate(project.submit_date) || '未提交' }}</span>
        </div>
        <div class="info-item">
          <label>批准日期：</label>
          <span>{{ formatDate(project.approval_date) || '未批准' }}</span>
        </div>
        <div class="info-item">
          <label>创建时间：</label>
          <span>{{ formatDateTime(project.created_at) }}</span>
        </div>
        <div class="info-item">
          <label>最后更新：</label>
          <span>{{ formatDateTime(project.updated_at || project.created_at) }}</span>
        </div>
        <div class="info-item full-width">
          <label>关键词：</label>
          <div class="keywords">
            <span v-for="(keyword, index) in keywordsArray" :key="index" class="keyword-tag">
              {{ keyword }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签导航 -->
    <div v-if="project" class="tab-navigation">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- 标签内容 -->
    <div v-if="project" class="tab-content">
      <!-- 基本信息 -->
      <div v-if="activeTab === 'basic'" class="tab-panel">
        <div class="section">
          <h3>项目摘要</h3>
          <div class="content-box">{{ project.abstract || '暂无摘要' }}</div>
        </div>

        <div class="section">
          <h3>研究背景与意义</h3>
          <div class="content-box">{{ project.background || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>研究目标与内容</h3>
          <div class="content-box">{{ project.objectives || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>研究方法与技术路线</h3>
          <div class="content-box">{{ project.methodology || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>预期成果</h3>
          <div class="content-box">{{ project.expected_outcomes || '暂无内容' }}</div>
        </div>

        <div class="section" v-if="project.support_level">
          <h3>支持方案</h3>
          <div class="content-box">{{ project.support_level }}</div>
        </div>

        <div class="section" v-if="project.remarks">
          <h3>备注说明</h3>
          <div class="content-box">{{ project.remarks }}</div>
        </div>
      </div>

      <!-- 研究团队 -->
      <div v-if="activeTab === 'team'" class="tab-panel">
        <div class="section">
          <h3>项目组成员</h3>
          <div v-if="teamMembers.length === 0" class="empty-state">
            <p>暂无团队成员信息</p>
            <button class="add-btn" @click="addTeamMember">+ 添加成员</button>
          </div>
          <div v-else class="team-table">
            <table>
              <thead>
                <tr>
                  <th>序号</th>
                  <th>姓名</th>
                  <th>单位</th>
                  <th>职称</th>
                  <th>角色</th>
                  <th>分工/职责</th>
                  <th>工作量</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(member, index) in teamMembers" :key="member.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ member.name || '未命名' }}</td>
                  <td>{{ member.department || member.organization || '未指定' }}</td>
                  <td>{{ member.title || '未指定' }}</td>
                  <td>
                    <span class="role-badge" :class="getMemberRoleClass(member.member_role)">
                      {{ getMemberRoleText(member.member_role) }}
                    </span>
                  </td>
                  <td>{{ member.responsibility || '未指定' }}</td>
                  <td>{{ member.workload_percentage || 0 }}%</td>
                </tr>
              </tbody>
            </table>
            <div class="section-actions">
              <button class="add-btn" @click="addTeamMember">+ 添加成员</button>
            </div>
          </div>
        </div>

        <div class="section" v-if="achievements.length > 0">
          <h3>项目成果</h3>
          <div class="achievements-list">
            <div v-for="achievement in achievements" :key="achievement.id" class="achievement-item">
              <div class="achievement-icon">{{ getAchievementIcon(achievement.type) }}</div>
              <div class="achievement-info">
                <div class="achievement-title">{{ achievement.title }}</div>
                <div class="achievement-meta">
                  <span class="achievement-type">{{
                    getAchievementTypeText(achievement.type)
                  }}</span>
                  <span class="achievement-date">{{
                    formatDate(achievement.achievement_date)
                  }}</span>
                  <span class="achievement-status" :class="achievement.status">
                    {{ getAchievementStatusText(achievement.status) }}
                  </span>
                </div>
                <div class="achievement-desc" v-if="achievement.description">
                  {{ achievement.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 经费预算 -->
      <div v-if="activeTab === 'budget'" class="tab-panel">
        <div class="section">
          <h3>经费预算明细</h3>
          <div v-if="budgetItems.length === 0" class="empty-state">
            <p>暂无预算明细</p>
            <button class="add-btn" @click="addBudgetItem">+ 添加预算</button>
          </div>
          <div v-else class="budget-table">
            <table>
              <thead>
                <tr>
                  <th>预算科目</th>
                  <th>项目名称</th>
                  <th>详细说明</th>
                  <th>计算方法</th>
                  <th>金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in budgetItems" :key="item.id">
                  <td>{{ getBudgetCategory(item.category) }}</td>
                  <td>{{ item.item_name || '未命名' }}</td>
                  <td>{{ item.description || '无说明' }}</td>
                  <td class="calculation-method">{{ item.calculation_method || '未提供' }}</td>
                  <td class="text-right">¥ {{ formatAmount(item.amount || 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="4" class="text-right"><strong>预算合计</strong></td>
                  <td class="total-amount">
                    <strong>¥ {{ formatAmount(project.budget_total || 0) }}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
            <div class="section-actions">
              <button class="add-btn" @click="addBudgetItem">+ 添加预算</button>
            </div>
          </div>
        </div>

        <div class="section" v-if="budgetJustification">
          <h3>预算依据说明</h3>
          <div class="content-box">{{ budgetJustification }}</div>
        </div>
      </div>

      <!-- 项目进展 -->
      <div v-if="activeTab === 'progress'" class="tab-panel">
        <div class="section">
          <h3>项目进度</h3>
          <div class="progress-container">
            <div class="progress-bar-large">
              <div
                class="progress-fill-large"
                :style="{ width: getProgressWidth(project.status) + '%' }"
                :class="getProgressClass(project.status)"
              ></div>
            </div>
            <div class="progress-text-large">
              {{ getProgressText(project.status) }}
            </div>
          </div>
        </div>

        <div class="section">
          <h3>项目状态说明</h3>
          <div class="content-box">
            <p><strong>当前状态：</strong>{{ getStatusDescription(project.status) }}</p>
            <p v-if="project.status === 'revision'">
              <strong>修改建议：</strong>请根据评审意见修改后重新提交
            </p>
            <p v-if="project.status === 'incubating'">
              <strong>孵化说明：</strong>项目已进入孵化阶段，请按照计划执行
            </p>
          </div>
        </div>

        <div class="section">
          <h3>时间线</h3>
          <div class="timeline">
            <div class="timeline-item" :class="{ active: true }">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">项目创建</div>
                <div class="timeline-desc">{{ formatDateTime(project.created_at) }}</div>
              </div>
            </div>
            <div class="timeline-item" :class="{ active: project.status !== 'draft' }">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">项目提交</div>
                <div class="timeline-desc" v-if="project.submit_date">
                  已提交 ({{ formatDate(project.submit_date) }})
                </div>
                <div class="timeline-desc" v-else>待提交</div>
              </div>
            </div>
            <div
              class="timeline-item"
              :class="{
                active: [
                  'under_review',
                  'revision',
                  'batch_review',
                  'approved',
                  'incubating',
                  'completed',
                ].includes(project.status),
              }"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">评审阶段</div>
                <div class="timeline-desc">{{ getStatusText(project.status) }}</div>
              </div>
            </div>
            <div
              class="timeline-item"
              :class="{
                active:
                  project.status === 'approved' ||
                  project.status === 'incubating' ||
                  project.status === 'completed',
              }"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">批准立项</div>
                <div class="timeline-desc" v-if="project.approval_date">
                  批准日期：{{ formatDate(project.approval_date) }}
                </div>
                <div class="timeline-desc" v-else>待批准</div>
              </div>
            </div>
            <div class="timeline-item" :class="{ active: project.status === 'incubating' }">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">孵化阶段</div>
                <div class="timeline-desc">项目孵化中</div>
              </div>
            </div>
            <div class="timeline-item" :class="{ active: project.status === 'completed' }">
              <div class="timeline-dot"></div>
              <div class="timeline-content">
                <div class="timeline-date">项目完成</div>
                <div class="timeline-desc" v-if="project.status === 'completed'">已完成</div>
                <div class="timeline-desc" v-else>进行中</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 附件材料 -->
      <div v-if="activeTab === 'attachments'" class="tab-panel">
        <div class="section">
          <h3>附件清单</h3>

          <!-- 上传附件区域 -->
          <div
            class="upload-area"
            @dragover.prevent
            @drop.prevent="handleDrop"
            @click="triggerFileUpload"
          >
            <input
              type="file"
              ref="fileInput"
              multiple
              style="display: none"
              @change="handleFileSelect"
            />
            <div class="upload-icon">📁</div>
            <div class="upload-text">
              <strong>点击或拖拽文件到此处上传</strong>
              <span>支持图片、文档、视频等格式，单个文件不超过50MB</span>
            </div>
            <div v-if="uploading" class="upload-progress">
              <div class="progress-bar-small">
                <div class="progress-fill-small" :style="{ width: uploadProgress + '%' }"></div>
              </div>
              <span>上传中... {{ uploadProgress }}%</span>
            </div>
          </div>

          <!-- 附件列表 -->
          <div v-if="attachments.length === 0" class="empty-state">
            <p>暂无附件材料</p>
          </div>
          <div v-else class="attachments-list">
            <div v-for="attachment in attachments" :key="attachment.id" class="attachment-item">
              <div class="attachment-icon">{{ getMediaTypeIcon(attachment.media_type) }}</div>
              <div class="attachment-info">
                <div class="attachment-name">{{ attachment.name }}</div>
                <div class="attachment-meta">
                  <span class="file-size">{{ formatFileSize(attachment.size) }}</span>
                  <span class="file-type">{{ attachment.type }}</span>
                  <span class="file-section" v-if="attachment.section">{{
                    attachment.section
                  }}</span>
                  <span class="upload-time">{{ formatDateTime(attachment.created_at) }}</span>
                </div>
              </div>
              <div class="attachment-actions">
                <button class="download-btn" @click="downloadAttachment(attachment)">下载</button>
                <button class="delete-btn" @click="deleteAttachment(attachment)">删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="project" class="action-bar">
      <div class="action-left">
        <button class="action-btn secondary" @click="goBack">返回列表</button>
        <button class="action-btn" @click="openPrintDialog">🖨️ 打印</button>
      </div>

      <div class="action-right">
        <button class="action-btn primary" @click="editProject" v-if="project.status === 'draft'">
          继续编辑
        </button>
        <button class="action-btn danger" @click="deleteProject" v-if="project.status === 'draft'">
          删除草稿
        </button>
        <button class="action-btn success" @click="submitProject" v-if="project.status === 'draft'">
          提交审核
        </button>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div v-if="showDeleteConfirm" class="modal-overlay">
      <div class="modal-content">
        <h3>确认删除</h3>
        <p>确定要删除项目 "{{ project?.title }}" 吗？删除后无法恢复。</p>
        <div class="modal-actions">
          <button
            class="modal-btn secondary"
            @click="showDeleteConfirm = false"
            :disabled="deleting"
          >
            取消
          </button>
          <button class="modal-btn danger" @click="confirmDelete" :loading="deleting">
            {{ deleting ? '删除中...' : '确认删除' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 打印选项对话框 -->
    <div v-if="showPrintDialog" class="modal-overlay">
      <div class="modal-content" style="max-width: 450px">
        <h3>打印选项</h3>
        <p style="margin-bottom: 20px; color: #666">请选择要打印的内容：</p>

        <div class="print-options">
          <div class="print-option" @click="printCurrentPage">
            <div class="print-option-icon">📄</div>
            <div class="print-option-content">
              <div class="print-option-title">打印当前页面</div>
              <div class="print-option-desc">
                只打印当前显示的标签页内容（{{ currentTabName }}）
              </div>
            </div>
          </div>

          <div class="print-option" @click="printAllPages">
            <div class="print-option-icon">📚</div>
            <div class="print-option-content">
              <div class="print-option-title">打印所有信息</div>
              <div class="print-option-desc">
                打印所有板块（基本信息、研究团队、经费预算、项目进展、附件材料）
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions" style="margin-top: 24px">
          <button class="modal-btn secondary" @click="showPrintDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import axios from 'axios'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

// 创建axios实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// 请求拦截器 - 添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    if (config.data instanceof FormData) {
      config.headers['Content-Type'] = 'multipart/form-data'
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message)

    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('userInfo')
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    }

    return Promise.reject(error)
  },
)

// 状态管理
const loading = ref(false)
const deleting = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const dbConnected = ref(false)
const showDebugInfo = ref(import.meta.env.DEV)
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const showPrintDialog = ref(false)

// 用户信息接口
interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
  department?: string
  title?: string
}

// 项目数据接口
interface Project {
  id: string
  project_code?: string
  title: string
  domain_id?: string
  research_field?: string
  keywords: string
  abstract: string
  background: string
  objectives: string
  methodology: string
  expected_outcomes: string
  budget_total: number
  approved_budget?: number
  duration_months: number
  start_date?: string
  end_date?: string
  status: string
  submit_date?: string
  approval_date?: string
  support_level?: string
  remarks?: string
  created_at: string
  updated_at?: string
  applicant_id: string
  applicant_name?: string
  manager_id?: string
  manager_name?: string
}

// 团队成员接口
interface TeamMember {
  id: string
  name: string
  user_id?: string
  member_role: string
  title?: string
  department?: string
  organization?: string
  responsibility?: string
  workload_percentage?: number
  is_notable?: boolean
}

// 预算项接口
interface BudgetItem {
  id: string
  category: string
  item_name: string
  description: string
  amount: number
  calculation_method?: string
  justification?: string
  sort_order?: number
}

// 成果接口
interface Achievement {
  id: string
  type: string
  title: string
  description?: string
  achievement_date?: string
  authors?: any
  external_link?: string
  status: string
  verified_by?: string
  verified_date?: string
  verification_comment?: string
  created_at: string
}

// 附件接口
interface Attachment {
  id: string
  name: string
  size: number
  type: string
  media_type?: string
  section?: string
  file_path?: string
  created_at: string
}

// 数据状态
const project = ref<Project | null>(null)
const currentUser = ref<User | null>(null)
const teamMembers = ref<TeamMember[]>([])
const budgetItems = ref<BudgetItem[]>([])
const achievements = ref<Achievement[]>([])
const attachments = ref<Attachment[]>([])
const budgetJustification = ref('')

// UI状态
const activeTab = ref('basic')
const showDeleteConfirm = ref(false)

// 标签页
const tabs = [
  { key: 'basic', label: '基本信息' },
  { key: 'team', label: '研究团队' },
  { key: 'budget', label: '经费预算' },
  { key: 'progress', label: '项目进展' },
  { key: 'attachments', label: '附件材料' },
]

// 计算属性
const keywordsArray = computed(() => {
  if (!project.value?.keywords) return []
  return project.value.keywords.split(',').filter((k) => k.trim())
})

const currentTabName = computed(() => {
  const tab = tabs.find((t) => t.key === activeTab.value)
  return tab?.label || '当前页面'
})

// ==================== 辅助方法 ====================

const getStatusText = (status?: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '专家评审中',
    revision: '修改后重提',
    batch_review: '集中评审中',
    approved: '已批准',
    incubating: '孵化中',
    rejected: '未通过',
    completed: '已完成',
    terminated: '已终止',
  }
  return status ? statusMap[status] || status : '未知'
}

const getStatusClass = (status?: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'reviewing',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
    terminated: 'rejected',
  }
  return classMap[status || ''] || ''
}

const getStatusDescription = (status?: string) => {
  const descMap: Record<string, string> = {
    draft: '项目草稿，尚未提交审核',
    submitted: '项目已提交，等待专家评审',
    under_review: '项目正在由专家进行评审',
    revision: '需要根据评审意见修改后重新提交',
    batch_review: '项目进入集中评审环节',
    approved: '项目已通过评审，等待立项',
    incubating: '项目已立项，正在孵化中',
    rejected: '项目未通过评审',
    completed: '项目已完成',
    terminated: '项目已终止',
  }
  return descMap[status || ''] || '未知状态'
}

const getProgressWidth = (status: string) => {
  const progressMap: Record<string, number> = {
    draft: 20,
    submitted: 40,
    under_review: 50,
    revision: 45,
    batch_review: 55,
    approved: 70,
    incubating: 85,
    completed: 100,
    rejected: 100,
    terminated: 100,
  }
  return progressMap[status] || 0
}

const getProgressClass = (status: string) => {
  const classMap: Record<string, string> = {
    draft: 'draft',
    submitted: 'submitted',
    under_review: 'reviewing',
    revision: 'reviewing',
    batch_review: 'reviewing',
    approved: 'approved',
    incubating: 'ongoing',
    completed: 'completed',
    rejected: 'rejected',
  }
  return classMap[status] || ''
}

const getProgressText = (status: string) => {
  const textMap: Record<string, string> = {
    draft: '待提交',
    submitted: '等待专家评审',
    under_review: '专家评审中',
    revision: '修改后重新提交',
    batch_review: '集中评审中',
    approved: '已批准，等待立项',
    incubating: '项目孵化中',
    completed: '项目已完成',
    rejected: '未通过',
    terminated: '已终止',
  }
  return textMap[status] || ''
}

const getMemberRoleText = (role?: string) => {
  const roleMap: Record<string, string> = {
    principal: '项目负责人',
    co_principal: '共同负责人',
    researcher: '研究人员',
    student: '研究生/学生',
    other: '其他',
  }
  return roleMap[role || ''] || role || '成员'
}

const getMemberRoleClass = (role?: string) => {
  const classMap: Record<string, string> = {
    principal: 'principal',
    co_principal: 'co-principal',
    researcher: 'researcher',
    student: 'student',
  }
  return classMap[role || ''] || ''
}

const getUserRoleText = (role?: string) => {
  const roleMap: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '管理员',
  }
  return roleMap[role || ''] || role || '用户'
}

const getBudgetCategory = (category: string) => {
  const categoryMap: Record<string, string> = {
    设备费: '设备费',
    材料费: '材料费',
    测试费: '测试/计算/分析费',
    差旅费: '差旅/会议/国际合作交流费',
    会议费: '会议费',
    劳务费: '劳务费',
    专家咨询费: '专家咨询费',
    出版费: '出版/文献/信息传播/知识产权事务费',
    管理费: '管理费',
    其他: '其他支出',
  }
  return categoryMap[category] || category
}

const getAchievementTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '样机/原型',
    standard: '标准',
    award: '奖项',
    other: '其他',
  }
  return typeMap[type] || type
}

const getAchievementIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    paper: '📄',
    patent: '🔐',
    software: '💻',
    report: '📊',
    prototype: '🔧',
    standard: '📏',
    award: '🏆',
    other: '📎',
  }
  return iconMap[type] || '📄'
}

const getAchievementStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '待审核',
    verified: '已审核',
    rejected: '已驳回',
  }
  return statusMap[status] || status
}

const getMediaTypeIcon = (mediaType?: string) => {
  const iconMap: Record<string, string> = {
    image: '🖼️',
    audio: '🎵',
    video: '🎬',
    document: '📄',
    other: '📎',
  }
  return iconMap[mediaType || ''] || '📎'
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
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

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// ==================== 附件上传功能 ====================

const triggerFileUpload = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (files && files.length > 0) {
    await uploadFiles(Array.from(files))
  }
  input.value = ''
}

const handleDrop = async (event: DragEvent) => {
  event.preventDefault()
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    await uploadFiles(Array.from(files))
  }
}

const uploadFiles = async (files: File[]) => {
  if (!project.value) return

  const maxSize = 50 * 1024 * 1024
  const oversizedFiles = files.filter((f) => f.size > maxSize)
  if (oversizedFiles.length > 0) {
    ElMessage.error(`文件 ${oversizedFiles.map((f) => f.name).join(', ')} 超过50MB限制`)
    return
  }

  uploading.value = true
  uploadProgress.value = 0

  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      formData.append('project_id', project.value.id)
      formData.append('section', 'attachment')

      const mediaType = getFileMediaType(file.type)
      formData.append('media_type', mediaType)

      const response = await api.post('/attachments', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            uploadProgress.value = Math.round((i * 100 + percentCompleted) / files.length)
          }
        },
      })

      if (response.success) {
        attachments.value.unshift({
          id: response.data.id,
          name: file.name,
          size: file.size,
          type: file.type,
          media_type: mediaType,
          created_at: new Date().toISOString(),
        })
        ElMessage.success(`文件 ${file.name} 上传成功`)
      } else {
        ElMessage.error(`文件 ${file.name} 上传失败: ${response.error}`)
      }
    }
  } catch (error: any) {
    console.error('上传失败:', error)
    ElMessage.error('上传失败: ' + (error.message || '未知错误'))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const getFileMediaType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
    return 'document'
  }
  return 'other'
}

const downloadAttachment = async (attachment: Attachment) => {
  try {
    ElMessage.info('正在下载...')
    const response = await api.get(`/attachments/${attachment.id}`, {
      responseType: 'blob',
    })

    const blob = new Blob([response as Blob], { type: attachment.type })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('下载成功')
  } catch (error: any) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  }
}

const deleteAttachment = async (attachment: Attachment) => {
  try {
    await ElMessageBox.confirm(`确定要删除附件 "${attachment.name}" 吗？`, '确认删除', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await api.delete(`/attachments/${attachment.id}`)
    if (response.success) {
      attachments.value = attachments.value.filter((a) => a.id !== attachment.id)
      ElMessage.success('附件删除成功')
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// ==================== 打印功能 ====================

const openPrintDialog = () => {
  showPrintDialog.value = true
}

const getPrintStyles = () => {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 20px;
      background: white;
      color: #2c3e50;
      font-size: 14px;
      line-height: 1.5;
    }
    .print-header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1890ff;
    }
    .print-header h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .print-header .project-code {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    .print-header .status {
      margin-top: 5px;
      color: #1890ff;
    }
    .print-header .print-date {
      margin-top: 10px;
      font-size: 12px;
      color: #999;
    }
    .print-header .section-name {
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px solid #e8e8e8;
      font-size: 16px;
      font-weight: 500;
      color: #2c3e50;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .info-item {
      display: flex;
      gap: 8px;
    }
    .info-item label {
      color: #666;
      min-width: 100px;
    }
    .info-item span {
      color: #2c3e50;
      font-weight: 500;
    }
    .full-width {
      grid-column: 1 / -1;
    }
    .keywords {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .keyword-tag {
      background: #e6f7ff;
      color: #1890ff;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
    }
    .content-box {
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      padding: 15px;
      line-height: 1.6;
      margin-top: 10px;
      white-space: pre-wrap;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
    }
    th, td {
      border: 1px solid #e8e8e8;
      padding: 8px 12px;
      text-align: left;
    }
    th {
      background: #f5f7fa;
      font-weight: 500;
    }
    .text-right {
      text-align: right;
    }
    .total-amount {
      color: #1890ff;
      font-weight: bold;
    }
    .role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
    }
    .role-badge.principal {
      background: #f6ffed;
      color: #52c41a;
    }
    .role-badge.co-principal {
      background: #e6f7ff;
      color: #1890ff;
    }
    .role-badge.researcher {
      background: #fff7e6;
      color: #fa8c16;
    }
    .timeline {
      position: relative;
      padding-left: 30px;
    }
    .timeline-item {
      position: relative;
      margin-bottom: 20px;
    }
    .timeline-dot {
      position: absolute;
      left: -24px;
      top: 4px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #1890ff;
    }
    .timeline-date {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .timeline-desc {
      font-size: 13px;
      color: #666;
    }
    .progress-container {
      padding: 20px;
      background: #fafafa;
      border-radius: 8px;
      text-align: center;
    }
    .progress-bar-large {
      height: 20px;
      background: #f5f5f5;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 10px;
    }
    .progress-fill-large {
      height: 100%;
      width: ${getProgressWidth(project.value?.status || 'draft')}%;
      background: #1890ff;
      border-radius: 10px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h3 {
      font-size: 16px;
      margin-bottom: 12px;
      color: #2c3e50;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
    .attachments-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .attachment-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
    }
    .attachment-icon {
      font-size: 20px;
    }
    .attachment-info {
      flex: 1;
    }
    .attachment-name {
      font-weight: 500;
    }
    .attachment-meta {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
    .budget-amount, .approved-budget {
      color: #1890ff;
      font-weight: bold;
    }
    @media print {
      body {
        padding: 0;
      }
    }
  `
}

// 打印当前页面（当前激活的标签页）
const printCurrentPage = () => {
  showPrintDialog.value = false

  let contentHtml = ''
  const currentTab = activeTab.value

  // 根据当前标签页生成内容
  switch (currentTab) {
    case 'basic':
      contentHtml = generateBasicContent()
      break
    case 'team':
      contentHtml = generateTeamContent()
      break
    case 'budget':
      contentHtml = generateBudgetContent()
      break
    case 'progress':
      contentHtml = generateProgressContent()
      break
    case 'attachments':
      contentHtml = generateAttachmentsContent()
      break
    default:
      contentHtml = generateBasicContent()
  }

  const projectInfoHtml = generateProjectInfoHtml()

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${project.value?.title || '项目详情'} - ${currentTabName.value}</title>
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      <div class="print-header">
        <h1>${project.value?.title || '项目详情'}</h1>
        <div class="project-code">项目编号：${project.value?.project_code || '暂未编号'}</div>
        <div class="status">状态：${getStatusText(project.value?.status)}</div>
        <div class="print-date">打印时间：${new Date().toLocaleString('zh-CN')}</div>
        <div class="section-name">${currentTabName.value}</div>
      </div>
      ${projectInfoHtml}
      <div style="margin-top: 20px;">${contentHtml}</div>
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.onload = () => printWindow.print()
  } else {
    ElMessage.error('无法打开打印窗口')
  }
}

// 打印所有信息 - 使用数据生成
const printAllPages = () => {
  showPrintDialog.value = false

  const projectInfoHtml = generateProjectInfoHtml()
  const basicHtml = generateBasicContent()
  const teamHtml = generateTeamContent()
  const budgetHtml = generateBudgetContent()
  const progressHtml = generateProgressContent()
  const attachmentsHtml = generateAttachmentsContent()

  const allContentHtml = `
    <div style="margin-top: 20px;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; margin-bottom: 20px;">一、基本信息</h2>
      ${basicHtml}
    </div>
    <div style="page-break-before: always; margin-top: 20px;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; margin-bottom: 20px;">二、研究团队</h2>
      ${teamHtml}
    </div>
    <div style="page-break-before: always; margin-top: 20px;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; margin-bottom: 20px;">三、经费预算</h2>
      ${budgetHtml}
    </div>
    <div style="page-break-before: always; margin-top: 20px;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; margin-bottom: 20px;">四、项目进展</h2>
      ${progressHtml}
    </div>
    <div style="page-break-before: always; margin-top: 20px;">
      <h2 style="color: #1890ff; border-bottom: 2px solid #e8e8e8; padding-bottom: 8px; margin-bottom: 20px;">五、附件材料</h2>
      ${attachmentsHtml}
    </div>
  `

  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${project.value?.title || '项目详情'} - 完整报告</title>
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      <div class="print-header">
        <h1>${project.value?.title || '项目详情'}</h1>
        <div class="project-code">项目编号：${project.value?.project_code || '暂未编号'}</div>
        <div class="status">状态：${getStatusText(project.value?.status)}</div>
        <div class="print-date">打印时间：${new Date().toLocaleString('zh-CN')}</div>
      </div>
      ${projectInfoHtml}
      ${allContentHtml}
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.onload = () => printWindow.print()
  } else {
    ElMessage.error('无法打开打印窗口')
  }
}
// 辅助函数：转义HTML特殊字符
const escapeHtml = (text) => {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
// 生成项目基本信息HTML
const generateProjectInfoHtml = () => {
  if (!project.value) return ''

  return `
    <div class="project-info-card">
      <div class="info-header">
        <h2>${escapeHtml(project.value.title)}</h2>
        <div class="project-type">${escapeHtml(project.value.research_field || '未分类')}</div>
      </div>
      <div class="info-grid">
        <div class="info-item"><label>研究领域：</label><span>${escapeHtml(project.value.research_field || '未指定')}</span></div>
        <div class="info-item"><label>项目负责人：</label><span>${escapeHtml(project.value.applicant_name || currentUser.value?.name || '申请人')}</span></div>
        <div class="info-item"><label>项目经理：</label><span>${escapeHtml(project.value.manager_name || '待分配')}</span></div>
        <div class="info-item"><label>研究期限：</label><span>${formatDate(project.value.start_date)} 至 ${formatDate(project.value.end_date)}</span></div>
        <div class="info-item"><label>研究周期：</label><span>${project.value.duration_months || 0} 个月</span></div>
        <div class="info-item"><label>申请经费：</label><span class="budget-amount">¥ ${formatAmount(project.value.budget_total || 0)}</span></div>
        ${project.value.approved_budget ? `<div class="info-item"><label>批准经费：</label><span class="approved-budget">¥ ${formatAmount(project.value.approved_budget)}</span></div>` : ''}
        <div class="info-item"><label>提交日期：</label><span>${formatDate(project.value.submit_date) || '未提交'}</span></div>
        <div class="info-item"><label>批准日期：</label><span>${formatDate(project.value.approval_date) || '未批准'}</span></div>
        <div class="info-item"><label>创建时间：</label><span>${formatDateTime(project.value.created_at)}</span></div>
        <div class="info-item"><label>最后更新：</label><span>${formatDateTime(project.value.updated_at || project.value.created_at)}</span></div>
        <div class="info-item full-width"><label>关键词：</label><div class="keywords">${(
          project.value.keywords || ''
        )
          .split(',')
          .filter((k) => k.trim())
          .map((k) => `<span class="keyword-tag">${escapeHtml(k.trim())}</span>`)
          .join('')}</div></div>
      </div>
    </div>
  `
}

// 生成基本信息内容
const generateBasicContent = () => {
  if (!project.value) return ''

  return `
    <div class="section"><h3>项目摘要</h3><div class="content-box">${escapeHtml(project.value.abstract || '暂无摘要')}</div></div>
    <div class="section"><h3>研究背景与意义</h3><div class="content-box">${escapeHtml(project.value.background || '暂无内容')}</div></div>
    <div class="section"><h3>研究目标与内容</h3><div class="content-box">${escapeHtml(project.value.objectives || '暂无内容')}</div></div>
    <div class="section"><h3>研究方法与技术路线</h3><div class="content-box">${escapeHtml(project.value.methodology || '暂无内容')}</div></div>
    <div class="section"><h3>预期成果</h3><div class="content-box">${escapeHtml(project.value.expected_outcomes || '暂无内容')}</div></div>
    ${project.value.support_level ? `<div class="section"><h3>支持方案</h3><div class="content-box">${escapeHtml(project.value.support_level)}</div></div>` : ''}
    ${project.value.remarks ? `<div class="section"><h3>备注说明</h3><div class="content-box">${escapeHtml(project.value.remarks)}</div></div>` : ''}
  `
}

// 生成研究团队内容
const generateTeamContent = () => {
  if (!project.value) return ''

  let teamHtml = '<div class="section"><h3>项目组成员</h3>'

  if (teamMembers.value.length === 0) {
    teamHtml += '<div class="empty-state"><p>暂无团队成员信息</p></div>'
  } else {
    teamHtml +=
      '<div class="team-table">\n<table>\n<thead>\n<tr>\n<th>序号</th>\n<th>姓名</th>\n<th>单位</th>\n<th>职称</th>\n<th>角色</th>\n<th>分工/职责</th>\n<th>工作量</th>\n</tr>\n</thead>\n<tbody>\n'

    teamMembers.value.forEach((member, index) => {
      teamHtml += `
        <tr>
           <td>${index + 1}</td>
           <td>${escapeHtml(member.name || '未命名')}</td>
           <td>${escapeHtml(member.department || member.organization || '未指定')}</td>
           <td>${escapeHtml(member.title || '未指定')}</td>
           <td><span class="role-badge ${getMemberRoleClass(member.member_role)}">${getMemberRoleText(member.member_role)}</span></td>
           <td>${escapeHtml(member.responsibility || '未指定')}</td>
           <td>${member.workload_percentage || 0}%</td>
         </tr>
      `
    })

    teamHtml += '</tbody>\n</table>\n</div>'
  }
  teamHtml += '</div>'

  // 添加成果部分
  if (achievements.value.length > 0) {
    teamHtml += '<div class="section"><h3>项目成果</h3><div class="achievements-list">'
    achievements.value.forEach((achievement) => {
      teamHtml += `
        <div class="achievement-item">
          <div class="achievement-icon">${getAchievementIcon(achievement.type)}</div>
          <div class="achievement-info">
            <div class="achievement-title">${escapeHtml(achievement.title)}</div>
            <div class="achievement-meta">
              <span class="achievement-type">${getAchievementTypeText(achievement.type)}</span>
              <span class="achievement-date">${formatDate(achievement.achievement_date)}</span>
              <span class="achievement-status ${achievement.status}">${getAchievementStatusText(achievement.status)}</span>
            </div>
            ${achievement.description ? `<div class="achievement-desc">${escapeHtml(achievement.description)}</div>` : ''}
          </div>
        </div>
      `
    })
    teamHtml += '</div></div>'
  }

  return teamHtml
}

// 生成经费预算内容
const generateBudgetContent = () => {
  if (!project.value) return ''

  let budgetHtml = '<div class="section"><h3>经费预算明细</h3>'

  if (budgetItems.value.length === 0) {
    budgetHtml += '<div class="empty-state"><p>暂无预算明细</p></div>'
  } else {
    budgetHtml +=
      '<div class="budget-table">\n<table>\n<thead>\n<tr>\n<th>预算科目</th>\n<th>项目名称</th>\n<th>详细说明</th>\n<th>计算方法</th>\n<th>金额（元）</th>\n</tr>\n</thead>\n<tbody>\n'

    budgetItems.value.forEach((item) => {
      budgetHtml += `
        <tr>
           <td>${getBudgetCategory(item.category)}</td>
           <td>${escapeHtml(item.item_name || '未命名')}</td>
           <td>${escapeHtml(item.description || '无说明')}</td>
           <td class="calculation-method">${escapeHtml(item.calculation_method || '未提供')}</td>
           <td class="text-right">¥ ${formatAmount(item.amount || 0)}</td>
         </tr>
      `
    })

    budgetHtml += `
        <tr>
          <td colspan="4" class="text-right"><strong>预算合计</strong></td>
          <td class="total-amount"><strong>¥ ${formatAmount(project.value.budget_total || 0)}</strong></td>
         </tr>
      </tbody>\n</table>\n</div>`
  }

  budgetHtml += '</div>'

  if (budgetJustification.value) {
    budgetHtml += `<div class="section"><h3>预算依据说明</h3><div class="content-box">${escapeHtml(budgetJustification.value)}</div></div>`
  }

  return budgetHtml
}

// 生成项目进展内容
const generateProgressContent = () => {
  if (!project.value) return ''

  const status = project.value.status
  const progressWidth = getProgressWidth(status)
  const progressText = getProgressText(status)

  return `
    <div class="section">
      <h3>项目进度</h3>
      <div class="progress-container">
        <div class="progress-bar-large">
          <div class="progress-fill-large ${getProgressClass(status)}" style="width: ${progressWidth}%"></div>
        </div>
        <div class="progress-text-large">${progressText}</div>
      </div>
    </div>
    <div class="section">
      <h3>项目状态说明</h3>
      <div class="content-box">
        <p><strong>当前状态：</strong>${getStatusDescription(status)}</p>
        ${status === 'revision' ? '<p><strong>修改建议：</strong>请根据评审意见修改后重新提交</p>' : ''}
        ${status === 'incubating' ? '<p><strong>孵化说明：</strong>项目已进入孵化阶段，请按照计划执行</p>' : ''}
      </div>
    </div>
    <div class="section">
      <h3>时间线</h3>
      <div class="timeline">
        <div class="timeline-item active">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">项目创建</div>
            <div class="timeline-desc">${formatDateTime(project.value.created_at)}</div>
          </div>
        </div>
        <div class="timeline-item ${project.value.status !== 'draft' ? 'active' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">项目提交</div>
            <div class="timeline-desc">${project.value.submit_date ? `已提交 (${formatDate(project.value.submit_date)})` : '待提交'}</div>
          </div>
        </div>
        <div class="timeline-item ${['under_review', 'revision', 'batch_review', 'approved', 'incubating', 'completed'].includes(status) ? 'active' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">评审阶段</div>
            <div class="timeline-desc">${getStatusText(status)}</div>
          </div>
        </div>
        <div class="timeline-item ${status === 'approved' || status === 'incubating' || status === 'completed' ? 'active' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">批准立项</div>
            <div class="timeline-desc">${project.value.approval_date ? `批准日期：${formatDate(project.value.approval_date)}` : '待批准'}</div>
          </div>
        </div>
        <div class="timeline-item ${status === 'incubating' ? 'active' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">孵化阶段</div>
            <div class="timeline-desc">项目孵化中</div>
          </div>
        </div>
        <div class="timeline-item ${status === 'completed' ? 'active' : ''}">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-date">项目完成</div>
            <div class="timeline-desc">${status === 'completed' ? '已完成' : '进行中'}</div>
          </div>
        </div>
      </div>
    </div>
  `
}

// 生成附件材料内容
const generateAttachmentsContent = () => {
  if (!project.value) return ''

  let attachmentsHtml = '<div class="section"><h3>附件清单</h3>'

  if (attachments.value.length === 0) {
    attachmentsHtml += '<div class="empty-state"><p>暂无附件材料</p></div>'
  } else {
    attachmentsHtml += '<div class="attachments-list">'
    attachments.value.forEach((attachment) => {
      attachmentsHtml += `
        <div class="attachment-item">
          <div class="attachment-icon">${getMediaTypeIcon(attachment.media_type)}</div>
          <div class="attachment-info">
            <div class="attachment-name">${escapeHtml(attachment.name)}</div>
            <div class="attachment-meta">
              <span class="file-size">${formatFileSize(attachment.size)}</span>
              <span class="file-type">${attachment.type}</span>
              ${attachment.section ? `<span class="file-section">${escapeHtml(attachment.section)}</span>` : ''}
              <span class="upload-time">${formatDateTime(attachment.created_at)}</span>
            </div>
          </div>
        </div>
      `
    })
    attachmentsHtml += '</div>'
  }
  attachmentsHtml += '</div>'

  return attachmentsHtml
}
// ==================== 导出PDF功能 ====================

const exportProject = async () => {
  try {
    ElMessage.info('正在生成PDF，请稍候...')

    const tempContainer = document.createElement('div')
    tempContainer.style.position = 'absolute'
    tempContainer.style.left = '-9999px'
    tempContainer.style.top = '-9999px'
    tempContainer.style.width = '800px'
    tempContainer.style.backgroundColor = 'white'
    tempContainer.style.padding = '30px'
    tempContainer.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

    const titleDiv = document.createElement('div')
    titleDiv.style.textAlign = 'center'
    titleDiv.style.marginBottom = '30px'
    titleDiv.style.paddingBottom = '20px'
    titleDiv.style.borderBottom = '2px solid #1890ff'
    titleDiv.innerHTML = `
      <h1 style="font-size: 24px; margin-bottom: 10px;">${project.value?.title || '项目详情'}</h1>
      <p style="color: #666;">项目编号：${project.value?.project_code || '暂未编号'}</p>
      <p style="color: #666;">状态：${getStatusText(project.value?.status)}</p>
    `
    tempContainer.appendChild(titleDiv)

    const projectInfoCard = document.querySelector('.project-info-card')
    if (projectInfoCard) {
      const clonedInfo = projectInfoCard.cloneNode(true)
      const btns = clonedInfo.querySelectorAll('.action-btn, .add-btn, .section-actions')
      btns.forEach((btn) => btn.remove())
      tempContainer.appendChild(clonedInfo)
    }

    const allPanels = document.querySelectorAll('.tab-panel')
    const sectionTitles = [
      '一、基本信息',
      '二、研究团队',
      '三、经费预算',
      '四、项目进展',
      '五、附件材料',
    ]

    for (let i = 0; i < allPanels.length; i++) {
      const panel = allPanels[i]
      if (panel) {
        const sectionDiv = document.createElement('div')
        sectionDiv.style.marginTop = '30px'
        sectionDiv.style.pageBreakBefore = i > 0 ? 'always' : 'auto'

        const sectionTitle = document.createElement('h2')
        sectionTitle.textContent = sectionTitles[i] || `第${i + 1}部分`
        sectionTitle.style.color = '#1890ff'
        sectionTitle.style.borderBottom = '2px solid #e8e8e8'
        sectionTitle.style.paddingBottom = '10px'
        sectionTitle.style.marginBottom = '20px'
        sectionTitle.style.fontSize = '18px'
        sectionDiv.appendChild(sectionTitle)

        const clonedPanel = panel.cloneNode(true)
        const removeElements = clonedPanel.querySelectorAll(
          '.add-btn, .section-actions, .upload-area, .attachment-actions, .delete-btn, .action-btn',
        )
        removeElements.forEach((el) => el.remove())

        sectionDiv.appendChild(clonedPanel)
        tempContainer.appendChild(sectionDiv)
      }
    }

    document.body.appendChild(tempContainer)

    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
    })

    document.body.removeChild(tempContainer)

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdf.internal.pageSize.getHeight()

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
    }

    const fileName = `${project.value?.project_code || 'project'}_${project.value?.title || 'detail'}.pdf`
    pdf.save(fileName)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + (error as Error).message)
  }
}

// ==================== 数据加载方法 ====================

const loadCurrentUser = async () => {
  try {
    const userInfoStr = localStorage.getItem('userInfo')
    if (userInfoStr) {
      currentUser.value = JSON.parse(userInfoStr)
    } else {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        currentUser.value = JSON.parse(userStr)
      }
    }
  } catch (error) {
    console.error('加载用户信息失败:', error)
  }
}

const loadProjectDetail = async () => {
  const projectId = route.params.id as string
  console.log('📥 获取的项目ID:', projectId)

  if (!projectId || projectId === 'undefined' || projectId === 'null') {
    errorMessage.value = '项目ID无效或缺失'
    ElMessage.error('项目ID无效，请返回项目列表重试')
    setTimeout(() => router.push('/projects'), 2000)
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    console.log('🔄 加载项目详情:', projectId)

    const response = await api.get(`/projects/${projectId}`)
    console.log('项目详情响应:', response)

    if (response.success && response.data) {
      const data = response.data

      if (data.project) {
        project.value = data.project
      } else {
        project.value = data as Project
      }

      if (data.members && Array.isArray(data.members)) {
        teamMembers.value = data.members
      }

      if (data.budgets && Array.isArray(data.budgets)) {
        budgetItems.value = data.budgets
        const justificationItems = budgetItems.value.filter((item) => item.justification)
        if (justificationItems.length > 0) {
          budgetJustification.value = justificationItems
            .map((item) => `${item.item_name}：${item.justification}`)
            .join('\n')
        }
      }

      if (data.achievements && Array.isArray(data.achievements)) {
        achievements.value = data.achievements
      }

      if (data.attachments && Array.isArray(data.attachments)) {
        attachments.value = data.attachments
      }

      dbConnected.value = true
      console.log('✅ 项目详情加载成功')
    } else {
      errorMessage.value = response.error || '加载项目详情失败'
      ElMessage.error('加载项目详情失败')
    }
  } catch (error: any) {
    console.error('❌ 加载项目详情失败:', error)
    errorMessage.value = error.message || '网络错误，请检查后端服务'
    dbConnected.value = false
    ElMessage.error('加载项目详情失败')
  } finally {
    loading.value = false
  }
}

// ==================== 操作方法 ====================

const goBack = () => {
  router.push('/projects')
}

const editProject = () => {
  if (project.value) {
    router.push(`/projects/create?id=${project.value.id}`)
  }
}

const deleteProject = () => {
  if (project.value) {
    showDeleteConfirm.value = true
  }
}

const confirmDelete = async () => {
  if (!project.value) return

  deleting.value = true
  try {
    console.log('🗑️ 删除项目:', project.value.id)

    const response = await api.delete(`/projects/${project.value.id}`)

    if (response.success) {
      ElMessage.success('项目删除成功')
      router.push('/projects')
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error: any) {
    console.error('删除项目失败:', error)
    ElMessage.error(error.message || '删除失败')
  } finally {
    deleting.value = false
    showDeleteConfirm.value = false
  }
}

const submitProject = async () => {
  if (!project.value) return

  try {
    await ElMessageBox.confirm('提交后项目将进入审核流程，无法再修改。确认要提交吗？', '提交确认', {
      confirmButtonText: '确认提交',
      cancelButtonText: '再检查一下',
      type: 'warning',
    })

    const response = await api.put(`/projects/${project.value.id}`, {
      status: 'submitted',
      submit_date: new Date().toISOString().split('T')[0],
    })

    if (response.success) {
      ElMessage.success('项目提交成功，已进入审核流程')
      await loadProjectDetail()
    } else {
      ElMessage.error(response.error || '提交失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('提交失败:', error)
      ElMessage.error('提交失败: ' + (error.message || '未知错误'))
    }
  }
}

const addTeamMember = () => {
  ElMessage.info('添加团队成员功能开发中...')
}

const addBudgetItem = () => {
  ElMessage.info('添加预算项目功能开发中...')
}

const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

// 初始化
onMounted(async () => {
  console.log('🚀 ProjectDetail 组件初始化')

  await loadCurrentUser()
  await loadProjectDetail()

  console.log('当前用户:', currentUser.value)
  console.log('项目详情:', project.value)
})
</script>

<style scoped>
/* 项目详情样式 */
.project-detail {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

/* 页面标题 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.back-btn {
  padding: 8px 16px;
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.back-btn:hover {
  background: #e8e8e8;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  color: #2c3e50;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-subtitle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.project-no {
  font-size: 14px;
  color: #666;
  background: #f5f7fa;
  padding: 4px 12px;
  border-radius: 4px;
  font-family: monospace;
}

.status-badge {
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
}

.status-badge.draft {
  background: #fff7e6;
  color: #fa8c16;
}

.status-badge.submitted {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.reviewing {
  background: #fff0f6;
  color: #eb2f96;
}

.status-badge.approved {
  background: #f6ffed;
  color: #52c41a;
}

.status-badge.ongoing {
  background: #1890ff;
  color: white;
}

.status-badge.completed {
  background: #52c41a;
  color: white;
}

.status-badge.rejected {
  background: #ff4d4f;
  color: white;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  padding: 10px 24px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn.secondary {
  background: #f5f7fa;
  color: #666;
  border: 1px solid #d9d9d9;
}

.action-btn.secondary:hover {
  background: #e8e8e8;
}

.action-btn.primary {
  background: #1890ff;
  color: white;
}

.action-btn.primary:hover {
  background: #40a9ff;
}

.action-btn.danger {
  background: #fff2f0;
  color: #ff4d4f;
  border: 1px solid #ffccc7;
}

.action-btn.danger:hover {
  background: #ffccc7;
}

.action-btn.success {
  background: #52c41a;
  color: white;
}

.action-btn.success:hover {
  background: #73d13d;
}

/* 项目信息卡片 */
.project-info-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.info-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
  flex: 1;
}

.project-type {
  background: #e6f7ff;
  color: #1890ff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.info-item {
  display: flex;
  gap: 8px;
}

.info-item label {
  color: #666;
  min-width: 100px;
  font-size: 14px;
}

.info-item span {
  color: #2c3e50;
  font-weight: 500;
}

.full-width {
  grid-column: 1 / -1;
}

.budget-amount {
  color: #1890ff;
  font-weight: bold;
}

.approved-budget {
  color: #52c41a;
  font-weight: bold;
}

/* 关键词 */
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
}

/* 标签导航 */
.tab-navigation {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: #f5f7fa;
  color: #666;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #1890ff;
  color: white;
}

/* 标签内容 */
.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.section h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  color: #2c3e50;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
}

.content-box {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 20px;
  line-height: 1.8;
  color: #2c3e50;
  white-space: pre-wrap;
}

/* 表格 */
.team-table,
.budget-table {
  overflow-x: auto;
}

.team-table table,
.budget-table table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.team-table th,
.budget-table th {
  background: #f5f7fa;
  padding: 12px;
  text-align: left;
  font-weight: 500;
  color: #2c3e50;
  border: 1px solid #e8e8e8;
}

.team-table td,
.budget-table td {
  padding: 12px;
  border: 1px solid #e8e8e8;
  vertical-align: top;
}

.text-right {
  text-align: right;
}

.total-amount {
  color: #1890ff;
  font-size: 16px;
}

.calculation-method {
  font-size: 12px;
  color: #666;
  max-width: 200px;
}

/* 角色徽章 */
.role-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.role-badge.principal {
  background: #f6ffed;
  color: #52c41a;
}

.role-badge.co-principal {
  background: #e6f7ff;
  color: #1890ff;
}

.role-badge.researcher {
  background: #fff7e6;
  color: #fa8c16;
}

.role-badge.student {
  background: #f0f5ff;
  color: #2f54eb;
}

/* 成果列表 */
.achievements-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.achievement-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  transition: all 0.3s;
}

.achievement-item:hover {
  border-color: #1890ff;
  background: white;
}

.achievement-icon {
  font-size: 28px;
  min-width: 48px;
  text-align: center;
}

.achievement-info {
  flex: 1;
}

.achievement-title {
  font-weight: 600;
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.achievement-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
}

.achievement-type {
  padding: 2px 8px;
  background: #e6f7ff;
  color: #1890ff;
  border-radius: 12px;
}

.achievement-date {
  color: #7f8c8d;
}

.achievement-status {
  padding: 2px 8px;
  border-radius: 12px;
}

.achievement-status.submitted {
  background: #fff7e6;
  color: #fa8c16;
}

.achievement-status.verified {
  background: #f6ffed;
  color: #52c41a;
}

.achievement-status.rejected {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 附件列表 */
.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
}

.attachment-item:hover {
  border-color: #1890ff;
  background: #f5f7fa;
}

.attachment-icon {
  font-size: 28px;
  min-width: 48px;
  text-align: center;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  font-weight: 500;
  margin-bottom: 4px;
  color: #2c3e50;
}

.attachment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.download-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.download-btn:hover {
  background: #40a9ff;
}

.delete-btn {
  padding: 6px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.delete-btn:hover {
  background: #ffccc7;
}

/* 上传区域 */
.upload-area {
  border: 2px dashed #d9d9d9;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  background: #fafafa;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 24px;
}

.upload-area:hover {
  border-color: #1890ff;
  background: #f5f7fa;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.upload-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-text strong {
  font-size: 16px;
  color: #2c3e50;
}

.upload-text span {
  font-size: 12px;
  color: #7f8c8d;
}

.upload-progress {
  margin-top: 16px;
}

.progress-bar-small {
  height: 6px;
  background: #f0f0f0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill-small {
  height: 100%;
  background: #1890ff;
  border-radius: 3px;
  transition: width 0.3s;
}

/* 进度条 */
.progress-container {
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
  text-align: center;
}

.progress-bar-large {
  height: 20px;
  background: #f5f5f5;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill-large {
  height: 100%;
  border-radius: 10px;
  transition: width 0.3s;
}

.progress-fill-large.draft {
  background: #fa8c16;
}

.progress-fill-large.submitted {
  background: #1890ff;
}

.progress-fill-large.reviewing {
  background: #eb2f96;
}

.progress-fill-large.approved {
  background: #52c41a;
}

.progress-fill-large.ongoing {
  background: #2f54eb;
}

.progress-fill-large.completed {
  background: #52c41a;
}

.progress-text-large {
  font-size: 16px;
  font-weight: 500;
  color: #2c3e50;
}

/* 时间线 */
.timeline {
  position: relative;
  padding-left: 30px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #f0f0f0;
}

.timeline-item {
  position: relative;
  margin-bottom: 24px;
}

.timeline-dot {
  position: absolute;
  left: -24px;
  top: 4px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ddd;
  border: 2px solid white;
}

.timeline-item.active .timeline-dot {
  background: #1890ff;
}

.timeline-content {
  padding: 8px 16px;
  background: #fafafa;
  border-radius: 6px;
}

.timeline-date {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 4px;
}

.timeline-desc {
  font-size: 14px;
  color: #666;
}

/* 底部操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-left,
.action-right {
  display: flex;
  gap: 12px;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #7f8c8d;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #f0f0f0;
}

.add-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 12px;
}

.add-btn:hover {
  background: #40a9ff;
}

.section-actions {
  margin-top: 16px;
  text-align: right;
}

/* 错误提示 */
.error-alert {
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.error-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.error-icon {
  font-size: 18px;
}

.error-text {
  flex: 1;
  color: #ff4d4f;
}

.error-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 数据库状态栏 */
.db-status-bar {
  background: #f0f0f0;
  padding: 8px 16px;
  margin-bottom: 16px;
  border-radius: 8px;
  font-size: 12px;
}

.db-status-content {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.db-status-value.connected {
  color: #52c41a;
}

.db-toggle-btn {
  background: none;
  border: none;
  color: #1890ff;
  cursor: pointer;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  min-width: 320px;
  max-width: 500px;
}

.modal-content h3 {
  margin: 0 0 16px 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.modal-btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.modal-btn.secondary {
  background: #f5f7fa;
  border: 1px solid #d9d9d9;
}

.modal-btn.danger {
  background: #ff4d4f;
  color: white;
}

/* 打印选项 */
.print-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.print-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.print-option:hover {
  border-color: #1890ff;
  background: #f5f7fa;
  transform: translateX(4px);
}

.print-option-icon {
  font-size: 32px;
  min-width: 48px;
  text-align: center;
}

.print-option-content {
  flex: 1;
}

.print-option-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  color: #2c3e50;
}

.print-option-desc {
  font-size: 12px;
  color: #7f8c8d;
}

/* 响应式 */
@media (max-width: 768px) {
  .project-detail {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-left {
    flex-wrap: wrap;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .tab-navigation {
    overflow-x: auto;
  }

  .tab-btn {
    min-width: 100px;
  }

  .action-bar {
    flex-direction: column;
    gap: 16px;
  }

  .action-left,
  .action-right {
    width: 100%;
    justify-content: center;
  }
}

/* 打印样式 */
@media print {
  .back-btn,
  .header-actions,
  .tab-navigation,
  .action-bar,
  .db-status-bar,
  .upload-area,
  .attachment-actions,
  .add-btn,
  .section-actions,
  .modal-overlay {
    display: none !important;
  }

  .project-detail {
    padding: 0;
  }

  .tab-content {
    display: block !important;
  }

  .tab-panel {
    display: block !important;
    page-break-inside: avoid;
  }

  .project-info-card {
    box-shadow: none;
    padding: 0;
  }
}
</style>
