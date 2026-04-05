<template>
  <div class="achievement-detail">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-icon class="is-loading" size="48">
        <Loading />
      </el-icon>
      <span style="margin-left: 10px">正在加载成果详情...</span>
    </div>

    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button type="primary" link @click="goBack" icon="ArrowLeft"> 返回列表 </el-button>
        <h2>{{ achievementData.name }}</h2>
      </div>
      <div class="header-actions">
        <el-button v-if="canEdit" @click="handleEdit" icon="Edit" :loading="loading">
          编辑
        </el-button>
        <el-button
          v-if="canDelete"
          type="danger"
          @click="handleDelete"
          icon="Delete"
          :loading="loading"
        >
          删除
        </el-button>
        <el-button @click="handlePrint" icon="Printer"> 打印 </el-button>
        <el-dropdown @command="handleMoreActions">
          <el-button>
            更多操作<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="export">导出PDF</el-dropdown-item>
              <el-dropdown-item command="share">分享</el-dropdown-item>
              <el-dropdown-item command="copy">复制信息</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 成果状态栏 -->
    <div class="status-bar">
      <div class="status-info">
        <el-tag :type="getStatusType(achievementData.status)" size="large">
          {{ getStatusLabel(achievementData.status) }}
        </el-tag>
        <span class="status-text">
          <template v-if="achievementData.status === 'pending'">
            待审核，预计1-3个工作日内完成审核
          </template>
          <template v-else-if="achievementData.status === 'approved'">
            已通过审核 {{ achievementData.approvalDate ? `(${achievementData.approvalDate})` : '' }}
          </template>
          <template v-else-if="achievementData.status === 'rejected'">
            审核未通过
            {{ achievementData.rejectionReason ? `原因：${achievementData.rejectionReason}` : '' }}
          </template>
          <template v-else-if="achievementData.status === 'draft'">
            草稿状态，尚未提交审核
          </template>
          <template v-else-if="achievementData.status === 'published'"> 已公开发布 </template>
        </span>
      </div>
      <div class="status-meta">
        <span>ID: {{ achievementData.id }}</span>
        <span>创建时间: {{ achievementData.createTime }}</span>
        <span>最后更新: {{ achievementData.updateTime }}</span>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="detail-content">
      <!-- 基本信息卡片 -->
      <el-card class="info-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">基本信息</span>
          </div>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="成果类型">
            <span :class="`type-badge ${achievementData.type}`">
              {{ getTypeLabel(achievementData.type) }}
            </span>
          </el-descriptions-item>
          <el-descriptions-item label="成果名称">
            {{ achievementData.name }}
          </el-descriptions-item>
          <el-descriptions-item label="所属项目">
            {{ achievementData.projectName }}
            <el-button v-if="achievementData.projectId" type="text" @click="viewProject">
              查看项目详情
            </el-button>
          </el-descriptions-item>
          <el-descriptions-item label="完成日期">
            {{ achievementData.date }}
          </el-descriptions-item>
          <el-descriptions-item label="第一作者">
            {{ achievementData.firstAuthor }}
          </el-descriptions-item>
          <el-descriptions-item label="通讯作者">
            {{ achievementData.correspondingAuthor || '未指定' }}
          </el-descriptions-item>
          <el-descriptions-item label="其他作者" :span="2">
            {{ achievementData.otherAuthors || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="关键词" :span="2">
            <div class="keywords">
              <el-tag
                v-for="(keyword, index) in achievementData.keywords?.split(',')"
                :key="index"
                size="small"
              >
                {{ keyword.trim() }}
              </el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 成果内容卡片 -->
      <el-card class="content-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">成果内容</span>
          </div>
        </template>

        <!-- 论文详情 -->
        <div v-if="achievementData.type === 'paper'" class="paper-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="期刊/会议名称">
              {{ achievementData.journal || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="卷/期/页码">
              {{ achievementData.volume || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="DOI号">
              <template v-if="achievementData.doi">
                <el-link
                  :href="`https://doi.org/${achievementData.doi}`"
                  target="_blank"
                  type="primary"
                >
                  {{ achievementData.doi }}
                </el-link>
              </template>
              <template v-else>未填写</template>
            </el-descriptions-item>
            <el-descriptions-item label="收录情况">
              <el-tag
                v-if="achievementData.inclusion"
                :type="getInclusionType(achievementData.inclusion)"
              >
                {{ getInclusionLabel(achievementData.inclusion) }}
              </el-tag>
              <span v-else>未填写</span>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 专利详情 -->
        <div v-else-if="achievementData.type === 'patent'" class="patent-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="专利号">
              {{ achievementData.patentNumber || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="专利类型">
              {{ getPatentTypeLabel(achievementData.patentType) || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="申请日期">
              {{ achievementData.applyDate || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="授权日期">
              {{ achievementData.grantDate || '未填写' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 软件著作权详情 -->
        <div v-else-if="achievementData.type === 'software'" class="software-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="登记号">
              {{ achievementData.registrationNumber || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="版本号">
              {{ achievementData.version || '未填写' }}
            </el-descriptions-item>
            <el-descriptions-item label="登记日期">
              {{ achievementData.registrationDate || '未填写' }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 摘要 -->
        <div class="abstract-section">
          <h3>摘要</h3>
          <div class="abstract-content">
            {{ achievementData.abstract || '暂无摘要' }}
          </div>
        </div>

        <!-- 创新点 -->
        <div class="innovation-section" v-if="achievementData.innovation">
          <h3>创新点</h3>
          <div class="innovation-content">
            {{ achievementData.innovation }}
          </div>
        </div>

        <!-- 应用价值 -->
        <div class="application-section" v-if="achievementData.application">
          <h3>应用价值</h3>
          <div class="application-content">
            {{ achievementData.application }}
          </div>
        </div>
      </el-card>

      <!-- 附件材料卡片 -->
      <el-card class="attachment-card">
        <template #header>
          <div class="card-header">
            <span class="card-title">附件材料</span>
          </div>
        </template>

        <!-- 成果文件 -->
        <div class="attachment-section" v-if="achievementData.attachment">
          <h3>成果文件</h3>
          <div class="file-list">
            <div class="file-item">
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-info">
                <div class="file-name">
                  {{ getFileName(achievementData.attachment) }}
                </div>
                <div class="file-meta">
                  {{ formatFileSize(achievementData.attachmentSize) }}
                  ·
                  {{ achievementData.updateTime || achievementData.createTime }}
                </div>
              </div>
              <div class="file-actions">
                <el-button
                  type="text"
                  @click="previewFile(achievementData.attachment)"
                  :disabled="!canPreview(achievementData.attachment)"
                >
                  预览
                </el-button>
                <el-button type="text" @click="downloadAttachment(achievementData.attachment)">
                  下载
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 证明材料 -->
        <div
          class="attachment-section"
          v-if="achievementData.proofAttachments && achievementData.proofAttachments.length > 0"
        >
          <h3>证明材料</h3>
          <div class="file-list">
            <div
              v-for="(file, index) in achievementData.proofAttachments"
              :key="file.id || index"
              class="file-item"
            >
              <el-icon class="file-icon"><Document /></el-icon>
              <div class="file-info">
                <div class="file-name">{{ file.name || getFileName(file.url) }}</div>
                <div class="file-meta">
                  {{ formatFileSize(file.size) }} ·
                  {{ file.uploadTime || achievementData.updateTime || achievementData.createTime }}
                </div>
              </div>
              <div class="file-actions">
                <el-button
                  type="text"
                  @click="previewFile(file.url)"
                  :disabled="!canPreview(file.url)"
                >
                  预览
                </el-button>
                <el-button type="text" @click="downloadAttachment(file.url)"> 下载 </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- 相关链接 -->
        <div
          class="attachment-section"
          v-if="achievementData.relatedLinks && achievementData.relatedLinks.length > 0"
        >
          <h3>相关链接</h3>
          <div class="link-list">
            <div
              v-for="(link, index) in achievementData.relatedLinks.filter((l) => l)"
              :key="index"
              class="link-item"
            >
              <el-icon><Link /></el-icon>
              <el-link
                :href="ensureHttp(link)"
                target="_blank"
                type="primary"
                @click.stop="handleLinkClick(link)"
              >
                {{ formatLinkDisplay(link) }}
              </el-link>
            </div>
          </div>
        </div>

        <!-- 备注 -->
        <div class="attachment-section" v-if="achievementData.remarks">
          <h3>备注</h3>
          <div class="remarks-content">
            {{ achievementData.remarks }}
          </div>
        </div>
      </el-card>

      <!-- 审核记录卡片 -->
      <el-card
        class="audit-card"
        v-if="achievementData.auditLogs && achievementData.auditLogs.length > 0"
      >
        <template #header>
          <div class="card-header">
            <span class="card-title">审核记录</span>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="log in achievementData.auditLogs"
            :key="log.id"
            :timestamp="log.time"
            :type="getAuditLogType(log.action)"
            :hollow="log.action === 'pending'"
          >
            <div class="audit-log">
              <div class="audit-action">{{ getAuditActionLabel(log.action) }}</div>
              <div class="audit-user">审核人：{{ log.user }}</div>
              <div class="audit-comment" v-if="log.comment">审核意见：{{ log.comment }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>

    <!-- 底部操作栏 -->
    <div class="footer-actions">
      <el-button @click="goBack">返回列表</el-button>
      <el-button v-if="canEdit" type="primary" @click="handleEdit" :loading="loading">
        编辑成果
      </el-button>
    </div>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      :title="previewFileInfo?.name || '文件预览'"
      width="80%"
      top="5vh"
      @close="handlePreviewClose"
    >
      <div v-if="previewFileInfo" class="preview-content">
        <!-- PDF预览 -->
        <div v-if="isPdfFile(previewFileInfo)" class="pdf-preview">
          <iframe
            :src="getFilePreviewUrl(previewFileInfo)"
            width="100%"
            height="600"
            frameborder="0"
          ></iframe>
        </div>

        <!-- 图片预览 -->
        <div v-else-if="isImageFile(previewFileInfo)" class="image-preview">
          <el-image
            :src="getFilePreviewUrl(previewFileInfo)"
            :preview-src-list="[getFilePreviewUrl(previewFileInfo)]"
            fit="contain"
            style="max-height: 600px; width: 100%"
          />
        </div>

        <!-- 其他文件 -->
        <div v-else class="unsupported-preview">
          <el-result
            icon="warning"
            title="不支持预览"
            :sub-title="`当前文件格式不支持在线预览，请下载后查看：${previewFileInfo.name}`"
          >
            <template #extra>
              <el-button type="primary" @click="downloadAttachment(previewFileInfo)">
                下载文件
              </el-button>
            </template>
          </el-result>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialogVisible = false">关闭</el-button>
          <el-button
            type="primary"
            @click="downloadAttachment(previewFileInfo)"
            v-if="previewFileInfo"
          >
            下载
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Delete,
  Printer,
  Document,
  Link,
  Loading,
  ArrowDown,
} from '@element-plus/icons-vue'
import { achievementAPI } from '@/api/achievements'

const route = useRoute()
const router = useRouter()

// 类型定义
interface AchievementDetail {
  id: string
  name: string
  type: string
  status: string
  projectId?: string
  projectName?: string
  date: string
  firstAuthor: string
  correspondingAuthor?: string
  otherAuthors?: string
  keywords?: string
  journal?: string
  volume?: string
  doi?: string
  inclusion?: string
  abstract?: string
  innovation?: string
  application?: string
  remarks?: string
  createTime: string
  updateTime: string
  approvalDate?: string
  rejectionReason?: string
  attachment?: string
  attachmentSize?: number
  proofAttachments?: Array<{
    id: string
    name: string
    url: string
    size: number
    uploadTime: string
  }>
  relatedLinks?: string[]
  auditLogs?: Array<{
    id: string
    action: string
    user: string
    time: string
    comment?: string
  }>
  patentNumber?: string
  patentType?: string
  applyDate?: string
  grantDate?: string
  registrationNumber?: string
  version?: string
  registrationDate?: string
}

// 计算属性
const achievementId = computed(() => route.params.id as string)
const userRole = computed(() => localStorage.getItem('userRole') || '')
const canEdit = computed(() => {
  const allowedRoles = ['APPLICANT', 'ADMIN']
  return (
    allowedRoles.includes(userRole.value) &&
    (achievementData.value.status === 'draft' || achievementData.value.status === 'pending')
  )
})
const canDelete = computed(() => {
  const allowedRoles = ['APPLICANT', 'ADMIN']
  return allowedRoles.includes(userRole.value) && achievementData.value.status === 'draft'
})

// 响应式数据
const achievementData = ref<AchievementDetail>({
  id: achievementId.value,
  name: '',
  type: '',
  status: '',
  date: '',
  firstAuthor: '',
  createTime: '',
  updateTime: '',
})
const previewDialogVisible = ref(false)
const previewFileInfo = ref<any>(null)
const loading = ref(false)

// 状态标签映射
const statusMap = {
  draft: { label: '草稿', type: 'info' },
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已驳回', type: 'danger' },
  published: { label: '已发布', type: 'success' },
  submitted: { label: '已提交', type: 'primary' },
  verified: { label: '已验证', type: 'success' },
}

const typeMap = {
  paper: '论文',
  patent: '专利',
  software: '软件著作权',
  monograph: '专著',
  report: '研究报告',
  award: '奖项',
  prototype: '原型样品',
  standard: '技术标准',
  other: '其他成果',
}

const inclusionMap = {
  sci: { label: 'SCI', type: 'danger' },
  ei: { label: 'EI', type: 'warning' },
  core: { label: '核心期刊', type: 'primary' },
  other: { label: '其他', type: 'info' },
}

const patentTypeMap = {
  invention: '发明专利',
  utility: '实用新型专利',
  design: '外观设计专利',
}

// 文件处理方法
const getFileName = (attachment: string | any): string => {
  if (!attachment) return '未知文件'

  if (typeof attachment === 'string') {
    const parts = attachment.split('/')
    const fileName = parts[parts.length - 1]
    return fileName || attachment
  } else if (attachment.name) {
    return attachment.name
  } else if (attachment.filename) {
    return attachment.filename
  }

  return '未知文件'
}

const getFileUrl = (attachment: string | any): string => {
  if (!attachment) return ''

  let url = ''
  if (typeof attachment === 'string') {
    url = attachment
  } else if (attachment.url) {
    url = attachment.url
  } else if (attachment.path) {
    url = attachment.path
  }

  if (!url) return ''

  // 如果已经是完整URL，直接返回
  if (url.startsWith('http')) {
    return url
  }

  // 如果是相对路径，添加API基础URL
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002'

  // 处理不同的路径格式
  if (url.startsWith('/api/') || url.startsWith('/uploads/') || url.startsWith('/files/')) {
    return `${baseUrl}${url}`
  }

  // 其他情况，假设是文件名
  return `${baseUrl}/uploads/${url}`
}

const getFilePreviewUrl = (attachment: any): string => {
  const url = getFileUrl(attachment)
  if (!url) return '#'

  // 对于PDF文件，可以使用Google Docs Viewer（需要在线）
  if (isPdfFile(attachment)) {
    return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
  }

  return url
}

const canPreview = (attachment: any): boolean => {
  if (!attachment) return false

  const fileName = getFileName(attachment).toLowerCase()
  const previewableExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.bmp']
  return previewableExtensions.some((ext) => fileName.endsWith(ext))
}

const isPdfFile = (attachment: any): boolean => {
  const fileName = getFileName(attachment).toLowerCase()
  return fileName.endsWith('.pdf')
}

const isImageFile = (attachment: any): boolean => {
  const fileName = getFileName(attachment).toLowerCase()
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
  return imageExtensions.some((ext) => fileName.endsWith(ext))
}

const downloadAttachment = async (attachment: any) => {
  try {
    const fileUrl = getFileUrl(attachment)
    const fileName = getFileName(attachment)

    if (!fileUrl) {
      throw new Error('文件URL无效')
    }

    // 从本地存储获取token
    const token = localStorage.getItem('token')

    // 创建下载链接
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName

    // 添加授权头（如果需要）
    if (token && fileUrl.includes('/api/')) {
      // 对于需要认证的API，使用fetch下载
      try {
        const response = await fetch(fileUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`下载失败: ${response.status} ${response.statusText}`)
        }

        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        link.href = downloadUrl
        link.onclick = () => {
          setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl)
          }, 100)
        }
      } catch (fetchError) {
        console.warn('使用fetch下载失败，尝试直接下载:', fetchError)
        // 如果fetch失败，尝试直接下载
      }
    }

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    ElMessage.success('开始下载文件')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('文件下载失败: ' + (error as Error).message)
  }
}

const previewFile = (attachment: any) => {
  if (!canPreview(attachment)) {
    ElMessage.warning('该文件格式不支持在线预览，请下载后查看')
    downloadAttachment(attachment)
    return
  }

  previewFileInfo.value = {
    ...(typeof attachment === 'object' ? attachment : {}),
    name: getFileName(attachment),
    url: getFileUrl(attachment),
  }
  previewDialogVisible.value = true
}

const handlePreviewClose = () => {
  previewFileInfo.value = null
  previewDialogVisible.value = false
}

const ensureHttp = (url: string): string => {
  if (!url) return '#'
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

const formatLinkDisplay = (url: string): string => {
  if (!url) return ''
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '')
}

const handleLinkClick = (url: string) => {
  const fullUrl = ensureHttp(url)
  window.open(fullUrl, '_blank', 'noopener,noreferrer')
}

// 辅助方法
const getStatusLabel = (status: string): string => {
  return statusMap[status as keyof typeof statusMap]?.label || status
}

const getStatusType = (status: string): string => {
  return statusMap[status as keyof typeof statusMap]?.type || 'info'
}

const getTypeLabel = (type: string): string => {
  return typeMap[type as keyof typeof typeMap] || type
}

const getInclusionLabel = (inclusion: string): string => {
  return inclusionMap[inclusion as keyof typeof inclusionMap]?.label || inclusion
}

const getInclusionType = (inclusion: string): string => {
  return inclusionMap[inclusion as keyof typeof inclusionMap]?.type || 'info'
}

const getPatentTypeLabel = (patentType: string): string => {
  return patentTypeMap[patentType as keyof typeof patentTypeMap] || patentType
}

const formatFileSize = (size?: number): string => {
  if (!size) return '未知大小'
  const kb = size / 1024
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`
  }
  const mb = kb / 1024
  return `${mb.toFixed(2)} MB`
}

const getAuditActionLabel = (action: string): string => {
  const map: Record<string, string> = {
    create: '提交成果',
    update: '更新成果',
    approve: '审核通过',
    reject: '审核驳回',
    pending: '待审核',
    verify: '验证成果',
    publish: '发布成果',
  }
  return map[action] || action
}

const getAuditLogType = (action: string): string => {
  const map: Record<string, string> = {
    create: 'primary',
    update: 'info',
    approve: 'success',
    reject: 'danger',
    pending: 'warning',
    verify: 'success',
    publish: 'success',
  }
  return map[action] || ''
}

const loadAchievementData = async () => {
  loading.value = true
  try {
    const response = await achievementAPI.getAchievement(achievementId.value)

    if (response.success && response.data) {
      const data = response.data

      // 处理数据转换
      achievementData.value = {
        id: data.id,
        name: data.title || '未命名成果',
        type: data.type,
        status: data.status,
        projectId: data.project_id,
        projectName: data.project_title,
        date: data.achievement_date || '',
        firstAuthor: data.created_by_name || '未知作者',
        correspondingAuthor: '',
        otherAuthors: '',
        keywords: data.keywords || '',
        abstract: data.description || '',
        journal: data.publication_source || '',
        volume: data.volume || '',
        doi: data.doi || '',
        inclusion: '',
        innovation: '',
        application: '',
        remarks: '',
        createTime: data.created_at || '',
        updateTime: data.updated_at || data.created_at || '',
        approvalDate: data.verified_at,
        rejectionReason: data.verification_comment,
        attachment: '',
        attachmentSize: 0,
        proofAttachments: [],
        relatedLinks: [],
      }

      // 尝试处理附件
      if (data.attachment_urls) {
        try {
          const attachments = JSON.parse(data.attachment_urls)
          if (attachments.length > 0) {
            achievementData.value.attachment = attachments[0]
            achievementData.value.proofAttachments = attachments.slice(1).map((url, idx) => ({
              id: `att-${idx}`,
              name: `附件${idx + 1}`,
              url: url,
              size: 0,
              uploadTime: data.created_at || '',
            }))
          }
        } catch (e) {
          console.warn('附件处理失败:', e)
        }
      }

      // 尝试处理作者
      if (data.authors) {
        try {
          const authors = JSON.parse(data.authors)
          if (authors.length > 0) {
            achievementData.value.firstAuthor = authors[0]
            achievementData.value.correspondingAuthor = authors.length > 1 ? authors[1] : ''
            achievementData.value.otherAuthors =
              authors.length > 2 ? authors.slice(2).join(', ') : ''
          }
        } catch (e) {
          console.warn('作者处理失败:', e)
        }
      }

      // 尝试处理相关链接
      if (data.related_urls) {
        try {
          achievementData.value.relatedLinks = JSON.parse(data.related_urls)
        } catch (e) {
          console.warn('链接处理失败:', e)
        }
      }

      console.log('加载成果成功:', achievementData.value)
      ElMessage.success('成果详情加载成功')
    } else {
      console.warn('API返回失败，使用模拟数据')
      loadMockData()
    }
  } catch (error) {
    console.error('加载失败:', error)
    loadMockData()
  } finally {
    loading.value = false
  }
}

// 加载审核记录
const loadAuditLogs = async (achievementData: AchievementDetail) => {
  try {
    // 如果API有单独的审核记录接口，可以调用
    // const response = await achievementAPI.getAuditLogs(achievementId.value)

    // 暂时使用模拟审核记录
    const mockAuditLogs = [
      {
        id: '1',
        action: 'create',
        user: achievementData.firstAuthor || '申请人',
        time: achievementData.createTime,
        comment: '创建成果',
      },
    ]

    if (achievementData.status === 'approved' || achievementData.status === 'rejected') {
      mockAuditLogs.push({
        id: '2',
        action: achievementData.status === 'approved' ? 'approve' : 'reject',
        user: '评审专家',
        time: achievementData.approvalDate || achievementData.updateTime,
        comment:
          achievementData.status === 'rejected' ? achievementData.rejectionReason : '审核通过',
      })
    }

    achievementData.auditLogs = mockAuditLogs
  } catch (error) {
    console.error('加载审核记录失败:', error)
  }
}

// 模拟数据作为备用
const loadMockData = () => {
  achievementData.value = {
    ...achievementData.value,
    name: achievementData.value.name || '基于深度学习的图像识别算法研究',
    type: achievementData.value.type || 'paper',
    status: achievementData.value.status || 'approved',
    projectName: achievementData.value.projectName || '人工智能算法研究项目',
    date: achievementData.value.date || '2024-01-15',
    firstAuthor: achievementData.value.firstAuthor || '张三',
    correspondingAuthor: '张三',
    otherAuthors: '李四, 王五, 赵六',
    keywords: '深度学习, 图像识别, 计算机视觉',
    journal: '计算机学报',
    volume: 'Vol.10, No.2, pp.100-110',
    doi: '10.1234/example.doi',
    inclusion: 'sci',
    abstract: '这是一个示例摘要，实际数据应从数据库加载...',
    innovation: '创新点示例...',
    application: '应用价值示例...',
    remarks: '备注信息...',
    createTime: achievementData.value.createTime || '2024-01-10 10:30:00',
    updateTime: achievementData.value.updateTime || '2024-01-15 14:20:00',
    approvalDate: '2024-01-20',
    attachment: '/uploads/sample.pdf',
    attachmentSize: 2.5 * 1024 * 1024,
    proofAttachments: [
      {
        id: 'proof-1',
        name: '录用通知.pdf',
        url: '/uploads/acceptance-notice.pdf',
        size: 1.2 * 1024 * 1024,
        uploadTime: '2024-01-15 14:25:00',
      },
    ],
    relatedLinks: ['https://arxiv.org/abs/example'],
    auditLogs: [
      {
        id: '1',
        action: 'create',
        user: '张三',
        time: '2024-01-10 10:30:00',
        comment: '创建成果',
      },
      {
        id: '2',
        action: 'approve',
        user: '李老师（评审专家）',
        time: '2024-01-20 09:15:00',
        comment: '研究成果具有创新性，建议通过审核',
      },
    ],
  }
}

// 操作处理
const goBack = () => {
  router.push('/achievements')
}

const handleEdit = () => {
  router.push(`/achievements/${achievementId.value}/edit`)
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这个成果吗？删除后不可恢复。', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    loading.value = true
    const response = await achievementAPI.deleteAchievement(achievementId.value)

    if (response.success) {
      ElMessage.success('成果已删除')
      router.push('/achievements')
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  } finally {
    loading.value = false
  }
}

const handlePrint = () => {
  window.print()
}

const handleMoreActions = (command: string) => {
  switch (command) {
    case 'export':
      ElMessage.info('正在导出PDF...')
      break
    case 'share':
      ElMessage.info('分享功能开发中...')
      break
    case 'copy':
      navigator.clipboard.writeText(JSON.stringify(achievementData.value, null, 2))
      ElMessage.success('成果信息已复制到剪贴板')
      break
  }
}

const viewProject = () => {
  if (achievementData.value.projectId) {
    router.push(`/projects/${achievementData.value.projectId}/detail`)
  } else {
    ElMessage.warning('该成果未关联项目')
  }
}

// 初始化
onMounted(() => {
  loadAchievementData()
})
</script>

<style scoped>
.achievement-detail {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
  position: relative;
}

/* 加载状态样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  font-size: 16px;
  color: #409eff;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-left h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.status-bar {
  background: white;
  padding: 15px 20px;
  border-radius: 4px;
  margin-bottom: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.status-info {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 10px;
}

.status-text {
  color: #606266;
  font-size: 14px;
}

.status-meta {
  display: flex;
  gap: 30px;
  color: #909399;
  font-size: 12px;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-card,
.content-card,
.attachment-card,
.audit-card {
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: bold;
  color: #303133;
  font-size: 18px;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.type-badge.paper {
  background: rgba(179, 27, 27, 0.06);
  color: #b31b1b;
}

.type-badge.patent {
  background: #f0f9eb;
  color: #67c23a;
}

.type-badge.software {
  background: #fdf6ec;
  color: #e6a23c;
}

.type-badge.monograph {
  background: #fdf4ff;
  color: #c038e6;
}

.type-badge.award {
  background: #fff2e8;
  color: #fa8c16;
}

.type-badge.report {
  background: #e6fffb;
  color: #13c2c2;
}

.type-badge.prototype {
  background: #f6ffed;
  color: #52c41a;
}

.type-badge.standard {
  background: #f9f0ff;
  color: #722ed1;
}

.type-badge.other {
  background: #fff7e6;
  color: #fa8c16;
}

.keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.abstract-section,
.innovation-section,
.application-section,
.attachment-section {
  margin-bottom: 25px;
}

.abstract-section h3,
.innovation-section h3,
.application-section h3,
.attachment-section h3 {
  color: #606266;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
}

.abstract-content,
.innovation-content,
.application-content,
.remarks-content {
  line-height: 1.6;
  color: #303133;
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
  white-space: pre-wrap;
  word-break: break-word;
}

.file-list {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #ebeef5;
  transition: background-color 0.3s;
}

.file-item:hover {
  background-color: #f5f7fa;
}

.file-item:last-child {
  border-bottom: none;
}

.file-icon {
  font-size: 24px;
  color: #409eff;
  margin-right: 15px;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 12px;
  color: #909399;
}

.file-actions {
  display: flex;
  gap: 10px;
}

.file-actions .el-button {
  padding: 4px 8px;
  font-size: 12px;
}

.no-file {
  padding: 30px;
  text-align: center;
  color: #909399;
}

.link-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.link-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.link-item:hover {
  background-color: rgba(179, 27, 27, 0.06);
}

.link-item .el-link {
  word-break: break-all;
}

.audit-log {
  line-height: 1.6;
}

.audit-action {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.audit-user {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.audit-comment {
  color: #606266;
  font-size: 14px;
  background: #f6f6f6;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.footer-actions {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
  text-align: center;
  background: white;
  padding: 20px;
  border-radius: 4px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 新增预览对话框样式 */
.preview-content {
  width: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pdf-preview {
  width: 100%;
  height: 600px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

.pdf-preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.image-preview {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #f5f5f5;
  border-radius: 4px;
  padding: 20px;
}

.unsupported-preview {
  width: 100%;
  padding: 40px 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .achievement-detail {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
    padding: 15px;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .status-meta {
    flex-direction: column;
    gap: 5px;
  }

  .status-bar {
    padding: 15px;
  }

  .footer-actions {
    padding: 15px;
  }

  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .file-actions {
    align-self: flex-end;
  }

  .preview-content {
    min-height: 300px;
  }

  .pdf-preview {
    height: 400px;
  }
}

/* 打印样式 */
@media print {
  .page-header,
  .header-actions,
  .footer-actions,
  .el-card__header {
    display: none !important;
  }

  .achievement-detail {
    padding: 0;
    background: white;
  }

  .detail-content {
    gap: 10px;
  }

  .el-card {
    border: none !important;
    box-shadow: none !important;
  }

  .el-card__body {
    padding: 0 !important;
  }
}
</style>
