<!-- src/views/assistant/Users.vue -->
<template>
  <div class="users-management assistant-ruc-theme">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <div class="page-description">管理科研管理系统中的用户账号</div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openCreateDialog" :icon="Plus"> 新增用户 </el-button>
        <el-button @click="exportUsers" :icon="Download">导出</el-button>
        <el-dropdown @command="handleExpertImportCommand">
          <el-button :icon="Upload">
            批量导入专家顾问 <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="download-template">下载 Excel 模板</el-dropdown-item>
              <el-dropdown-item command="open-import">上传 Excel 导入</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="filter-toolbar">
      <div class="filter-left">
        <el-input
          v-model="filter.keyword"
          placeholder="搜索用户名、姓名、邮箱或部门"
          class="search-input"
          clearable
          @clear="handleSearch"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>

        <el-select
          v-model="filter.role"
          placeholder="角色筛选"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="申请人" value="applicant" />
          <el-option label="专家顾问" value="reviewer" />
          <el-option label="科研助理" value="project_manager" />
          <el-option label="经费管理员" value="funds_manager" />
          <el-option label="管理员" value="admin" />
        </el-select>

        <el-select
          v-model="filter.status"
          placeholder="状态筛选"
          clearable
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
        </el-select>

        <el-button type="primary" @click="handleSearch" :icon="Search"> 搜索 </el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>

      <div class="filter-right">
        <el-button-group>
          <el-button :type="viewMode === 'list' ? 'primary' : ''" @click="viewMode = 'list'">
            列表视图
          </el-button>
          <el-button :type="viewMode === 'card' ? 'primary' : ''" @click="viewMode = 'card'">
            卡片视图
          </el-button>
        </el-button-group>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="stats-cards">
      <div
        class="stat-card"
        :class="{ active: activeStatFilter.type === 'role' && activeStatFilter.value === 'applicant' }"
        @click.stop="filterByRole('applicant')"
      >
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalApplicants }}</div>
          <div class="stat-label">申请人</div>
        </div>
      </div>

      <div
        class="stat-card"
        :class="{ active: activeStatFilter.type === 'role' && activeStatFilter.value === 'reviewer' }"
        @click.stop="filterByRole('reviewer')"
      >
        <div class="stat-icon" style="background: rgba(179, 27, 27, 0.12); color: #b31b1b">
          <el-icon><Star /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalReviewers }}</div>
          <div class="stat-label">专家顾问</div>
        </div>
      </div>

      <div
        class="stat-card"
        :class="{
          active: activeStatFilter.type === 'role' && activeStatFilter.value === 'project_manager',
        }"
        @click.stop="filterByRole('project_manager')"
      >
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Setting /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalAssistants }}</div>
          <div class="stat-label">科研助理</div>
        </div>
      </div>

      <div
        class="stat-card"
        :class="{
          active: activeStatFilter.type === 'role' && activeStatFilter.value === 'funds_manager',
        }"
        @click.stop="filterByRole('funds_manager')"
      >
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Wallet /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalFundsManagers }}</div>
          <div class="stat-label">经费管理员</div>
        </div>
      </div>

      <div
        class="stat-card"
        :class="{ active: activeStatFilter.type === 'role' && activeStatFilter.value === 'admin' }"
        @click.stop="filterByRole('admin')"
      >
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Lock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalAdmins }}</div>
          <div class="stat-label">管理员</div>
        </div>
      </div>

      <div
        class="stat-card"
        :class="{ active: activeStatFilter.type === 'status' && activeStatFilter.value === 'active' }"
        @click.stop="filterByStatus('active')"
      >
        <div class="stat-icon" style="background: #b31b1b20; color: #b31b1b">
          <el-icon><Check /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeUsers }}</div>
          <div class="stat-label">活跃用户</div>
        </div>
      </div>
    </div>

    <!-- 当前筛选提示 -->
    <div v-if="activeFilterLabel" class="active-filter-bar">
      <span>当前筛选：{{ activeFilterLabel }}（共 {{ pagination.total }} 人）</span>
      <el-button type="primary" link @click="resetFilters">清除筛选</el-button>
    </div>

    <!-- 用户列表区域 -->
    <div ref="listContainerRef">
    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-container">
      <el-table
        :data="users"
        v-loading="loading"
        stripe
        style="width: 100%"
        @row-click="viewUserDetail"
      >
        <el-table-column prop="username" label="用户名" width="120">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="user-avatar-small">{{ getInitial(row.name) }}</div>
              <span class="username">{{ row.username }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="name" label="姓名" width="120" />

        <el-table-column prop="email" label="邮箱" width="200">
          <template #default="{ row }">
            <a :href="`mailto:${row.email}`" class="email-link">{{ row.email }}</a>
          </template>
        </el-table-column>

        <el-table-column prop="role" label="角色" width="120">
          <template #default="{ row }">
            <el-tag :type="getRoleTagType(row.role)" size="small">
              {{ getRoleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="department" label="部门" width="150" />

        <el-table-column prop="title" label="职称" width="150" />

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag
              :type="
                row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'info'
              "
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="last_login" label="最后登录" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.last_login) }}
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button type="primary" size="small" @click.stop="editUser(row)"> 编辑 </el-button>
              <el-button
                type="danger"
                size="small"
                @click.stop="handleStatusChange(row)"
                v-if="row.id !== currentUserId"
              >
                {{ row.status === 'active' ? '停用' : '启用' }}
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 卡片视图 -->
    <div v-else class="cards-container">
      <div v-loading="loading" class="cards-grid">
        <div v-for="user in users" :key="user.id" class="user-card" @click="viewUserDetail(user)">
          <div class="card-header">
            <div class="user-avatar-large">{{ getInitial(user.name) }}</div>
            <div class="user-basic-info">
              <h3 class="user-name">{{ user.name }}</h3>
              <p class="user-username">{{ '@' + user.username }}</p>
            </div>
            <el-dropdown @command="handleCardCommand($event, user)" trigger="click">
              <span class="card-menu">
                <el-icon><More /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit">编辑信息</el-dropdown-item>
                  <el-dropdown-item command="reset-password">重置密码</el-dropdown-item>
                  <el-dropdown-item command="toggle-status" :divided="true">
                    {{ user.status === 'active' ? '停用账号' : '启用账号' }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="card-content">
            <div class="info-row">
              <el-icon><Message /></el-icon>
              <span class="info-label">邮箱：</span>
              <a :href="`mailto:${user.email}`" class="info-value">{{ user.email }}</a>
            </div>

            <div class="info-row">
              <el-icon><UserFilled /></el-icon>
              <span class="info-label">角色：</span>
              <el-tag :type="getRoleTagType(user.role)" size="small">
                {{ getRoleText(user.role) }}
              </el-tag>
            </div>

            <div class="info-row">
              <el-icon><OfficeBuilding /></el-icon>
              <span class="info-label">部门：</span>
              <span class="info-value">{{ user.department || '未设置' }}</span>
            </div>

            <div class="info-row">
              <el-icon><Medal /></el-icon>
              <span class="info-label">职称：</span>
              <span class="info-value">{{ user.title || '未设置' }}</span>
            </div>

            <div class="info-row">
              <el-icon><Timer /></el-icon>
              <span class="info-label">最后登录：</span>
              <span class="info-value">{{ formatDateTime(user.last_login) || '从未登录' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <el-tag
              :type="
                user.status === 'active'
                  ? 'success'
                  : user.status === 'pending'
                    ? 'warning'
                    : 'info'
              "
              size="small"
            >
              {{ getStatusText(user.status) }}
            </el-tag>
            <span class="register-time"> 注册于 {{ formatDate(user.created_at) }} </span>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[12, 24, 48, 96]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
    </div>

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑用户' : '创建用户'"
      width="600px"
      @close="closeDialog"
    >
      <el-form
        ref="userFormRef"
        :model="dialog.form"
        :rules="dialog.rules"
        label-width="100px"
        label-position="right"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="dialog.form.username"
            placeholder="请输入用户名"
            :disabled="dialog.isEdit"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password" v-if="!dialog.isEdit">
          <el-input
            v-model="dialog.form.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword" v-if="!dialog.isEdit">
          <el-input
            v-model="dialog.form.confirmPassword"
            type="password"
            placeholder="请确认密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="真实姓名" prop="name">
          <el-input v-model="dialog.form.name" placeholder="请输入真实姓名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="dialog.form.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="角色" prop="role">
          <el-select v-model="dialog.form.role" placeholder="请选择角色" style="width: 100%">
            <el-option label="申请人" value="applicant" />
            <el-option label="专家顾问" value="reviewer" />
            <el-option label="科研助理" value="project_manager" />
            <el-option label="经费管理员" value="funds_manager" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>

        <el-form-item label="部门" prop="department">
          <el-input v-model="dialog.form.department" placeholder="请输入部门" />
        </el-form-item>

        <el-form-item label="职称" prop="title">
          <el-input v-model="dialog.form.title" placeholder="请输入职称" />
        </el-form-item>

        <el-form-item label="研究领域" prop="research_field">
          <el-input
            v-model="dialog.form.research_field"
            type="textarea"
            :rows="2"
            placeholder="请输入研究领域"
          />
        </el-form-item>

        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="dialog.form.phone" placeholder="请输入联系电话" />
        </el-form-item>

        <el-form-item v-if="dialog.form.role === 'reviewer'" label="专家类型">
          <el-checkbox-group v-model="dialog.form.expert_types">
            <el-checkbox label="technical">技术专家</el-checkbox>
            <el-checkbox label="industry">产业专家</el-checkbox>
            <el-checkbox label="investment">投资专家</el-checkbox>
            <el-checkbox label="tech_service">科技服务专家</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="账号状态" prop="status">
          <el-radio-group v-model="dialog.form.status">
            <el-radio label="active">活跃</el-radio>
            <el-radio label="inactive">非活跃</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closeDialog">取消</el-button>
          <el-button type="primary" @click="submitUserForm" :loading="dialog.loading">
            {{ dialog.isEdit ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 重置密码对话框 -->
    <el-dialog v-model="resetPasswordDialog.visible" title="重置密码" width="400px">
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordDialog.form"
        :rules="resetPasswordDialog.rules"
        label-width="80px"
      >
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordDialog.form.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordDialog.form.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            show-password
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPasswordDialog.visible = false">取消</el-button>
          <el-button
            type="primary"
            @click="submitResetPassword"
            :loading="resetPasswordDialog.loading"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 专家顾问批量导入 -->
    <el-dialog
      v-model="expertImportDialog.visible"
      title="批量导入专家顾问"
      width="720px"
      @closed="resetExpertImportDialog"
    >
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="请先下载模板，按列填写后上传。系统将自动创建专家顾问账号（角色 reviewer），并生成初始登录密码。导入账号默认为未激活，需激活后方可登录。"
        style="margin-bottom: 16px"
      />
      <el-upload
        drag
        accept=".xlsx,.xls"
        :auto-upload="false"
        :limit="1"
        :on-change="onExpertImportFileChange"
        :on-remove="onExpertImportFileRemove"
        :file-list="expertImportDialog.fileList"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">将 Excel 拖到此处，或<em>点击选择</em></div>
        <template #tip>
          <div class="el-upload__tip">字段：姓名、专业领域、工作单位、工作职务、职称、手机、个人简介、专家类型</div>
        </template>
      </el-upload>

      <el-alert
        v-if="expertImportDialog.result"
        :title="getExpertImportAlertTitle(expertImportDialog.result)"
        :type="getExpertImportAlertType(expertImportDialog.result)"
        :description="expertImportDialog.result.message"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />

      <div v-if="expertImportDialog.result" class="import-result-panel">
        <el-table
          v-if="expertImportDialog.result.data?.successes?.length"
          :data="expertImportDialog.result.data.successes"
          size="small"
          max-height="220"
          style="margin-top: 12px"
        >
          <el-table-column prop="rowNumber" label="行号" width="60" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="defaultPassword" label="初始密码" width="120" />
          <el-table-column prop="phone" label="手机" width="120" />
          <el-table-column label="专家类型" min-width="140">
            <template #default="{ row }">
              {{ formatImportedExpertTypes(row.expertTypes) }}
            </template>
          </el-table-column>
          <el-table-column label="类型未识别" min-width="120">
            <template #default="{ row }">
              <span v-if="row.expertTypeUnrecognized?.length" class="import-type-warn">
                {{ row.expertTypeUnrecognized.join('、') }}
              </span>
              <span v-else>—</span>
            </template>
          </el-table-column>
        </el-table>
        <el-table
          v-if="expertImportDialog.result.data?.failures?.length"
          :data="expertImportDialog.result.data.failures"
          size="small"
          max-height="160"
          style="margin-top: 12px"
        >
          <el-table-column prop="rowNumber" label="行号" width="60" />
          <el-table-column prop="name" label="姓名" width="90" />
          <el-table-column prop="error" label="失败原因" min-width="200" />
        </el-table>
      </div>

      <template #footer>
        <el-button @click="expertImportDialog.visible = false">关闭</el-button>
        <el-button @click="downloadExpertImportTemplate">下载模板</el-button>
        <el-button
          type="primary"
          :loading="expertImportDialog.loading"
          :disabled="!expertImportDialog.file"
          @click="submitExpertImport"
        >
          开始导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElNotification, type FormInstance } from 'element-plus'
import request from '@/utils/request'
import {
  Search,
  Plus,
  Download,
  Refresh,
  Upload,
  ArrowDown,
  User,
  Star,
  Setting,
  Lock,
  Check,
  Wallet,
  More,
  Message,
  UserFilled,
  OfficeBuilding,
  Medal,
  Timer,
} from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const viewMode = ref<'list' | 'card'>('list')
const userFormRef = ref<FormInstance>()
const resetPasswordFormRef = ref<FormInstance>()

// 当前用户ID（用于防止修改自己）
const currentUserId = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr).id : ''
})

// 筛选条件
const filter = reactive({
  keyword: '',
  role: '',
  status: '',
  department: '',
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 统计数据
const stats = reactive({
  totalUsers: 0,
  totalApplicants: 0,
  totalReviewers: 0,
  totalAssistants: 0,
  totalFundsManagers: 0,
  totalAdmins: 0,
  activeUsers: 0,
})

const activeStatFilter = reactive({ type: '' as '' | 'role' | 'status', value: '' })

const listContainerRef = ref<HTMLElement | null>(null)

const activeFilterLabel = computed(() => {
  if (activeStatFilter.type === 'role') {
    return getRoleText(activeStatFilter.value)
  }
  if (activeStatFilter.type === 'status') {
    return activeStatFilter.value === 'active' ? '活跃用户' : '非活跃用户'
  }
  if (filter.role) return getRoleText(filter.role)
  if (filter.status) return filter.status === 'active' ? '活跃用户' : '非活跃用户'
  if (filter.keyword) return `关键词「${filter.keyword}」`
  return ''
})

// 用户数据
const users = ref<any[]>([])

// 对话框状态
const dialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  editUserId: '',
  form: {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: '',
    department: '',
    title: '',
    research_field: '',
    phone: '',
    status: 'active',
    expert_types: [] as string[],
  },
  rules: {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: '请确认密码', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          if (value !== dialog.form.password) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
    ],
    name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
    email: [
      { required: true, message: '请输入邮箱', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
    ],
    role: [{ required: true, message: '请选择角色', trigger: 'change' }],
  },
})

// 重置密码对话框
const resetPasswordDialog = reactive({
  visible: false,
  loading: false,
  userId: '',
  form: {
    newPassword: '',
    confirmPassword: '',
  },
  rules: {
    newPassword: [
      { required: true, message: '请输入新密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6位', trigger: 'blur' },
    ],
    confirmPassword: [
      { required: true, message: '请确认新密码', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          if (value !== resetPasswordDialog.form.newPassword) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
    ],
  },
})

// 工具函数
const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : '?'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '专家顾问',
    project_manager: '科研助理',
    funds_manager: '经费管理员',
    admin: '管理员',
  }
  return map[role] || role
}

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = {
    applicant: 'primary',
    reviewer: 'success',
    project_manager: 'warning',
    funds_manager: 'info',
    admin: 'danger',
  }
  return map[role] || 'info'
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    active: '活跃',
    inactive: '非活跃',
    pending: '待激活',
  }
  return map[status] || status
}

