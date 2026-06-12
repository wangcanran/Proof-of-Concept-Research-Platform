<template>
  <div class="user-center-page">
    <header class="page-header">
      <div class="header-left">
        <button type="button" class="back-btn" @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          <span>返回工作台</span>
        </button>
        <div class="header-text">
          <h1>个人中心</h1>
          <p class="header-subtitle">管理个人资料、擅长领域与登录密码</p>
        </div>
      </div>
    </header>

    <div v-loading="loading" class="content-wrapper">
      <aside class="side-panel">
        <div class="profile-hero">
          <div class="avatar-ring">
            <el-avatar :size="80" class="avatar">{{ avatarLetter }}</el-avatar>
          </div>
          <h3 class="hero-name">{{ profile.name || '未设置姓名' }}</h3>
          <el-tag class="role-tag" effect="dark" round>{{ roleLabel }}</el-tag>
          <div class="hero-meta">
            <div class="meta-row">
              <el-icon><User /></el-icon>
              <span>{{ profile.username || '—' }}</span>
            </div>
            <div class="meta-row">
              <el-icon><Message /></el-icon>
              <span>{{ profile.email || '—' }}</span>
            </div>
          </div>
        </div>

        <nav class="side-nav">
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeTab === 'profile' }"
            @click="activeTab = 'profile'"
          >
            <el-icon><EditPen /></el-icon>
            <span>个人资料</span>
          </button>
          <button
            type="button"
            class="nav-item"
            :class="{ active: activeTab === 'security' }"
            @click="activeTab = 'security'"
          >
            <el-icon><Lock /></el-icon>
            <span>修改密码</span>
          </button>
        </nav>

        <div class="side-status">
          <div class="status-pill" :class="profile.status === 'active' ? 'ok' : 'warn'">
            {{ profile.status === 'active' ? '账户正常' : '未激活' }}
          </div>
          <p class="status-time">上次登录 {{ formatDateTime(profile.last_login) }}</p>
        </div>
      </aside>

      <main class="main-panel">
        <!-- 个人资料 -->
        <section v-show="activeTab === 'profile'" class="panel-section">
          <div class="section-card">
            <div class="section-head">
              <div class="section-title-wrap">
                <span class="section-icon">📋</span>
                <div>
                  <h2>个人资料</h2>
                  <p>只读信息来自系统账户，下方内容可修改并保存</p>
                </div>
              </div>
              <el-button type="primary" class="save-btn" :loading="savingProfile" @click="saveProfile">
                保存资料
              </el-button>
            </div>

            <el-form
              ref="profileFormRef"
              :model="profileForm"
              :rules="profileRules"
              label-width="108px"
              class="profile-form"
            >
              <div class="form-block readonly-block">
                <div class="block-label">
                  <span class="block-dot"></span>
                  账户信息
                  <span class="block-tag">只读</span>
                </div>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="用户名">
                      <el-input :model-value="profile.username" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="邮箱">
                      <el-input :model-value="profile.email" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="角色">
                      <el-input :model-value="roleLabel" disabled />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="注册时间">
                      <el-input :model-value="formatDateTime(profile.created_at)" disabled />
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div class="form-block editable-block">
                <div class="block-label">
                  <span class="block-dot editable"></span>
                  基本信息
                </div>
                <el-row :gutter="20">
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="姓名" prop="name">
                      <el-input v-model="profileForm.name" placeholder="真实姓名" clearable />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item label="联系电话" prop="phone">
                      <el-input
                        v-model="profileForm.phone"
                        placeholder="11 位手机号"
                        maxlength="11"
                        clearable
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item :label="departmentLabel" prop="department">
                      <el-input
                        v-model="profileForm.department"
                        :placeholder="`请输入${departmentLabel}`"
                        clearable
                      />
                    </el-form-item>
                  </el-col>
                  <el-col :xs="24" :sm="12">
                    <el-form-item :label="titleLabel" prop="title">
                      <el-input
                        v-model="profileForm.title"
                        :placeholder="`请输入${titleLabel}`"
                        clearable
                      />
                    </el-form-item>
                  </el-col>
                  <el-col v-if="isReviewer" :xs="24">
                    <el-form-item label="专家类型">
                      <el-checkbox-group v-model="selectedExpertTypes" class="expert-type-group">
                        <el-checkbox
                          v-for="opt in expertTypeOptions"
                          :key="opt.value"
                          :label="opt.value"
                        >
                          {{ opt.label }}
                        </el-checkbox>
                      </el-checkbox-group>
                      <p class="field-hint">可多选；参与项目评审须勾选「技术专家」。</p>
                    </el-form-item>
                  </el-col>
                </el-row>
              </div>

              <div v-if="isReviewer" class="form-block expert-block">
                <div class="block-label">
                  <span class="block-dot expert"></span>
                  专家擅长领域
                </div>
                <el-form-item label="擅长领域">
                  <el-select
                    v-model="selectedDomainIds"
                    multiple
                    filterable
                    collapse-tags
                    collapse-tags-tooltip
                    placeholder="请选择擅长研究领域"
                    class="domain-select"
                    :loading="domainsLoading"
                  >
                    <el-option
                      v-for="d in researchDomains"
                      :key="d.id"
                      :label="d.name"
                      :value="d.id"
                    />
                  </el-select>
                  <p class="field-hint">与项目申报领域一致，便于项目经理按领域匹配评审任务。</p>
                  <div v-if="selectedDomainNames.length" class="domain-tags">
                    <el-tag
                      v-for="name in selectedDomainNames"
                      :key="name"
                      type="danger"
                      effect="plain"
                      round
                    >
                      {{ name }}
                    </el-tag>
                  </div>
                </el-form-item>
                <el-form-item label="专业特长">
                  <el-input
                    v-model="profileForm.expertise_description"
                    type="textarea"
                    :rows="3"
                    placeholder="补充说明研究方向或特长（选填）"
                    maxlength="500"
                    show-word-limit
                  />
                </el-form-item>
                <el-form-item label="专业关键词">
                  <div v-if="profile.keywords" class="keywords-readonly">{{ profile.keywords }}</div>
                  <div v-else class="keywords-empty">保存特长描述后将自动生成，用于专家检索匹配</div>
                </el-form-item>
              </div>
            </el-form>
          </div>
        </section>

        <!-- 修改密码 -->
        <section v-show="activeTab === 'security'" class="panel-section">
          <div class="section-card">
            <div class="section-head">
              <div class="section-title-wrap">
                <span class="section-icon">🔐</span>
                <div>
                  <h2>修改密码</h2>
                  <p>建议定期更换密码，长度不少于 6 位</p>
                </div>
              </div>
            </div>

            <div class="security-tip">
              <el-icon><WarningFilled /></el-icon>
              <span>修改成功后请使用新密码登录；请勿与当前密码相同。</span>
            </div>

            <el-form
              ref="passwordFormRef"
              :model="passwordForm"
              :rules="passwordRules"
              label-width="108px"
              class="password-form"
            >
              <el-form-item label="当前密码" prop="currentPassword">
                <el-input
                  v-model="passwordForm.currentPassword"
                  type="password"
                  show-password
                  autocomplete="current-password"
                  placeholder="请输入当前登录密码"
                />
              </el-form-item>
              <el-form-item label="新密码" prop="newPassword">
                <el-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  placeholder="至少 6 位"
                />
              </el-form-item>
              <el-form-item label="确认新密码" prop="confirmPassword">
                <el-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  show-password
                  autocomplete="new-password"
                  placeholder="再次输入新密码"
                />
              </el-form-item>
              <el-form-item class="form-actions">
                <el-button type="primary" class="save-btn" :loading="changingPassword" @click="submitPasswordChange">
                  确认修改
                </el-button>
                <el-button @click="resetPasswordForm">清空</el-button>
              </el-form-item>
            </el-form>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ArrowLeft, User, Lock, Message, EditPen, WarningFilled } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import {
  getProfile,
  updateProfile,
  updateExpertDomains,
  updateExpertTypes,
  getResearchDomains,
  changePassword as apiChangePassword,
} from '@/api/auth'

