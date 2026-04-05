<!-- src/views/admin/UserEdit.vue -->
<template>
  <div class="user-edit">
    <div class="admin-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <h1>编辑用户</h1>
      </div>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="goBack">取消</button>
        <button class="btn btn-primary" @click="saveUser" :disabled="saving">
          💾 {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <div>加载用户信息中...</div>
    </div>

    <!-- 编辑表单 -->
    <div v-else class="edit-form">
      <div class="form-container">
        <form @submit.prevent="saveUser">
          <div class="form-section">
            <h3>基本信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>用户名 *</label>
                <input type="text" v-model="userForm.username" required />
              </div>
              <div class="form-group">
                <label>密码</label>
                <input type="password" v-model="userForm.password" placeholder="留空则不修改密码" />
              </div>
              <div class="form-group">
                <label>姓名 *</label>
                <input type="text" v-model="userForm.name" required />
              </div>
              <div class="form-group">
                <label>邮箱 *</label>
                <input type="email" v-model="userForm.email" required />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>权限设置</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>角色 *</label>
                <select v-model="userForm.role" required>
                  <option value="applicant">项目申请人</option>
                  <option value="reviewer">评审专家</option>
                  <option value="assistant">科研助理</option>
                  <option value="admin">系统管理员</option>
                </select>
              </div>
              <div class="form-group">
                <label>账号状态 *</label>
                <select v-model="userForm.status" required>
                  <option value="active">活跃</option>
                  <option value="inactive">非活跃</option>
                  <option value="pending">待激活</option>
                </select>
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>个人信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>部门</label>
                <input type="text" v-model="userForm.department" />
              </div>
              <div class="form-group">
                <label>职称</label>
                <input type="text" v-model="userForm.title" />
              </div>
              <div class="form-group">
                <label>研究领域</label>
                <input type="text" v-model="userForm.research_field" />
              </div>
              <div class="form-group">
                <label>联系电话</label>
                <input type="tel" v-model="userForm.phone" />
              </div>
            </div>
          </div>

          <div class="form-section">
            <h3>账号信息</h3>
            <div class="form-grid">
              <div class="form-group">
                <label>用户ID</label>
                <div class="readonly-field">{{ userId }}</div>
              </div>
              <div class="form-group">
                <label>创建时间</label>
                <div class="readonly-field">{{ formatDateTime(userForm.created_at) }}</div>
              </div>
              <div class="form-group">
                <label>最后登录</label>
                <div class="readonly-field">
                  {{ userForm.last_login ? formatDateTime(userForm.last_login) : '从未登录' }}
                </div>
              </div>
              <div class="form-group">
                <label>更新时间</label>
                <div class="readonly-field">{{ formatDateTime(userForm.updated_at) }}</div>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn btn-secondary" @click="goBack">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              💾 {{ saving ? '保存中...' : '保存修改' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const userId = route.params.id as string
const loading = ref(true)
const saving = ref(false)

const userForm = ref({
  username: '',
  password: '',
  name: '',
  email: '',
  role: '',
  status: '',
  department: '',
  title: '',
  research_field: '',
  phone: '',
  created_at: '',
  last_login: '',
  updated_at: '',
})

const loadUser = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(`http://localhost:3002/api/admin/users/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (response.data.success) {
      userForm.value = response.data.data
      delete userForm.value.password // 不显示密码
    }
  } catch (error: any) {
    console.error('加载用户信息失败:', error)
    alert('加载用户信息失败')
  } finally {
    loading.value = false
  }
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

const saveUser = async () => {
  saving.value = true
  try {
    const token = localStorage.getItem('token')

    // 如果没有修改密码，移除密码字段
    const formData = { ...userForm.value }
    if (!formData.password) {
      delete formData.password
    }

    await axios.put(`http://localhost:3002/api/admin/users/${userId}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    alert('用户信息更新成功')
    router.push(`/admin/users/${userId}`)
  } catch (error: any) {
    console.error('更新用户信息失败:', error)
    alert(error.response?.data?.error || '更新失败')
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  router.push(`/admin/users/${userId}`)
}

onMounted(() => {
  loadUser()
})
</script>

<style scoped>
.user-edit {
  padding: 24px;
  background: #f8f9fa;
  min-height: 100vh;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  background: none;
  border: none;
  color: #b31b1b;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 6px;
}

.back-btn:hover {
  background: rgba(179,27,27,0.06);
}

.edit-form {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.form-section:last-child {
  border-bottom: none;
}

.form-section h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #1a1a1a;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group select {
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #b31b1b;
}

.readonly-field {
  padding: 10px 12px;
  background: #f5f5f5;
  border-radius: 6px;
  color: #666;
  font-size: 14px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}

.btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s;
}

.btn-primary {
  background: #b31b1b;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #c93030;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #f0f0f0;
  color: #666;
}

.btn-secondary:hover {
  background: #e0e0e0;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loading-spinner {
  width: 50px;
  height: 50px;
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

@media (max-width: 768px) {
  .edit-form {
    padding: 20px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
