<!-- src/views/applicant/ProjectDetail.vue -->
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
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>研究领域：</label>
          <div class="domain-tags">
            <span v-for="domain in project.research_domains" :key="domain.id" class="domain-tag">
              {{ domain.name }}
            </span>
            <span v-if="!project.research_domains?.length">未指定</span>
          </div>
        </div>
        <div class="info-item">
          <label>技术成熟度：</label>
          <span>{{ getTechMaturityText(project.tech_maturity) }}</span>
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
          <h3>成果简介（背景、痛点、技术方案、竞争优势、创新点等）</h3>
          <div class="content-box">{{ project.detailed_introduction_part1 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>知识产权情况</h3>
          <div class="content-box">{{ project.detailed_introduction_part2 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>已有应用/试点情况</h3>
          <div class="content-box">{{ project.detailed_introduction_part3 || '暂无内容' }}</div>
        </div>

        <div class="section">
          <h3>实施计划</h3>
          <div class="content-box">{{ project.implementation_plan || '暂无内容' }}</div>
        </div>

        <div class="section" v-if="project.supplementary_info">
          <h3>其他补充说明</h3>
          <div class="content-box">{{ project.supplementary_info }}</div>
        </div>

        <!-- 成果转化形式 -->
        <div class="section" v-if="project.achievement_transform?.length">
          <h3>预期成果转化形式</h3>
          <div class="content-box">
            <div class="transform-tags">
              <span v-for="item in project.achievement_transform" :key="item" class="transform-tag">
                {{ getTransformText(item) }}
              </span>
              <span v-if="project.achievement_transform_other_text" class="transform-tag other">
                {{ project.achievement_transform_other_text }}
              </span>
            </div>
          </div>
        </div>

        <!-- 概念验证需求 -->
        <div class="section" v-if="project.poc_stage_requirement?.length">
          <h3>概念验证阶段需求</h3>
          <div class="content-box">
            <div class="poc-tags">
              <span v-for="item in project.poc_stage_requirement" :key="item" class="poc-tag">
                {{ getPocText(item) }}
              </span>
              <span v-if="project.poc_multi_stage_note" class="poc-note">
                说明：{{ project.poc_multi_stage_note }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 研究团队 -->
      <div v-if="activeTab === 'team'" class="tab-panel">
        <div class="section">
          <h3>项目组成员</h3>
          <div v-if="teamMembers.length === 0" class="empty-state">
            <p>暂无团队成员信息</p>
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
                  <th>邮箱</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(member, index) in teamMembers" :key="member.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ member.name || '未命名' }}</td>
                  <td>{{ member.organization || '未指定' }}</td>
                  <td>{{ member.title || '未指定' }}</td>
                  <td>
                    <span class="role-badge" :class="getMemberRoleClass(member.role)">
                      {{ getMemberRoleText(member.role) }}
                    </span>
                  </td>
                  <td>{{ member.email || '未提供' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 经费预算 -->
      <div v-if="activeTab === 'budget'" class="tab-panel">
        <div class="section">
          <h3>经费预算明细</h3>
          <div v-if="budgetItems.length === 0" class="empty-state">
            <p>暂无预算明细</p>
          </div>
          <div v-else class="budget-table">
            <table>
              <thead>
                <tr>
                  <th>预算科目</th>
                  <th>项目名称</th>
                  <th>详细说明</th>
                  <th>金额（元）</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in budgetItems" :key="item.id">
                  <td>{{ item.category }}</td>
                  <td>{{ item.item_name || '未命名' }}</td>
                  <td>{{ item.description || '无说明' }}</td>
                  <td class="text-right">¥ {{ formatAmount(item.amount || 0) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" class="text-right"><strong>预算合计</strong></td>
                  <td class="total-amount">
                    <strong>¥ {{ formatAmount(totalBudget) }}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div class="section" v-if="project.approved_budget">
          <h3>批准经费</h3>
          <div class="content-box">
            <p class="approved-budget-text">
              批准金额：¥ {{ formatAmount(project.approved_budget) }}
            </p>
          </div>
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
              <span>支持图片、文档等格式，单个文件不超过10MB</span>
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
              <div class="attachment-icon">{{ getFileIcon(attachment.mime_type) }}</div>
              <div class="attachment-info">
                <div class="attachment-name">{{ attachment.file_name }}</div>
                <div class="attachment-meta">
                  <span class="file-size">{{ formatFileSize(attachment.file_size) }}</span>
                  <span class="file-type">{{ attachment.mime_type?.split('/')[1] || '文件' }}</span>
                  <span class="upload-time">{{ formatDateTime(attachment.created_at) }}</span>
                </div>
                <div class="attachment-desc" v-if="attachment.description">
                  {{ attachment.description }}
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
          <button class="modal-btn danger" @click="confirmDelete" :disabled="deleting">
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

const router = useRouter()
const route = useRoute()

// API配置
const API_BASE_URL = 'http://localhost:3002/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data'
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear()
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

// 用户信息
interface User {
  id: string
  username: string
  name: string
  email: string
  role: string
  department?: string
  title?: string
}

// 项目数据接口（适配新数据库）
interface Project {
  id: string
  project_code: string
  title: string
  status: string
  tech_maturity: string
  achievement_transform: string[]
  achievement_transform_other_text: string
  poc_stage_requirement: string[]
  poc_multi_stage_note: string
  implementation_plan: string
  supplementary_info: string
  keywords: string
  abstract: string
  detailed_introduction_part1: string
  detailed_introduction_part2: string
  detailed_introduction_part3: string
  approved_budget: number
  submit_date: string
  approval_date: string
  created_at: string
  updated_at: string
  applicant_id: string
  applicant_name?: string
  manager_name?: string
  research_domains?: any[]
}

// 团队成员接口
interface TeamMember {
  id: string
  name: string
  user_id?: string
  role: string
  title?: string
  organization?: string
  email?: string
}

// 预算项接口
interface BudgetItem {
  id: string
  category: string
  item_name: string
  description: string
  amount: number
}

// 附件接口
interface Attachment {
  id: string
  file_name: string
  file_path: string
  file_size: number
  mime_type: string
  type: string
  description: string
  created_at: string
}

// 数据状态
const project = ref<Project | null>(null)
const currentUser = ref<User | null>(null)
const teamMembers = ref<TeamMember[]>([])
const budgetItems = ref<BudgetItem[]>([])
const attachments = ref<Attachment[]>([])

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

const totalBudget = computed(() => {
  return budgetItems.value.reduce((sum, item) => sum + (item.amount || 0), 0)
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

const getTechMaturityText = (maturity?: string) => {
  const map: Record<string, string> = {
    rd: '研发阶段',
    pilot: '小试阶段',
    intermediate_trial: '中试阶段',
    small_batch_prod: '小批量生产',
  }
  return map[maturity || ''] || maturity || '未指定'
}

const getTransformText = (value: string) => {
  const map: Record<string, string> = {
    tech_transfer: '技术转让',
    tech_license: '技术许可',
    equity_investment: '作价投资',
    joint_dev: '联合开发',
    other: '其他',
  }
  return map[value] || value
}

const getPocText = (value: string) => {
  const map: Record<string, string> = {
    creative_verify: '创意性验证',
    feasibility_verify: '可行性验证',
    commercial_verify: '商业化验证',
    multi_stage_combo: '多阶段组合',
  }
  return map[value] || value
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
    contact: '联系人',
    other: '其他成员',
  }
  return roleMap[role || ''] || role || '成员'
}

const getMemberRoleClass = (role?: string) => {
  const classMap: Record<string, string> = {
    principal: 'principal',
    contact: 'contact',
    other: 'other',
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

const getFileIcon = (mimeType?: string) => {
  if (!mimeType) return '📎'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word')) return '📝'
  if (mimeType.includes('zip')) return '🗜️'
  return '📎'
}

const formatAmount = (amount: number) => {
  if (!amount) return '0.00'
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
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
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

  const maxSize = 10 * 1024 * 1024
  const oversizedFiles = files.filter((f) => f.size > maxSize)
  if (oversizedFiles.length > 0) {
    ElMessage.error(`文件 ${oversizedFiles.map((f) => f.name).join(', ')} 超过10MB限制`)
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

      const response = await axios.post(`${API_BASE_URL}/projects/upload-attachment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            uploadProgress.value = Math.round((i * 100 + percentCompleted) / files.length)
          }
        },
      })

      if (response.data.success) {
        attachments.value.push(response.data.data)
        ElMessage.success(`文件 ${file.name} 上传成功`)
      } else {
        ElMessage.error(`文件 ${file.name} 上传失败: ${response.data.error}`)
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

const downloadAttachment = async (attachment: Attachment) => {
  try {
    ElMessage.info('正在下载...')

    // 直接使用后端下载接口
    const token = localStorage.getItem('token')
    const response = await fetch(
      `http://localhost:3002/api/projects/attachments/${attachment.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || '下载失败')
    }

    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = attachment.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    ElMessage.success('下载成功')
  } catch (error: any) {
    console.error('下载失败:', error)
    ElMessage.error(error.message || '下载失败')
  }
}

const deleteAttachment = async (attachment: Attachment) => {
  try {
    await ElMessageBox.confirm(`确定要删除附件 "${attachment.file_name}" 吗？`, '确认删除', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await api.delete(`/projects/attachments/${attachment.id}`)
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

const printCurrentPage = () => {
  showPrintDialog.value = false
  const printContent = document.querySelector('.tab-panel')?.cloneNode(true) as HTMLElement
  if (printContent) {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${project.value?.title || '项目详情'} - ${currentTabName.value}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; }
            .section { margin-bottom: 20px; }
            .section h3 { color: #B31B1B; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
            .content-box { background: #fafafa; padding: 15px; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>
          <h1>${project.value?.title}</h1>
          <p>项目编号：${project.value?.project_code || '暂未编号'}</p>
          <p>状态：${getStatusText(project.value?.status)}</p>
          <hr/>
          ${printContent.innerHTML}
        </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }
}

const printAllPages = () => {
  showPrintDialog.value = false

  // 获取所有标签页内容
  const basicPanel = document.querySelectorAll('.tab-panel')[0]
  const teamPanel = document.querySelectorAll('.tab-panel')[1]
  const budgetPanel = document.querySelectorAll('.tab-panel')[2]
  const progressPanel = document.querySelectorAll('.tab-panel')[3]
  const attachmentsPanel = document.querySelectorAll('.tab-panel')[4]

  // 获取项目信息卡片
  const projectInfoCard = document.querySelector('.project-info-card')

  // 获取标签页名称
  const tabNames = ['基本信息', '研究团队', '经费预算', '项目进展', '附件材料']

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${project.value?.title || '项目详情'} - 完整报告</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            padding: 30px;
            background: white;
            color: #2c3e50;
            font-size: 14px;
            line-height: 1.5;
          }
          .print-header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #B31B1B;
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
            color: #B31B1B;
          }
          .print-header .print-date {
            margin-top: 10px;
            font-size: 12px;
            color: #999;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section h2 {
            font-size: 18px;
            color: #B31B1B;
            border-bottom: 2px solid #e8e8e8;
            padding-bottom: 8px;
            margin-bottom: 20px;
          }
          .section h3 {
            font-size: 16px;
            margin: 16px 0 12px 0;
            color: #2c3e50;
          }
          .content-box {
            background: #fafafa;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
            padding: 15px;
            line-height: 1.6;
            white-space: pre-wrap;
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
          .domain-tag, .keyword-tag, .transform-tag, .poc-tag {
            display: inline-block;
            background: #fde8e8;
            color: #B31B1B;
            padding: 4px 12px;
            border-radius: 4px;
            margin-right: 8px;
            margin-bottom: 8px;
            font-size: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
          }
          th, td {
            border: 1px solid #e8e8e8;
            padding: 10px;
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
            color: #B31B1B;
            font-weight: bold;
          }
          .role-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
          }
          .role-badge.principal { background: #f6ffed; color: #52c41a; }
          .role-badge.contact { background: rgba(179,27,27,0.06); color: #b31b1b; }
          .role-badge.other { background: #f5f5f5; color: #666; }
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
            background: #B31B1B;
            border-radius: 10px;
          }
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
            margin-bottom: 20px;
          }
          .timeline-dot {
            position: absolute;
            left: -24px;
            top: 4px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: #B31B1B;
          }
          .timeline-date {
            font-weight: 500;
            margin-bottom: 4px;
          }
          .timeline-desc {
            font-size: 13px;
            color: #666;
          }
          .attachment-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px;
            border: 1px solid #f0f0f0;
            border-radius: 6px;
            margin-bottom: 8px;
          }
          .attachment-icon { font-size: 24px; }
          .attachment-info { flex: 1; }
          .attachment-name { font-weight: 500; }
          .attachment-meta { font-size: 11px; color: #999; margin-top: 4px; }
          .page-break {
            page-break-before: always;
          }
          @media print {
            body { padding: 0; }
            .page-break { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="print-header">
          <h1>${escapeHtml(project.value?.title || '项目详情')}</h1>
          <div class="project-code">项目编号：${escapeHtml(project.value?.project_code || '暂未编号')}</div>
          <div class="status">状态：${getStatusText(project.value?.status)}</div>
          <div class="print-date">打印时间：${new Date().toLocaleString('zh-CN')}</div>
        </div>

        <!-- 项目基本信息 -->
        ${projectInfoCard ? generatePrintProjectInfo(projectInfoCard) : ''}

        <!-- 基本信息 -->
        <div class="section">
          <h2>一、基本信息</h2>
          ${generatePrintBasicContent(basicPanel)}
        </div>

        <div class="page-break"></div>

        <!-- 研究团队 -->
        <div class="section">
          <h2>二、研究团队</h2>
          ${generatePrintTeamContent(teamPanel)}
        </div>

        <div class="page-break"></div>

        <!-- 经费预算 -->
        <div class="section">
          <h2>三、经费预算</h2>
          ${generatePrintBudgetContent(budgetPanel)}
        </div>

        <div class="page-break"></div>

        <!-- 项目进展 -->
        <div class="section">
          <h2>四、项目进展</h2>
          ${generatePrintProgressContent(progressPanel)}
        </div>

        <div class="page-break"></div>

        <!-- 附件材料 -->
        <div class="section">
          <h2>五、附件材料</h2>
          ${generatePrintAttachmentsContent(attachmentsPanel)}
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }
}

// 辅助函数：转义HTML
const escapeHtml = (text) => {
  if (!text) return ''
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// 生成项目信息HTML
const generatePrintProjectInfo = (element) => {
  if (!element) return ''
  const clone = element.cloneNode(true)
  // 移除按钮等不需要打印的元素
  const btns = clone.querySelectorAll('.action-btn, .add-btn, .section-actions, button')
  btns.forEach((btn) => btn.remove())
  return clone.outerHTML
}

// 生成基本信息HTML
const generatePrintBasicContent = (element) => {
  if (!element) return '<div class="content-box">暂无内容</div>'
  const clone = element.cloneNode(true)
  // 移除编辑按钮等
  const btns = clone.querySelectorAll('button, .add-btn')
  btns.forEach((btn) => btn.remove())
  return clone.innerHTML
}

// 生成研究团队HTML
const generatePrintTeamContent = (element) => {
  if (!element) return '<div class="content-box">暂无团队成员信息</div>'
  const clone = element.cloneNode(true)
  const btns = clone.querySelectorAll('button, .add-btn')
  btns.forEach((btn) => btn.remove())
  return clone.innerHTML
}

// 生成经费预算HTML
const generatePrintBudgetContent = (element) => {
  if (!element) return '<div class="content-box">暂无预算明细</div>'
  const clone = element.cloneNode(true)
  const btns = clone.querySelectorAll('button, .add-btn')
  btns.forEach((btn) => btn.remove())
  return clone.innerHTML
}

// 生成项目进展HTML
const generatePrintProgressContent = (element) => {
  if (!element) return '<div class="content-box">暂无进展信息</div>'
  const clone = element.cloneNode(true)
  const btns = clone.querySelectorAll('button, .add-btn')
  btns.forEach((btn) => btn.remove())
  return clone.innerHTML
}

// 生成附件材料HTML
const generatePrintAttachmentsContent = (element) => {
  if (!element) return '<div class="content-box">暂无附件材料</div>'
  const clone = element.cloneNode(true)
  // 移除上传区域和删除按钮
  const uploadArea = clone.querySelector('.upload-area')
  if (uploadArea) uploadArea.remove()
  const deleteBtns = clone.querySelectorAll('.delete-btn')
  deleteBtns.forEach((btn) => btn.remove())
  const downloadBtns = clone.querySelectorAll('.download-btn')
  downloadBtns.forEach((btn) => {
    // 保留下载按钮的文字，但移除按钮功能
    const span = document.createElement('span')
    span.textContent = '📎 '
    btn.parentNode?.replaceChild(span, btn)
  })
  return clone.innerHTML
}

// ==================== 导出PDF功能 ====================

const exportProject = async () => {
  ElMessage.info('导出功能开发中...')
}

// ==================== 数据加载方法 ====================

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
    const response = await api.get(`/projects/${projectId}`)
    console.log('项目详情响应:', response)

    if (response.success && response.data) {
      project.value = response.data
      teamMembers.value = response.data.team_members || []
      budgetItems.value = response.data.budget_items || []
      attachments.value = response.data.attachments || []

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

const toggleDebugInfo = () => {
  showDebugInfo.value = !showDebugInfo.value
}

// 初始化
onMounted(async () => {
  console.log('🚀 ProjectDetail 组件初始化')
  await loadCurrentUser()
  await loadProjectDetail()
})
</script>

<style scoped>
/* 项目详情样式 - 主题色改为人大红 #B31B1B */
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  flex-wrap: wrap;
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
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}
.status-badge.reviewing {
  background: #fde8e8;
  color: #b31b1b;
}
.status-badge.approved {
  background: #f6ffed;
  color: #52c41a;
}
.status-badge.ongoing {
  background: #fde8e8;
  color: #b31b1b;
}
.status-badge.completed {
  background: #f6ffed;
  color: #52c41a;
}
.status-badge.rejected {
  background: #fff2f0;
  color: #ff4d4f;
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
  background: #b31b1b;
  color: white;
}

.action-btn.primary:hover {
  background: #8b0000;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.info-header {
  margin-bottom: 20px;
}

.info-header h2 {
  margin: 0;
  font-size: 20px;
  color: #2c3e50;
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

/* 研究领域标签 */
.domain-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.domain-tag {
  background: #fde8e8;
  color: #b31b1b;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
}

/* 关键词 */
.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.keyword-tag {
  background: #fde8e8;
  color: #b31b1b;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
}

/* 转化形式标签 */
.transform-tags,
.poc-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.transform-tag,
.poc-tag {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.transform-tag.other,
.poc-note {
  background: #f5f5f5;
  color: #666;
}

/* 标签导航 */
.tab-navigation {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 8px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  background: #b31b1b;
  color: white;
}

/* 标签内容 */
.tab-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  border-bottom: 2px solid #b31b1b;
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
  color: #b31b1b;
  font-size: 16px;
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
.role-badge.contact {
  background: rgba(179,27,27,0.06);
  color: #b31b1b;
}
.role-badge.other {
  background: #f5f5f5;
  color: #666;
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
  border-color: #b31b1b;
  background: #fef6f6;
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

.attachment-desc {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.download-btn {
  padding: 8px 16px;
  background: #b31b1b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.download-btn:hover {
  background: #8b0000;
}

.delete-btn {
  padding: 6px 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  color: #ff4d4f;
  font-size: 12px;
  cursor: pointer;
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
  border-color: #b31b1b;
  background: #fef6f6;
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
  background: #b31b1b;
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
  background: #b31b1b;
}
.progress-fill-large.reviewing {
  background: #b31b1b;
}
.progress-fill-large.approved {
  background: #52c41a;
}
.progress-fill-large.ongoing {
  background: #b31b1b;
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
  background: #b31b1b;
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
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
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
  border-top: 3px solid #b31b1b;
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
  color: #b31b1b;
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
  border-color: #b31b1b;
  background: #fef6f6;
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

@media print {
  .back-btn,
  .header-actions,
  .tab-navigation,
  .action-bar,
  .db-status-bar,
  .upload-area,
  .attachment-actions,
  .modal-overlay {
    display: none !important;
  }
  .project-detail {
    padding: 0;
  }
  .tab-content {
    display: block !important;
  }
}
</style>