type DomainOption = { id: string; name: string; code?: string }
type ProfileData = {
  id?: string
  username?: string
  name?: string
  email?: string
  role?: string
  department?: string
  title?: string
  phone?: string
  status?: string
  created_at?: string
  last_login?: string
  expertise_description?: string | null
  keywords?: string | null
  expert_domains?: DomainOption[]
  expert_types?: string[]
  expertTypes?: string[]
}

const expertTypeOptions = [
  { value: 'technical', label: '技术专家' },
  { value: 'industry', label: '产业专家' },
  { value: 'investment', label: '投资专家' },
] as const

const router = useRouter()
const authStore = useAuthStore()
const activeTab = ref('profile')
const loading = ref(false)
const savingProfile = ref(false)
const changingPassword = ref(false)
const domainsLoading = ref(false)

const profile = ref<ProfileData>({})
const profileForm = reactive({
  name: '',
  phone: '',
  department: '',
  title: '',
  expertise_description: '',
})
const selectedDomainIds = ref<string[]>([])
const selectedExpertTypes = ref<string[]>([])
const researchDomains = ref<DomainOption[]>([])

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const profileFormRef = ref<FormInstance>()
const passwordFormRef = ref<FormInstance>()

const isReviewer = computed(() => profile.value.role === 'reviewer')

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '项目经理',
    admin: '系统管理员',
    funds_manager: '经费管理员',
  }
  return map[profile.value.role || ''] || profile.value.role || '—'
})

