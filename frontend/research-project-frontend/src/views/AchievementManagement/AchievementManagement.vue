<template>
  <div class="achievement-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>成果管理</h2>
      <el-button type="primary" @click="handleAddAchievement" icon="Plus"> 新增成果 </el-button>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-filter">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-input
            v-model="searchQuery"
            placeholder="搜索成果名称或关键词"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterType" placeholder="成果类型" clearable @change="handleFilter">
            <el-option label="论文" value="paper" />
            <el-option label="专利" value="patent" />
            <el-option label="软件著作权" value="software" />
            <el-option label="专著" value="monograph" />
            <el-option label="奖项" value="award" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filterStatus" placeholder="状态筛选" clearable @change="handleFilter">
            <el-option label="待审核" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <div class="button-group">
            <el-button @click="handleReset" plain>重置</el-button>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 成果列表 -->
    <div class="achievement-list">
      <el-table
        :data="paginatedAchievements"
        v-loading="loading"
        border
        style="width: 100%"
        empty-text="暂无数据"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="成果名称" min-width="200">
          <template #default="{ row }">
            <div class="achievement-name">
              <span class="type-badge" :class="row.type">
                {{ getTypeLabel(row.type) }}
              </span>
              {{ row.title }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="project_title" label="所属项目" width="180">
          <template #default="{ row }">
            {{ row.project?.title || '无项目信息' }}
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者/负责人" width="120">
          <template #default="{ row }">
            {{ row.created_by_name || row.created_by || '未知' }}
          </template>
        </el-table-column>
        <el-table-column prop="achievement_date" label="完成日期" width="120">
          <template #default="{ row }">
            {{ formatDate(row.achievement_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <!-- 修改：跳转到独立的详情页面 -->
            <el-button type="primary" link size="small" @click="handleViewDetail(row)" icon="View">
              查看
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
              icon="Edit"
              :disabled="row.status !== 'draft' && row.status !== 'pending'"
            >
              编辑
            </el-button>
            <el-button
              type="success"
              link
              size="small"
              @click="handleTransfer(row)"
              icon="Share"
              :disabled="row.status !== 'verified' && row.status !== 'published'"
            >
              转化
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row)"
              icon="Delete"
              :disabled="row.status !== 'draft'"
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
          :total="totalAchievements"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getApiBaseUrl, getApiOrigin } from '@/utils/request'
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, View, Edit, Delete, Document, Share } from '@element-plus/icons-vue'
import { achievementAPI } from '@/api/achievements'
import type { FormInstance } from 'element-plus'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const filterType = ref('')
const filterStatus = ref('')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const totalAchievements = ref(0)

// 类型定义
interface Project {
  id: string
  title: string
  project_code: string
}

interface Achievement {
  id: string
  title: string
  type: string
  project?: {
    title: string
    project_code?: string
  }
  created_by_name?: string
  created_by?: string
  achievement_date: string
  status: string
  description?: string
  authors?: string
  keywords?: string
  attachment_urls?: string
  external_link?: string
  created_at?: string
  verified_by?: string
  verified_by_name?: string
  verified_date?: string
  verification_comment?: string
}

interface FormData {
  id: string | null
  type: string
  title: string
  project_id: string
  achievement_date: string
  keywords: string
  description: string
  authors: string
  status: string
  attachment_urls: string
  external_link: string
}

// 项目列表数据
const projectList = ref<Project[]>([])

// 表单数据
const formData = reactive<FormData>({
  id: null,
  type: '',
  title: '',
  project_id: '',
  achievement_date: '',
  keywords: '',
  description: '',
  authors: '',
  status: 'draft',
  attachment_urls: '[]',
  external_link: '',
})

// 表单验证规则
const formRules = {
  type: [{ required: true, message: '请选择成果类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入成果名称', trigger: 'blur' }],
  achievement_date: [{ required: true, message: '请选择完成日期', trigger: 'change' }],
}

// 成果列表数据
const achievementList = ref<Achievement[]>([])

// 计算属性
const dialogTitle = computed(() => {
  return formData.id ? '编辑成果' : '新增成果'
})

// 计算分页后的成果列表 - 添加本地搜索过滤
const filteredAchievements = computed(() => {
  let filtered = achievementList.value

  // 本地搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    filtered = filtered.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.keywords?.toLowerCase().includes(query),
    )
  }

  // 本地类型过滤
  if (filterType.value) {
    filtered = filtered.filter((item) => item.type === filterType.value)
  }

  // 本地状态过滤
  if (filterStatus.value) {
    filtered = filtered.filter((item) => item.status === filterStatus.value)
  }

  return filtered
})

// 计算分页后的成果列表
const paginatedAchievements = computed(() => {
  const startIndex = (currentPage.value - 1) * pageSize.value
  const endIndex = startIndex + pageSize.value
  return filteredAchievements.value.slice(startIndex, endIndex)
})

// 总条目数使用过滤后的数据
const displayTotal = computed(() => {
  return filteredAchievements.value.length
})

// 上传配置
const uploadAction = `${getApiBaseUrl()}/files/upload`
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return {
    Authorization: `Bearer ${token}`,
  }
})

// 监听筛选条件变化 - 修改为只重置页码，不立即调用API
watch([searchQuery, filterType, filterStatus], () => {
  currentPage.value = 1
  // 不再这里调用 fetchAchievementList，使用本地过滤
})

