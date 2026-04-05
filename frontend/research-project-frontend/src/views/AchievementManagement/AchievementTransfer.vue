<template>
  <div class="achievement-transfer">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button type="primary" link @click="goBack" icon="ArrowLeft"> 返回成果列表 </el-button>
        <h2>成果转化管理</h2>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleNewTransfer" icon="Plus"> 新增转化 </el-button>
        <el-button @click="refreshData" icon="Refresh" :loading="loading"> 刷新 </el-button>
      </div>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索成果名称、受让方或协议号"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterType" placeholder="转化类型" clearable @change="handleFilter">
            <el-option label="专利转让" value="patent_transfer" />
            <el-option label="技术许可" value="license" />
            <el-option label="产学研合作" value="cooperation" />
            <el-option label="自主实施" value="self_implementation" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-select v-model="filterStatus" placeholder="转化状态" clearable @change="handleFilter">
            <el-option label="洽谈中" value="negotiating" />
            <el-option label="已签约" value="contracted" />
            <el-option label="实施中" value="implementing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已终止" value="terminated" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleDateFilter"
          />
        </el-col>
        <el-col :span="4">
          <div class="button-group">
            <el-button @click="handleReset" plain>重置</el-button>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 转化列表 -->
    <div class="transfer-list">
      <el-table
        :data="paginatedTransfers"
        v-loading="loading"
        border
        style="width: 100%"
        empty-text="暂无数据"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="achievement_title" label="成果名称" min-width="200">
          <template #default="{ row }">
            <div class="achievement-info">
              <span class="type-badge" :class="row.achievement_type">
                {{ getAchievementTypeLabel(row.achievement_type) }}
              </span>
              <span class="title-text">{{ row.achievement_title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="transfer_type" label="转化类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTransferTypeType(row.transfer_type)" size="small">
              {{ getTransferTypeLabel(row.transfer_type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transferee" label="受让方/合作方" width="180" />
        <el-table-column prop="contract_no" label="合同编号" width="150" />
        <el-table-column prop="contract_amount" label="合同金额" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.contract_amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="actual_amount" label="实际金额" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.actual_amount) }}
          </template>
        </el-table-column>
        <el-table-column prop="transfer_status" label="转化状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.transfer_status)" size="small">
              {{ getStatusLabel(row.transfer_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="transfer_date" label="转化日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.transfer_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click.stop="handleView(row)" icon="View">
              查看
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="handleEdit(row)"
              icon="Edit"
              :disabled="!canEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click.stop="handleDelete(row)"
              icon="Delete"
              :disabled="!canDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalTransfers"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 新增/编辑转化对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="900px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
        label-position="top"
        class="transfer-form"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择成果" prop="achievement_id">
              <el-select
                v-model="formData.achievement_id"
                placeholder="请选择要转化的成果"
                filterable
                clearable
                style="width: 100%"
                @change="handleAchievementChange"
              >
                <el-option
                  v-for="achievement in achievementOptions"
                  :key="achievement.id"
                  :label="`${achievement.title} [${achievement.project_code || '无项目'}]`"
                  :value="achievement.id"
                >
                  <div class="achievement-option">
                    <span class="title">{{ achievement.title }}</span>
                    <span class="project-code">{{ achievement.project_code || '无项目' }}</span>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="转化类型" prop="transfer_type">
              <el-select
                v-model="formData.transfer_type"
                placeholder="请选择转化类型"
                style="width: 100%"
              >
                <el-option label="专利转让" value="patent_transfer" />
                <el-option label="技术许可" value="license" />
                <el-option label="产学研合作" value="cooperation" />
                <el-option label="自主实施" value="self_implementation" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="受让方/合作方" prop="transferee">
              <el-input v-model="formData.transferee" placeholder="请输入受让方或合作方全称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同编号" prop="contract_no">
              <el-input v-model="formData.contract_no" placeholder="请输入合同编号" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同金额" prop="contract_amount">
              <el-input-number
                v-model="formData.contract_amount"
                :min="0"
                :precision="2"
                :step="10000"
                placeholder="请输入合同金额"
                style="width: 100%"
              >
                <template #prefix>¥</template>
              </el-input-number>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="实际到账金额" prop="actual_amount">
              <el-input-number
                v-model="formData.actual_amount"
                :min="0"
                :precision="2"
                :step="10000"
                placeholder="请输入实际到账金额"
                style="width: 100%"
              >
                <template #prefix>¥</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="转化日期" prop="transfer_date">
              <el-date-picker
                v-model="formData.transfer_date"
                type="date"
                placeholder="选择转化日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="转化状态" prop="transfer_status">
              <el-select
                v-model="formData.transfer_status"
                placeholder="请选择转化状态"
                style="width: 100%"
              >
                <el-option label="洽谈中" value="negotiating" />
                <el-option label="已签约" value="contracted" />
                <el-option label="实施中" value="implementing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已终止" value="terminated" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="转化描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入转化描述"
          />
        </el-form-item>

        <el-form-item label="合同文件" prop="contract_file">
          <el-input v-model="formData.contract_file" placeholder="请输入合同文件路径或说明" />
        </el-form-item>

        <el-form-item label="收入记录">
          <div v-if="formData.income_records && formData.income_records.length > 0">
            <div
              v-for="(record, index) in formData.income_records"
              :key="index"
              class="income-record"
            >
              <el-input
                v-model="record.date"
                placeholder="日期"
                style="width: 30%; margin-right: 10px"
              />
              <el-input
                v-model="record.amount"
                placeholder="金额"
                style="width: 30%; margin-right: 10px"
              />
              <el-input v-model="record.description" placeholder="说明" style="width: 30%" />
            </div>
          </div>
          <el-button type="primary" @click="addIncomeRecord" size="small">添加收入记录</el-button>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ formData.id ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="转化详情" width="1000px">
      <div v-if="viewingTransfer" class="transfer-detail">
        <!-- 基本信息 -->
        <el-descriptions title="基本信息" :column="2" border>
          <el-descriptions-item label="成果名称">
            {{ viewingTransfer.achievement_title }}
            <el-tag size="small" :type="getAchievementTypeType(viewingTransfer.achievement_type)">
              {{ getAchievementTypeLabel(viewingTransfer.achievement_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="转化类型">
            <el-tag :type="getTransferTypeType(viewingTransfer.transfer_type)" size="small">
              {{ getTransferTypeLabel(viewingTransfer.transfer_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="受让方/合作方">
            {{ viewingTransfer.transferee }}
          </el-descriptions-item>
          <el-descriptions-item label="合同编号">
            {{ viewingTransfer.contract_no || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="合同金额">
            {{ formatCurrency(viewingTransfer.contract_amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="实际到账金额">
            {{ formatCurrency(viewingTransfer.actual_amount) }}
          </el-descriptions-item>
          <el-descriptions-item label="转化状态">
            <el-tag :type="getStatusType(viewingTransfer.transfer_status)" size="small">
              {{ getStatusLabel(viewingTransfer.transfer_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="转化日期">
            {{ formatDate(viewingTransfer.transfer_date) }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 内容描述 -->
        <div v-if="viewingTransfer.description" style="margin-top: 20px">
          <h4>转化描述</h4>
          <div class="detail-content">
            {{ viewingTransfer.description }}
          </div>
        </div>

        <!-- 收入记录 -->
        <div
          v-if="viewingTransfer.income_records && viewingTransfer.income_records.length > 0"
          style="margin-top: 20px"
        >
          <h4>收入记录</h4>
          <el-table :data="viewingTransfer.income_records" border>
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="{ row }">
                {{ formatCurrency(row.amount) }}
              </template>
            </el-table-column>
            <el-table-column prop="description" label="说明" />
          </el-table>
        </div>

        <!-- 时间线 -->
        <div style="margin-top: 20px">
          <h4>时间线</h4>
          <el-timeline>
            <el-timeline-item
              v-if="viewingTransfer.created_at"
              :timestamp="formatDateTime(viewingTransfer.created_at)"
            >
              创建记录
            </el-timeline-item>
            <el-timeline-item
              v-if="viewingTransfer.transfer_date"
              :timestamp="formatDate(viewingTransfer.transfer_date)"
            >
              转化日期
            </el-timeline-item>
            <el-timeline-item
              v-if="viewingTransfer.transfer_status === 'contracted'"
              timestamp="签约"
            >
              合同签约
            </el-timeline-item>
            <el-timeline-item
              v-if="viewingTransfer.transfer_status === 'implementing'"
              timestamp="实施"
            >
              开始实施
            </el-timeline-item>
            <el-timeline-item
              v-if="viewingTransfer.transfer_status === 'completed'"
              timestamp="完成"
            >
              转化完成
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button
            type="primary"
            @click="handleEdit(viewingTransfer)"
            v-if="viewingTransfer && canEdit(viewingTransfer)"
          >
            编辑
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Refresh, View, Edit, Delete, ArrowLeft } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const dateRange = ref<string[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalTransfers = ref(0)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const formRef = ref<FormInstance>()
const submitting = ref(false)

// 类型定义
interface AchievementOption {
  id: string
  title: string
  project_code: string
  type: string
  status: string
  description: string
  achievement_date: string
  authors: any
}

interface TransferRecord {
  id: string
  achievement_id: string
  achievement_title: string
  achievement_type: string
  transfer_type: string
  transferee: string
  transfer_date: string
  contract_no: string
  contract_amount: number
  actual_amount: number
  transfer_status: string
  description: string
  contract_file: string
  income_records: any[]
  created_by: string
  created_at: string
  updated_at: string
  created_by_name: string
  project_title: string
  project_code: string
}

interface FormData {
  id: string | null
  achievement_id: string
  achievement_title: string
  achievement_type: string
  transfer_type: string
  transferee: string
  transfer_date: string
  contract_no: string
  contract_amount: number
  actual_amount: number
  transfer_status: string
  description: string
  contract_file: string
  income_records: any[]
}

// 数据
const achievementOptions = ref<AchievementOption[]>([])
const transferList = ref<TransferRecord[]>([])
const formData = reactive<FormData>({
  id: null,
  achievement_id: '',
  achievement_title: '',
  achievement_type: '',
  transfer_type: 'patent_transfer',
  transferee: '',
  transfer_date: '',
  contract_no: '',
  contract_amount: 0,
  actual_amount: 0,
  transfer_status: 'negotiating',
  description: '',
  contract_file: '',
  income_records: [],
})
const viewingTransfer = ref<TransferRecord | null>(null)

// 表单验证规则
const formRules = {
  achievement_id: [{ required: true, message: '请选择要转化的成果', trigger: 'change' }],
  transfer_type: [{ required: true, message: '请选择转化类型', trigger: 'change' }],
  transferee: [{ required: true, message: '请输入受让方或合作方', trigger: 'blur' }],
  transfer_status: [{ required: true, message: '请选择转化状态', trigger: 'change' }],
}

// 计算属性
const dialogTitle = computed(() => {
  return formData.id ? '编辑转化记录' : '新增转化记录'
})

const paginatedTransfers = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return transferList.value.slice(startIndex, endIndex)
})

const canEdit = (row: TransferRecord) => {
  const allowedStatuses = ['negotiating', 'contracted']
  return allowedStatuses.includes(row.transfer_status)
}

const canDelete = (row: TransferRecord) => {
  const allowedStatuses = ['negotiating']
  return allowedStatuses.includes(row.transfer_status)
}

// 辅助函数
const getAchievementTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样品',
    standard: '技术标准',
    other: '其他成果',
  }
  return map[type] || type
}

const getAchievementTypeType = (type: string): string => {
  const map: Record<string, string> = {
    paper: 'primary',
    patent: 'success',
    software: 'warning',
    report: 'info',
    prototype: 'success',
    standard: 'info',
    other: '',
  }
  return map[type] || 'info'
}

const getTransferTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    patent_transfer: '专利转让',
    license: '技术许可',
    cooperation: '产学研合作',
    self_implementation: '自主实施',
    other: '其他',
  }
  return map[type] || type
}

const getTransferTypeType = (type: string): string => {
  const map: Record<string, string> = {
    patent_transfer: 'primary',
    license: 'success',
    cooperation: 'warning',
    self_implementation: 'info',
    other: '',
  }
  return map[type] || 'info'
}

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    negotiating: '洽谈中',
    contracted: '已签约',
    implementing: '实施中',
    completed: '已完成',
    terminated: '已终止',
  }
  return map[status] || status
}

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    negotiating: 'warning',
    contracted: 'info',
    implementing: 'primary',
    completed: 'success',
    terminated: 'danger',
  }
  return map[status] || 'info'
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch {
    return dateString
  }
}

const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
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

const formatCurrency = (amount: number): string => {
  if (!amount) return '¥ 0.00'
  return `¥ ${amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

// 数据处理方法
const handleSearch = () => {
  currentPage.value = 1
  loadTransfers()
}

const handleFilter = () => {
  currentPage.value = 1
  loadTransfers()
}

const handleDateFilter = () => {
  currentPage.value = 1
  loadTransfers()
}

const handleReset = () => {
  searchQuery.value = ''
  filterType.value = ''
  filterStatus.value = ''
  dateRange.value = []
  currentPage.value = 1
  loadTransfers()
}

const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  loadTransfers()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  loadTransfers()
}

const handleRowClick = (row: TransferRecord) => {
  handleView(row)
}

const refreshData = async () => {
  await loadAchievementOptions()
  await loadTransfers()
  ElMessage.success('数据已刷新')
}

// API相关函数 - 使用绝对路径避免导入问题
const baseURL = 'http://localhost:3002/api'

const apiRequest = async (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...options.headers,
  }

  try {
    const response = await fetch(`${baseURL}${url}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (data.success === false) {
      throw new Error(data.error || '请求失败')
    }

    return data
  } catch (error) {
    console.error('API请求失败:', error)
    throw error
  }
}

// 加载可转化的成果列表
const loadAchievementOptions = async () => {
  try {
    const response = await apiRequest('/achievements/transferable')
    if (response.data) {
      achievementOptions.value = response.data
    }
  } catch (error) {
    console.error('加载成果选项失败:', error)
    // 模拟数据作为备选
    achievementOptions.value = [
      {
        id: '1',
        title: '基于深度学习的图像识别算法',
        project_code: 'PROJ-2024-001',
        type: 'software',
        status: 'verified',
        description: '发表了高水平的学术论文',
        achievement_date: '2024-01-15',
        authors: ['张三', '李四', '王五'],
      },
    ]
  }
}

// 加载转化记录
const loadTransfers = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: pageSize.value.toString(),
      ...(filterType.value && { type: filterType.value }),
      ...(filterStatus.value && { status: filterStatus.value }),
      ...(searchQuery.value && { search: searchQuery.value }),
    })

    const response = await apiRequest(`/transfers?${params.toString()}`)

    if (response.data) {
      transferList.value = response.data
      totalTransfers.value = response.total || transferList.value.length
      console.log('✅ 转化记录加载成功:', transferList.value.length, '条记录')
    } else {
      ElMessage.warning('暂无转化记录数据')
      transferList.value = []
    }
  } catch (error) {
    console.error('获取转化记录失败:', error)
    ElMessage.error('获取转化记录失败')
    transferList.value = []
  } finally {
    loading.value = false
  }
}

// 新增转化记录
const handleNewTransfer = () => {
  resetForm()
  dialogVisible.value = true
}

const handleAchievementChange = (achievementId: string) => {
  if (achievementId) {
    const achievement = achievementOptions.value.find((item) => item.id === achievementId)
    if (achievement) {
      formData.achievement_title = achievement.title
      formData.achievement_type = achievement.type
    }
  } else {
    formData.achievement_title = ''
    formData.achievement_type = ''
  }
}

const addIncomeRecord = () => {
  formData.income_records.push({
    date: '',
    amount: 0,
    description: '',
  })
}

// 查看转化记录详情
const handleView = async (row: TransferRecord) => {
  try {
    const response = await apiRequest(`/transfers/${row.id}`)
    if (response.data) {
      viewingTransfer.value = response.data
      viewDialogVisible.value = true
    } else {
      ElMessage.error('获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 编辑转化记录
const handleEdit = async (row: TransferRecord) => {
  try {
    const response = await apiRequest(`/transfers/${row.id}`)
    if (response.data) {
      const data = response.data
      resetForm()

      // 填充表单数据
      formData.id = data.id
      formData.achievement_id = data.achievement_id
      formData.achievement_title = data.achievement_title
      formData.achievement_type = data.achievement_type
      formData.transfer_type = data.transfer_type
      formData.transferee = data.transferee
      formData.transfer_date = data.transfer_date
      formData.contract_no = data.contract_no
      formData.contract_amount = data.contract_amount || 0
      formData.actual_amount = data.actual_amount || 0
      formData.transfer_status = data.transfer_status
      formData.description = data.description || ''
      formData.contract_file = data.contract_file || ''
      formData.income_records = data.income_records || []

      dialogVisible.value = true
      viewDialogVisible.value = false
    } else {
      ElMessage.error('获取详情失败')
    }
  } catch (error) {
    console.error('获取详情失败:', error)
    ElMessage.error('获取详情失败')
  }
}

// 删除转化记录
const handleDelete = async (row: TransferRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除转化记录 "${row.contract_no || row.transferee}" 吗？此操作不可撤销。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    await apiRequest(`/transfers/${row.id}`, { method: 'DELETE' })

    ElMessage.success('转化记录已删除')
    // 重新加载数据
    await loadTransfers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  const valid = await formRef.value.validate()
  if (!valid) return

  submitting.value = true

  try {
    const submitData = {
      ...formData,
      income_records: formData.income_records.length > 0 ? formData.income_records : undefined,
    }

    let response
    if (formData.id) {
      // 更新现有记录
      response = await apiRequest(`/transfers/${formData.id}`, {
        method: 'PUT',
        body: JSON.stringify(submitData),
      })
    } else {
      // 新增记录
      response = await apiRequest('/transfers', {
        method: 'POST',
        body: JSON.stringify(submitData),
      })
    }

    if (response) {
      ElMessage.success(formData.id ? '转化记录更新成功' : '转化记录创建成功')
      dialogVisible.value = false
      resetForm()

      // 重新加载数据
      await loadTransfers()
      await loadAchievementOptions()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('提交失败，请检查网络连接')
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.keys(formData).forEach((key) => {
    if (key === 'transfer_type') {
      ;(formData as any)[key] = 'patent_transfer'
    } else if (key === 'transfer_status') {
      ;(formData as any)[key] = 'negotiating'
    } else if (key === 'income_records') {
      ;(formData as any)[key] = []
    } else {
      ;(formData as any)[key] = ''
    }
  })
  formData.id = null
  formData.contract_amount = 0
  formData.actual_amount = 0
}

const handleDialogClose = () => {
  resetForm()
}

const goBack = () => {
  router.push('/achievements')
}

// 初始化
onMounted(() => {
  loadAchievementOptions()
  loadTransfers()
})
</script>

<style scoped>
.achievement-transfer {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
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
}

.search-filter {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.button-group {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.transfer-list {
  margin-top: 20px;
}

.achievement-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
}

.type-badge.paper {
  background: #e8f4ff;
  color: #1890ff;
}

.type-badge.patent {
  background: #f0f9eb;
  color: #67c23a;
}

.type-badge.software {
  background: #fdf6ec;
  color: #e6a23c;
}

.type-badge.report {
  background: #e8f7ff;
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

.title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.transfer-form {
  max-height: 600px;
  overflow-y: auto;
  padding-right: 10px;
}

.achievement-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.achievement-option .title {
  font-weight: 500;
  color: #303133;
}

.achievement-option .project-code {
  font-size: 12px;
  color: #909399;
}

.detail-content {
  padding: 15px;
  background: #fafafa;
  border-radius: 4px;
  border-left: 4px solid #409eff;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.6;
}

.income-record {
  display: flex;
  margin-bottom: 10px;
  align-items: center;
}

:deep(.el-descriptions__body) {
  background: #fff;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  background-color: #fafafa;
}

:deep(.el-descriptions__content) {
  background-color: #fff;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .transfer-form :deep(.el-col) {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
  }
}

@media (max-width: 768px) {
  .achievement-transfer {
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

  .search-filter {
    padding: 15px;
  }

  .search-filter .el-col {
    margin-bottom: 15px;
  }

  .transfer-form {
    padding-right: 5px;
  }

  .income-record {
    flex-direction: column;
    align-items: flex-start;
  }

  .income-record .el-input {
    width: 100% !important;
    margin-bottom: 5px;
  }
}
</style>