const departmentLabel = computed(() =>
  profile.value.role === 'reviewer' ? '单位' : '部门/单位',
)
const titleLabel = computed(() => '职称/职务')

const avatarLetter = computed(() => (profile.value.name || profile.value.username || 'U').charAt(0))

const selectedDomainNames = computed(() => {
  const map = new Map(researchDomains.value.map((d) => [d.id, d.name]))
  return selectedDomainIds.value.map((id) => map.get(id)).filter(Boolean) as string[]
})

const dashboardPath = computed(() => {
  const role = (profile.value.role || localStorage.getItem('userRole') || '').toLowerCase()
  const paths: Record<string, string> = {
    applicant: '/applicant/dashboard',
    reviewer: '/reviewer/dashboard',
    project_manager: '/assistant/dashboard',
    funds_manager: '/funds-manager/dashboard',
    admin: '/admin/dashboard',
  }
  return paths[role] || '/'
})

const profileRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 50, message: '姓名长度为 2–50 个字符', trigger: 'blur' },
  ],
  phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
}

const validateConfirmPassword = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (value !== passwordForm.newPassword) callback(new Error('两次输入的新密码不一致'))
  else callback()
}

const passwordRules: FormRules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

function goBack() {
  router.push(dashboardPath.value)
}

function formatDateTime(v: string | null | undefined) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return String(v)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function applyProfileToForm(data: ProfileData) {
  profile.value = data
  profileForm.name = data.name || ''
  profileForm.phone = data.phone || ''
  profileForm.department = data.department || ''
  profileForm.title = data.title || ''
  profileForm.expertise_description = data.expertise_description || ''
  const domains = data.expert_domains || (data as { expertDomains?: DomainOption[] }).expertDomains || []
  selectedDomainIds.value = domains.map((d) => d.id)
  const types = data.expert_types || data.expertTypes || []
  selectedExpertTypes.value = Array.isArray(types) ? [...types] : []
}

function syncLocalUser(data: ProfileData) {
  const stored = {
    id: data.id,
    username: data.username,
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department,
    title: data.title,
    phone: data.phone,
    expertDomains: data.expert_domains,
  }
  localStorage.setItem('user', JSON.stringify(stored))
  localStorage.setItem('userName', data.name || '')
  localStorage.setItem('userRole', data.role || '')
  localStorage.setItem('userId', data.id || '')
  localStorage.setItem('userEmail', data.email || '')
  authStore.user = stored as never
}

async function loadResearchDomains() {
  domainsLoading.value = true
  try {
    const res = (await getResearchDomains()) as { success?: boolean; data?: DomainOption[] }
    researchDomains.value = res?.data || []
  } catch {
    researchDomains.value = []
  } finally {
    domainsLoading.value = false
  }
}