const formatDate = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 数据加载
const loadUsers = async () => {
  loading.value = true

  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filter.keyword || undefined,
      role: filter.role || undefined,
      status: filter.status || undefined,
    }

    const response = await request.get('/api/assistant/users', { params })

    if (response.success) {
      users.value = response.data.users
      pagination.total = response.data.pagination.total
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const response = await request.get('/api/assistant/users/stats')
    if (response.success) {
      Object.assign(stats, response.data.overview || response.data)
      return
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }

  // stats 接口异常时，从未筛选的列表接口兜底
  try {
    const fallback = await request.get('/api/assistant/users', { params: { page: 1, pageSize: 1 } })
    if (fallback.success && fallback.data?.stats) {
      Object.assign(stats, fallback.data.stats)
    }
  } catch (error) {
    console.error('加载统计兜底数据失败:', error)
  }
}

const scrollToList = () => {
  listContainerRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// 搜索和筛选
const handleSearch = () => {
  if (filter.role) {
    activeStatFilter.type = 'role'
    activeStatFilter.value = filter.role
  } else if (filter.status) {
    activeStatFilter.type = 'status'
    activeStatFilter.value = filter.status
  } else if (!filter.keyword) {
    activeStatFilter.type = ''
    activeStatFilter.value = ''
  }
  pagination.current = 1
  loadUsers()
}

const resetFilters = () => {
  filter.keyword = ''
  filter.role = ''
  filter.status = ''
  filter.department = ''
  activeStatFilter.type = ''
  activeStatFilter.value = ''
  pagination.current = 1
  loadUsers()
}

const filterByRole = (role: string) => {
  if (activeStatFilter.type === 'role' && activeStatFilter.value === role) {
    filter.role = ''
    filter.keyword = ''
    activeStatFilter.type = ''
    activeStatFilter.value = ''
  } else {
    filter.role = role
    filter.status = ''
    filter.keyword = ''
    activeStatFilter.type = 'role'
    activeStatFilter.value = role
  }
  pagination.current = 1
  loadUsers().then(() => {
    scrollToList()
    if (filter.role) {
      ElMessage.success(`已筛选：${getRoleText(filter.role)}`)
    }
  })
}

const filterByStatus = (status: string) => {
  if (activeStatFilter.type === 'status' && activeStatFilter.value === status) {
    filter.status = ''
    filter.keyword = ''
    activeStatFilter.type = ''
    activeStatFilter.value = ''
  } else {
    filter.status = status
    filter.role = ''
    filter.keyword = ''
    activeStatFilter.type = 'status'
    activeStatFilter.value = status
  }
  pagination.current = 1
  loadUsers().then(() => {
    scrollToList()
    if (filter.status) {
      ElMessage.success(`已筛选：${status === 'active' ? '活跃用户' : '非活跃用户'}`)
    }
  })
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  loadUsers()
}

const handleCurrentChange = (page: number) => {
  pagination.current = page
  loadUsers()
}

// 用户操作
const viewUserDetail = (user: any) => {
  editUser(user)
}

const editUser = (user: any) => {
  dialog.isEdit = true
  dialog.editUserId = user.id
  dialog.visible = true

  // 填充表单数据
  Object.assign(dialog.form, {
    username: user.username,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department || '',
    title: user.title || '',
    research_field: user.research_field || '',
    phone: user.phone || '',
    status: user.status === 'pending' ? 'inactive' : user.status,
    expert_types: Array.isArray(user.expert_types) ? [...user.expert_types] : [],
    password: '',
    confirmPassword: '',
  })
}

const openCreateDialog = () => {
  dialog.isEdit = false
  dialog.editUserId = ''
  dialog.visible = true

  // 重置表单
  if (userFormRef.value) {
    userFormRef.value.resetFields()
  }
  dialog.form = {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: '',
    department: '',
    title: '',
    research_field: '',
    phone: '',
    status: 'active',
    expert_types: [],
  }
}

const closeDialog = () => {
  dialog.visible = false
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

const submitUserForm = async () => {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
    dialog.loading = true

    const formData = { ...dialog.form }
    delete formData.confirmPassword
    if (formData.status === 'pending') formData.status = 'inactive'
    if (dialog.isEdit) {
      delete formData.username
      delete formData.password
    }

    const url = dialog.isEdit
      ? `/api/assistant/users/${dialog.editUserId}`
      : '/api/assistant/users'

    const method = dialog.isEdit ? 'put' : 'post'

    const response = await request[method](url, formData)

    if (response.success) {
      ElMessage.success(dialog.isEdit ? '用户更新成功' : '用户创建成功')
      closeDialog()
      loadUsers()
      loadStats()
    }
  } catch (error: any) {
    if (error.name !== 'ValidateError') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    dialog.loading = false
  }
}

const handleStatusChange = async (user: any) => {
  try {
    const action = user.status === 'active' ? '停用' : '启用'
    const confirmText =
      user.status === 'active'
        ? `确定要停用用户 "${user.name}" 吗？`
        : `确定要启用用户 "${user.name}" 吗？`

    await ElMessageBox.confirm(confirmText, `确认${action}`, {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const response = await request.put(`/api/assistant/users/${user.id}/status`, {
      status: newStatus,
    })

    if (response.success) {
      ElMessage.success(`${action}成功`)
      loadUsers()
      loadStats()
    }
  } catch (error) {
    // 用户取消操作
  }
}

const handleCardCommand = (command: string, user: any) => {
  switch (command) {
    case 'edit':
      editUser(user)
      break
    case 'reset-password':
      openResetPasswordDialog(user)
      break
    case 'toggle-status':
      handleStatusChange(user)
      break
  }
}

// 重置密码
const openResetPasswordDialog = (user: any) => {
  resetPasswordDialog.userId = user.id
  resetPasswordDialog.visible = true
  resetPasswordDialog.form.newPassword = ''
  resetPasswordDialog.form.confirmPassword = ''

  if (resetPasswordFormRef.value) {
    resetPasswordFormRef.value.clearValidate()
  }
}

const submitResetPassword = async () => {
  if (!resetPasswordFormRef.value) return

  try {
    await resetPasswordFormRef.value.validate()
    resetPasswordDialog.loading = true

    const response = await request.put(
      `/api/assistant/users/${resetPasswordDialog.userId}/password`,
      { newPassword: resetPasswordDialog.form.newPassword },
    )

    if (response.success) {
      ElMessage.success('密码重置成功')
      resetPasswordDialog.visible = false
    }
  } catch (error: any) {
    if (error.name !== 'ValidateError') {
      ElMessage.error(error.message || '重置密码失败')
    }
  } finally {
    resetPasswordDialog.loading = false
  }
}

// 导出功能
const exportUsers = async () => {
  try {
    const response = await request.get('/api/assistant/users/export', {
      params: filter,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users_${new Date().getTime()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const EXPERT_IMPORT_API = '/api/assistant/users/expert-import'

const EXPERT_TYPE_LABELS: Record<string, string> = {
  technical: '技术专家',
  industry: '产业专家',
  investment: '投资专家',
  tech_service: '科技服务专家',
}

function formatImportedExpertTypes(types?: string[]) {
  if (!types?.length) return '—'
  return types.map((t) => EXPERT_TYPE_LABELS[t] || t).join('、')
}

const expertImportDialog = reactive({
  visible: false,
  loading: false,
  file: null as File | null,
  fileList: [] as any[],
  result: null as any,
})

const handleExpertImportCommand = (command: string) => {
  if (command === 'download-template') {
    downloadExpertImportTemplate()
  } else if (command === 'open-import') {
    resetExpertImportDialog()
    expertImportDialog.visible = true
  }
}

const downloadExpertImportTemplate = async () => {
  try {
    const blob = await request.get(`${EXPERT_IMPORT_API}/template`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', '专家顾问批量导入模板.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    ElMessage.success('模板下载成功')
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败')
  }
}

const onExpertImportFileChange = (uploadFile: any) => {
  expertImportDialog.file = uploadFile.raw || null
  expertImportDialog.fileList = uploadFile.raw ? [uploadFile] : []
  expertImportDialog.result = null
}

const onExpertImportFileRemove = () => {
  expertImportDialog.file = null
  expertImportDialog.fileList = []
  expertImportDialog.result = null
}

const resetExpertImportDialog = () => {
  expertImportDialog.loading = false
  expertImportDialog.file = null
  expertImportDialog.fileList = []
  expertImportDialog.result = null
}

const getExpertImportAlertType = (result: any) => {
  const ok = result?.data?.successCount ?? 0
  const fail = result?.data?.failCount ?? 0
  if (ok > 0 && fail === 0) return 'success'
  if (ok > 0) return 'warning'
  return 'error'
}

const getExpertImportAlertTitle = (result: any) => {
  const ok = result?.data?.successCount ?? 0
  const fail = result?.data?.failCount ?? 0
  if (ok > 0 && fail === 0) return '导入成功'
  if (ok > 0) return '部分导入成功'
  return '导入失败'
}

const notifyExpertImportResult = (response: any) => {
  const ok = response?.data?.successCount ?? 0
  const fail = response?.data?.failCount ?? 0
  if (ok > 0 && fail === 0) {
    ElNotification({
      title: '导入成功',
      message: `已成功导入 ${ok} 位专家顾问（默认未激活），请在下方查看用户名与初始密码，激活后即可登录。`,
      type: 'success',
      duration: 6000,
    })
    ElMessage.success(`导入成功，共 ${ok} 位专家顾问（默认未激活）`)
    return
  }
  if (ok > 0) {
    ElNotification({
      title: '部分导入成功',
      message: `成功 ${ok} 条，失败 ${fail} 条，请查看下方明细。`,
      type: 'warning',
      duration: 6000,
    })
    ElMessage.warning(`部分导入成功：成功 ${ok} 条，失败 ${fail} 条`)
    return
  }
  ElNotification({
    title: '导入失败',
    message: response?.message || '没有成功导入任何专家顾问',
    type: 'error',
    duration: 6000,
  })
  ElMessage.error(response?.message || '导入失败')
}

const submitExpertImport = async () => {
  if (!expertImportDialog.file) {
    ElMessage.warning('请先选择 Excel 文件')
    return
  }
  expertImportDialog.loading = true
  expertImportDialog.result = null
  try {
    const formData = new FormData()
    formData.append('file', expertImportDialog.file)
    const response = await request.post(EXPERT_IMPORT_API, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (response.success) {
      expertImportDialog.result = response
      expertImportDialog.file = null
      expertImportDialog.fileList = []
      notifyExpertImportResult(response)
      loadUsers()
      loadStats()
    } else {
      ElMessage.error(response.error || '导入失败')
    }
  } catch (error: any) {
    if (error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '')) return
    ElMessage.error(error.response?.data?.error || error.message || '导入失败')
  } finally {
    expertImportDialog.loading = false
  }
}

const refreshData = () => {
  loadUsers()
  loadStats()
}

// 初始化
onMounted(() => {
  loadUsers()
  loadStats()
})
</script>

<style scoped>
.users-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 70px);
}

.import-result-panel {
  margin-top: 16px;
}

.import-result-summary {
  margin: 0;
  font-size: 14px;
  color: #333;
}

/* 顶部标题栏 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #2c3e50;
}

.page-description {
  margin: 0;
  color: #7f8c8d;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 筛选工具栏 */
.filter-toolbar {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 120px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-card.active {
  border: 2px solid #b31b1b;
  background: rgba(179, 27, 27, 0.04);
}

.active-filter-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 10px 16px;
  background: rgba(179, 27, 27, 0.06);
  border: 1px solid rgba(179, 27, 27, 0.15);
  border-radius: 8px;
  color: #b31b1b;
  font-size: 14px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
}

/* 列表视图 */
.list-container {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  background: #b31b1b;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.username {
  font-weight: 500;
}

.email-link {
  color: #b31b1b;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}

/* 卡片视图 */
.cards-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.user-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
}

.user-card:hover {
  border-color: #b31b1b;
  box-shadow: 0 4px 16px rgba(250, 140, 22, 0.1);
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.user-avatar-large {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #b31b1b 0%, #8b1515 100%);
  color: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.user-basic-info {
  flex: 1;
  min-width: 0;
}

.user-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

.user-username {
  margin: 0;
  color: #7f8c8d;
  font-size: 13px;
}

.card-menu {
  cursor: pointer;
  padding: 4px;
  color: #7f8c8d;
  transition: color 0.3s;
}

.card-menu:hover {
  color: #b31b1b;
}

.card-content {
  padding: 20px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .el-icon {
  color: #7f8c8d;
  font-size: 16px;
  min-width: 16px;
}

.info-label {
  color: #7f8c8d;
  min-width: 70px;
}

.info-value {
  color: #2c3e50;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  padding: 16px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.register-time {
  font-size: 12px;
  color: #7f8c8d;
}

/* 分页 */
.pagination-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stats-cards {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 992px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-right {
    width: 100%;
    justify-content: flex-start;
  }

  .filter-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .filter-left {
    width: 100%;
  }

  .search-input {
    width: 100%;
  }

  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .filter-left {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input,
  .filter-select {
    width: 100%;
  }
}
</style>