// 方法
const getTypeLabel = (type: string): string => {
  const map: Record<string, string> = {
    paper: '论文',
    patent: '专利',
    software: '软件著作权',
    report: '研究报告',
    prototype: '原型样品',
    standard: '技术标准',
    other: '其他成果',
    monograph: '专著',
    award: '奖项',
  }
  return map[type] || type
}

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    pending: '待审核',
    verified: '已审核',
    published: '已发布',
    approved: '已通过',
    rejected: '已驳回',
  }
  return map[status] || status
}

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    draft: 'info',
    submitted: 'warning',
    pending: 'warning',
    verified: 'success',
    published: 'success',
    approved: 'success',
    rejected: 'danger',
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

// 搜索处理 - 改为本地过滤，显示提示
const handleSearch = () => {
  if (searchQuery.value.trim() || filterType.value || filterStatus.value) {
    const count = filteredAchievements.value.length
    ElMessage.success(`找到 ${count} 条记录`)
  } else {
    ElMessage.info('请输入搜索条件')
  }
}

// 筛选处理 - 改为本地过滤
const handleFilter = () => {
  const count = filteredAchievements.value.length
  ElMessage.success(`筛选到 ${count} 条记录`)
}

// 重置筛选 - 清空本地过滤条件
const handleReset = () => {
  searchQuery.value = ''
  filterType.value = ''
  filterStatus.value = ''
  currentPage.value = 1
  ElMessage.success('筛选条件已重置')
}

// 获取成果列表
const fetchAchievementList = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      type: filterType.value || undefined,
      status: filterStatus.value || undefined,
      search: searchQuery.value || undefined,
    }

    const response = await achievementAPI.getAchievements(params)

    if (response.success) {
      achievementList.value = response.data || []
      totalAchievements.value = response.total || achievementList.value.length
      console.log('✅ 成果列表加载成功:', achievementList.value.length, '条记录')
    } else {
      ElMessage.error(response.error || '获取成果列表失败')
      achievementList.value = []
    }
  } catch (error) {
    console.error('获取成果列表失败:', error)
    ElMessage.error('获取成果列表失败，请检查网络连接')
    achievementList.value = []
  } finally {
    loading.value = false
  }
}

// 获取项目列表
const fetchProjectList = async () => {
  try {
    const response = await achievementAPI.getUserProjects()

    if (response.success && response.data) {
      projectList.value = response.data
      console.log('✅ 项目列表加载成功:', projectList.value.length, '个项目')
    } else {
      console.warn('获取项目列表失败:', response.error)
      // 使用模拟数据作为后备
      projectList.value = [
        { id: '1', title: '人工智能算法研究', project_code: 'PROJ-2024-001' },
        { id: '2', title: '大数据分析平台', project_code: 'PROJ-2024-002' },
      ]
    }
  } catch (error) {
    console.error('获取项目列表失败:', error)
    // 使用模拟数据作为后备
    projectList.value = [
      { id: '1', title: '人工智能算法研究', project_code: 'PROJ-2024-001' },
      { id: '2', title: '大数据分析平台', project_code: 'PROJ-2024-002' },
    ]
  }
}

// 分页处理
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1
  // 如果使用本地过滤，不需要重新调用API
  // fetchAchievementList()
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  // 如果使用本地过滤，不需要重新调用API
  // fetchAchievementList()
}

// 新增成果
const handleAddAchievement = () => {
  // 跳转到新增成果页面
  router.push('/achievements/create')
}

// 查看成果 - 跳转到独立详情页面
const handleViewDetail = (row: Achievement) => {
  console.log('查看成果详情，ID:', row.id)
  // 跳转到成果详情页面
  router.push(`/achievements/${row.id}/detail`)
}

// 编辑成果
const handleEdit = (row: Achievement) => {
  console.log('编辑成果，ID:', row.id)
  // 跳转到编辑成果页面
  router.push(`/achievements/${row.id}/edit`)
}

// 成果转化
const handleTransfer = (row: Achievement) => {
  router.push(`/achievements/${row.id}/transfer`)
}

// 删除成果
const handleDelete = async (row: Achievement) => {
  try {
    await ElMessageBox.confirm(`确定要删除成果 "${row.title}" 吗？此操作不可撤销。`, '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await achievementAPI.deleteAchievement(row.id)

    if (response.success) {
      ElMessage.success('成果删除成功')
      // 从本地列表中删除
      achievementList.value = achievementList.value.filter((item) => item.id !== row.id)
    } else {
      ElMessage.error(response.error || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除成果失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 生命周期
onMounted(() => {
  fetchAchievementList()
  fetchProjectList()
})
</script>

<style scoped>
.achievement-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
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

.achievement-list {
  margin-top: 20px;
}

.achievement-name {
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

.type-badge.monograph {
  background: #fdf4ff;
  color: #c038e6;
}

.type-badge.award {
  background: #fff2e8;
  color: #fa8c16;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.achievement-detail {
  line-height: 1.6;
}

.description-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.project-code {
  color: #666;
  font-size: 12px;
  margin-left: 5px;
}

.attachment-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachment-link {
  display: flex;
  align-items: center;
  gap: 4px;
}

.el-upload__tip {
  margin-top: 8px;
  color: #909399;
  font-size: 12px;
}

:deep(.el-descriptions__body) {
  background: #fff;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
  background-color: #fafafa;
}
</style>