async function loadProfile() {
  loading.value = true
  try {
    const res = (await getProfile()) as { success?: boolean; user?: ProfileData; data?: ProfileData }
    const data = res?.user ?? res?.data
    if (!data?.id) {
      ElMessage.error('加载个人资料失败')
      return
    }
    applyProfileToForm(data)
    if (data.role === 'reviewer') await loadResearchDomains()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    ElMessage.error(err.response?.data?.error || '加载个人资料失败')
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  if (!profileFormRef.value) return
  try {
    await profileFormRef.value.validate()
  } catch {
    return
  }
  savingProfile.value = true
  try {
    const payload: Record<string, string> = {
      name: profileForm.name.trim(),
      phone: profileForm.phone.trim(),
      department: profileForm.department.trim(),
      title: profileForm.title.trim(),
    }
    if (isReviewer.value) {
      payload.expertise_description = profileForm.expertise_description.trim()
    }
    const res = (await updateProfile(payload)) as {
      success?: boolean
      user?: ProfileData
      data?: ProfileData
      error?: string
    }
    if (!res?.success) {
      ElMessage.error(res?.error || '保存失败')
      return
    }
    if (isReviewer.value) {
      const typesRes = (await updateExpertTypes(selectedExpertTypes.value)) as {
        success?: boolean
        error?: string
        user?: ProfileData
      }
      if (!typesRes?.success) {
        ElMessage.error(typesRes?.error || '专家类型保存失败')
        return
      }
      const domRes = (await updateExpertDomains(selectedDomainIds.value)) as {
        success?: boolean
        error?: string
        user?: ProfileData
      }
      if (!domRes?.success) {
        ElMessage.error(domRes?.error || '擅长领域保存失败')
        return
      }
      const merged = domRes.user ?? typesRes.user ?? res.user ?? res.data
      if (merged) applyProfileToForm(merged)
      else applyProfileToForm(res.user ?? res.data ?? profile.value)
    } else {
      applyProfileToForm(res.user ?? res.data ?? profile.value)
    }
    syncLocalUser(profile.value)
    ElMessage.success('个人资料已保存')
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    ElMessage.error(err.response?.data?.error || '保存失败')
  } finally {
    savingProfile.value = false
  }
}

async function submitPasswordChange() {
  if (!passwordFormRef.value) return
  try {
    await passwordFormRef.value.validate()
  } catch {
    return
  }
  changingPassword.value = true
  try {
    const res = (await apiChangePassword({
      current_password: passwordForm.currentPassword,
      new_password: passwordForm.newPassword,
    })) as { success?: boolean; error?: string }
    if (res?.success) {
      ElMessage.success('密码修改成功')
      resetPasswordForm()
    } else {
      ElMessage.error(res?.error || '密码修改失败')
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { error?: string } } }
    ElMessage.error(err.response?.data?.error || '密码修改失败')
  } finally {
    changingPassword.value = false
  }
}

function resetPasswordForm() {
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  passwordFormRef.value?.clearValidate()
}

onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.user-center-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #f8f4f4 0%, #f5f7fa 45%, #eef1f6 100%);
}

.page-header {
  background: #fff;
  padding: 18px 28px;
  border-bottom: 1px solid #ebe6e6;
  box-shadow: 0 2px 12px rgba(179, 27, 27, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
  max-width: 1200px;
  margin: 0 auto;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  color: #595959;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.back-btn:hover {
  border-color: #b31b1b;
  color: #b31b1b;
  background: rgba(179, 27, 27, 0.04);
}

.header-text h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1f1f1f;
  line-height: 1.3;
}

.header-subtitle {
  margin: 4px 0 0;
  font-size: 14px;
  color: #8c8c8c;
}

.content-wrapper {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 20px 48px;
}

.side-panel {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  border: 1px solid #f0f0f0;
}

.profile-hero {
  padding: 28px 20px 22px;
  text-align: center;
  background: linear-gradient(145deg, #b31b1b 0%, #8b0000 100%);
  color: #fff;
}

.avatar-ring {
  display: inline-flex;
  padding: 4px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  margin-bottom: 12px;
}

.avatar {
  background: #fff;
  color: #b31b1b;
  font-size: 32px;
  font-weight: 700;
}

.hero-name {
  margin: 0 0 10px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.role-tag {
  background: rgba(255, 255, 255, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.35) !important;
  color: #fff !important;
}

.hero-meta {
  margin-top: 16px;
  text-align: left;
  padding: 12px 14px;
  background: rgba(0, 0, 0, 0.12);
  border-radius: 8px;
}

.meta-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.92);
  word-break: break-all;
}

.meta-row + .meta-row {
  margin-top: 8px;
}

.meta-row .el-icon {
  margin-top: 2px;
  flex-shrink: 0;
}

.side-nav {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: #595959;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: #fafafa;
  color: #b31b1b;
}

.nav-item.active {
  background: rgba(179, 27, 27, 0.08);
  border-color: rgba(179, 27, 27, 0.2);
  color: #b31b1b;
  font-weight: 600;
}

.side-status {
  padding: 14px 16px 18px;
  border-top: 1px solid #f0f0f0;
  background: #fafafa;
}

.status-pill {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-pill.ok {
  background: #f6ffed;
  color: #389e0d;
  border: 1px solid #b7eb8f;
}

.status-pill.warn {
  background: #fff7e6;
  color: #d46b08;
  border: 1px solid #ffd591;
}

.status-time {
  margin: 10px 0 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.4;
}

.main-panel {
  flex: 1;
  min-width: 0;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  overflow: hidden;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px;
  border-bottom: 1px solid #f5f5f5;
  background: linear-gradient(180deg, #fafafa 0%, #fff 100%);
}

.section-title-wrap {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.section-icon {
  font-size: 28px;
  line-height: 1;
}

.section-title-wrap h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #262626;
}

.section-title-wrap p {
  margin: 4px 0 0;
  font-size: 13px;
  color: #8c8c8c;
}

.save-btn {
  background: #b31b1b !important;
  border-color: #b31b1b !important;
}

.save-btn:hover {
  background: #8b0000 !important;
  border-color: #8b0000 !important;
}

.profile-form,
.password-form {
  padding: 8px 24px 24px;
}

.form-block {
  margin-top: 8px;
  padding: 18px 18px 4px;
  border-radius: 10px;
  border: 1px solid #f0f0f0;
}

.readonly-block {
  background: #fafafa;
}

.editable-block {
  background: #fff;
  margin-top: 16px;
}

.expert-block {
  background: linear-gradient(180deg, #fff9f9 0%, #fff 100%);
  border-color: rgba(179, 27, 27, 0.12);
  margin-top: 16px;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: #262626;
}

.block-dot {
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: #bfbfbf;
}

.block-dot.editable {
  background: #b31b1b;
}

.block-dot.expert {
  background: #d4380d;
}

.block-tag {
  font-size: 11px;
  font-weight: 500;
  color: #8c8c8c;
  padding: 2px 8px;
  background: #f0f0f0;
  border-radius: 4px;
}

.keywords-readonly {
  padding: 10px 12px;
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  font-size: 14px;
  color: #595959;
  line-height: 1.6;
}

.keywords-empty {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.5;
}

.expert-type-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}

.domain-select {
  width: 100%;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
}

.domain-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.security-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 24px 8px;
  padding: 12px 14px;
  background: #fffbe6;
  border: 1px solid #ffe58f;
  border-radius: 8px;
  font-size: 13px;
  color: #ad6800;
  line-height: 1.5;
}

.security-tip .el-icon {
  font-size: 18px;
  margin-top: 1px;
  flex-shrink: 0;
}

.password-form {
  max-width: 520px;
}

.form-actions {
  margin-top: 8px;
}

:deep(.el-form-item__label) {
  color: #595959;
  font-weight: 500;
}

:deep(.el-input.is-disabled .el-input__wrapper) {
  background: #f5f5f5;
}

@media (max-width: 900px) {
  .content-wrapper {
    flex-direction: column;
    padding: 16px;
  }

  .side-panel {
    width: 100%;
  }

  .side-nav {
    flex-direction: row;
  }

  .nav-item {
    flex: 1;
    justify-content: center;
  }

  .section-head {
    flex-direction: column;
    align-items: stretch;
  }

  .save-btn {
    width: 100%;
  }
}
</style>
