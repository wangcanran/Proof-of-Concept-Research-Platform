<!-- NotificationCenter.vue -->
<template>
  <div class="notification-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goToDashboard" type="primary" plain icon="el-icon-s-home" size="small">
          返回仪表板
        </el-button>
        <h1>通知中心</h1>
      </div>
      <div class="header-actions">
        <el-badge :value="unreadCount" :hidden="unreadCount === 0" type="danger">
          <span>未读通知</span>
        </el-badge>
        <el-button @click="markAllAsRead" :disabled="unreadCount === 0"> 全部标记为已读 </el-button>
        <el-button @click="clearReadNotifications" :disabled="readCount === 0">
          清空已读
        </el-button>
      </div>
    </div>

    <!-- 过滤条件 -->
    <el-card class="filter-card">
      <div class="filter-container">
        <el-select v-model="filter.type" placeholder="通知类型" clearable style="width: 150px">
          <el-option label="全部" value="" />
          <el-option label="系统通知" value="system" />
          <el-option label="项目通知" value="project" />
          <el-option label="评审通知" value="review" />
          <el-option label="经费通知" value="funding" />
          <el-option label="支出通知" value="expenditure" />
          <el-option label="成果通知" value="achievement" />
          <el-option label="提醒通知" value="reminder" />
        </el-select>

        <el-select v-model="filter.priority" placeholder="优先级" clearable style="width: 120px">
          <el-option label="全部" value="" />
          <el-option label="紧急" value="urgent" />
          <el-option label="高" value="high" />
          <el-option label="中" value="medium" />
          <el-option label="低" value="low" />
        </el-select>

        <el-checkbox v-model="filter.unread_only"> 仅显示未读 </el-checkbox>

        <el-date-picker
          v-model="filter.start_date"
          type="date"
          placeholder="开始日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 150px"
          clearable
        />
        <el-date-picker
          v-model="filter.end_date"
          type="date"
          placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 150px"
          clearable
        />

        <el-button type="primary" @click="applyFilter" :loading="loading"> 筛选 </el-button>
        <el-button @click="resetFilter">重置</el-button>
      </div>
    </el-card>

    <!-- 通知列表 -->
    <el-card>
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="5" animated />
      </div>

      <div v-else>
        <el-table :data="filteredNotifications" style="width: 100%" v-loading="loading">
          <el-table-column width="60">
            <template #default="{ row }">
              <el-badge is-dot :type="getPriorityBadgeType(row.priority)" :hidden="row.is_read">
                <div class="notification-icon">{{ getNotificationIcon(row.type) }}</div>
              </el-badge>
            </template>
          </el-table-column>

          <el-table-column prop="title" label="标题" min-width="180">
            <template #default="{ row }">
              <div :class="['notification-title', { unread: !row.is_read }]">
                {{ row.title }}
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="description" label="内容" min-width="250">
            <template #default="{ row }">
              <div class="notification-description">{{ row.description || row.content }}</div>
            </template>
          </el-table-column>

          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)" size="small">
                {{ getTypeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="priority" label="优先级" width="80">
            <template #default="{ row }">
              <el-tag :type="getPriorityTagType(row.priority)" size="small">
                {{ getPriorityText(row.priority) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="created_at" label="时间" width="120">
            <template #default="{ row }">
              <div class="notification-time">
                {{ formatTime(row.created_at || row.send_at) }}
              </div>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="action-buttons">
                <el-button
                  v-if="!row.is_read"
                  type="text"
                  size="small"
                  @click="markAsRead(row.id)"
                  :loading="row.loading"
                >
                  标记已读
                </el-button>
                <el-button type="text" size="small" @click="viewNotification(row)">
                  查看详情
                </el-button>
                <el-popconfirm title="确定要删除这条通知吗？" @confirm="deleteNotification(row.id)">
                  <template #reference>
                    <el-button type="text" size="small" class="delete-btn"> 删除 </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div v-if="filteredNotifications.length > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :total="filteredNotifications.length"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>

        <!-- 空状态 -->
        <div v-if="filteredNotifications.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无通知或未找到符合条件的通知" />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

// 数据
const allNotifications = ref([]) // 存储所有通知数据
const displayedNotifications = ref([]) // 当前显示的通知数据
const loading = ref(false)
const filter = ref({
  type: '',
  priority: '',
  unread_only: false,
  start_date: '',
  end_date: '',
})
const pagination = ref({
  page: 1,
  limit: 20,
  total: 0,
})

// 计算属性
const unreadCount = computed(() => {
  return allNotifications.value.filter((n) => !n.is_read).length
})

const readCount = computed(() => {
  return allNotifications.value.filter((n) => n.is_read).length
})

// 过滤后的通知（本地筛选）
const filteredNotifications = computed(() => {
  let filtered = [...allNotifications.value]

  // 按类型筛选
  if (filter.value.type) {
    filtered = filtered.filter((n) => n.type === filter.value.type)
  }

  // 按优先级筛选
  if (filter.value.priority) {
    filtered = filtered.filter((n) => n.priority === filter.value.priority)
  }

  // 仅显示未读
  if (filter.value.unread_only) {
    filtered = filtered.filter((n) => !n.is_read)
  }

  // 按日期筛选
  if (filter.value.start_date) {
    const startDate = new Date(filter.value.start_date)
    filtered = filtered.filter((n) => {
      const notificationDate = new Date(n.created_at)
      return notificationDate >= startDate
    })
  }

  if (filter.value.end_date) {
    const endDate = new Date(filter.value.end_date)
    endDate.setHours(23, 59, 59, 999) // 设置为当天结束时间
    filtered = filtered.filter((n) => {
      const notificationDate = new Date(n.created_at)
      return notificationDate <= endDate
    })
  }

  // 更新分页总数
  pagination.value.total = filtered.length

  // 分页处理
  const startIndex = (pagination.value.page - 1) * pagination.value.limit
  const endIndex = startIndex + pagination.value.limit

  return filtered.slice(startIndex, endIndex)
})

// 应用筛选
const applyFilter = () => {
  pagination.value.page = 1 // 重置到第一页
  // 由于使用了计算属性，过滤会自动应用
}

// 重置筛选条件
const resetFilter = () => {
  filter.value = {
    type: '',
    priority: '',
    unread_only: false,
    start_date: '',
    end_date: '',
  }
  pagination.value.page = 1
}

// 返回仪表板
const goToDashboard = () => {
  // 尝试跳转到仪表板页面，如果不存在则返回首页
  router.push('/dashboard').catch(() => {
    router.push('/')
  })
}

// 加载通知
const loadNotifications = async () => {
  loading.value = true

  try {
    console.log('📡 正在加载通知中心数据...')

    // 构建请求参数
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
    }

    console.log('请求参数:', params)

    // 尝试不同的API端点
    const endpoints = [
      '/api/notifications',
      '/api/messages/notifications',
      '/api/user/notifications',
    ]

    let response = null
    for (const endpoint of endpoints) {
      try {
        console.log(`尝试API端点: ${endpoint}`)
        const res = await request.get(endpoint, { params })
        if (res && (res.success || res.data)) {
          response = res
          console.log(`✅ 成功使用端点: ${endpoint}`)
          break
        }
      } catch (e) {
        console.log(`端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (!response) {
      console.log('所有API端点都失败了，使用模拟数据')
      showMockNotifications()
      return
    }

    const data = response.data?.data || response.data || response
    console.log('通知API返回数据:', data)

    // 处理不同类型的响应结构
    let notificationsArray = []
    if (Array.isArray(data)) {
      // 如果返回的是数组
      notificationsArray = data
    } else if (data.notifications && Array.isArray(data.notifications)) {
      // 如果返回的对象中有notifications数组
      notificationsArray = data.notifications
    } else if (data.items && Array.isArray(data.items)) {
      // 如果返回的对象中有items数组
      notificationsArray = data.items
    } else if (data.list && Array.isArray(data.list)) {
      // 如果返回的对象中有list数组
      notificationsArray = data.list
    } else if (data.data && Array.isArray(data.data)) {
      // 嵌套的data属性
      notificationsArray = data.data
    } else {
      console.warn('无法识别的数据格式:', data)
      showMockNotifications()
      return
    }

    // 处理通知数据
    allNotifications.value = notificationsArray.map(processNotificationData)
    console.log(`✅ 加载通知成功，共 ${allNotifications.value.length} 条`)
  } catch (error) {
    console.error('加载通知失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      localStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 404) {
      ElMessage.error('通知API不存在，请联系管理员')
      showMockNotifications()
    } else {
      ElMessage.error('加载通知失败：' + (error.message || '网络错误'))
      showMockNotifications()
    }
  } finally {
    loading.value = false
  }
}

// 处理通知数据
const processNotificationData = (item) => {
  return {
    id: item.id || item.notification_id || '',
    title: item.title || item.subject || '通知',
    description: item.description || item.content || item.message || '',
    type: item.type || item.notification_type || 'info',
    priority: item.priority || 'medium',
    is_read: item.is_read || item.read || false,
    created_at: item.created_at || item.send_at || item.created_time || '',
    action_url: item.action_url || item.url || item.link || '',
    related_id: item.related_id || item.target_id || '',
    related_type: item.related_type || item.target_type || '',
    loading: false,
  }
}

// 显示模拟数据（备用）
const showMockNotifications = () => {
  allNotifications.value = [
    {
      id: '1',
      title: '项目评审通知',
      description: '您的项目已进入专家评审阶段，请关注评审进度',
      type: 'project',
      priority: 'high',
      is_read: false,
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      action_url: '/projects/2',
      related_id: '2',
      related_type: 'project',
    },
    {
      id: '2',
      title: '系统更新提醒',
      description: '系统将于本周日进行维护升级，期间将暂停服务',
      type: 'system',
      priority: 'medium',
      is_read: true,
      created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      action_url: '',
      related_id: '',
      related_type: '',
    },
    {
      id: '3',
      title: '经费申请批复',
      description: '您的经费申请已审核通过，请及时查收',
      type: 'funding',
      priority: 'medium',
      is_read: false,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      action_url: '/funds/applications/fund001',
      related_id: 'fund001',
      related_type: 'funding',
    },
    {
      id: '4',
      title: '支出审核提醒',
      description: '您有一条支出申请待审核，请及时处理',
      type: 'expenditure',
      priority: 'urgent',
      is_read: false,
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      action_url: '/expenditures/audit',
      related_id: '',
      related_type: '',
    },
    {
      id: '5',
      title: '成果审核通过',
      description: '您的科研成果已通过审核，可在成果管理中查看',
      type: 'achievement',
      priority: 'medium',
      is_read: true,
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      action_url: '/achievements/1',
      related_id: '1',
      related_type: 'achievement',
    },
  ]
}

const markAsRead = async (notificationId) => {
  try {
    // 更新本地状态
    const index = allNotifications.value.findIndex((n) => n.id === notificationId)
    if (index !== -1) {
      allNotifications.value[index].loading = true
    }

    // 尝试不同的API端点
    const endpoints = [
      `/api/notifications/${notificationId}/read`,
      `/api/notifications/${notificationId}/mark-read`,
      `/api/messages/${notificationId}/read`,
    ]

    let success = false
    for (const endpoint of endpoints) {
      try {
        const response = await request.put(endpoint)
        if (response && response.success) {
          success = true
          break
        }
      } catch (e) {
        console.log(`端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (success) {
      ElMessage.success('通知已标记为已读')

      // 更新本地状态
      if (index !== -1) {
        allNotifications.value[index].is_read = true
        allNotifications.value[index].read_at = new Date().toISOString()
      }
    } else {
      // 如果API都失败，只更新本地状态
      if (index !== -1) {
        allNotifications.value[index].is_read = true
        allNotifications.value[index].read_at = new Date().toISOString()
      }
      ElMessage.success('通知已标记为已读（本地）')
    }
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('标记已读失败：' + (error.message || '网络错误'))
  } finally {
    // 重置loading状态
    const index = allNotifications.value.findIndex((n) => n.id === notificationId)
    if (index !== -1) {
      allNotifications.value[index].loading = false
    }
  }
}

const markAllAsRead = async () => {
  try {
    // 尝试不同的API端点
    const endpoints = [
      '/api/notifications/mark-all-read',
      '/api/notifications/read-all',
      '/api/messages/mark-all-read',
    ]

    let success = false
    for (const endpoint of endpoints) {
      try {
        const response = await request.put(endpoint)
        if (response && response.success) {
          success = true
          break
        }
      } catch (e) {
        console.log(`端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (success) {
      ElMessage.success('所有通知已标记为已读')

      // 更新本地所有通知状态
      allNotifications.value.forEach((n) => {
        n.is_read = true
        n.read_at = new Date().toISOString()
      })
    } else {
      // 如果API都失败，只更新本地状态
      allNotifications.value.forEach((n) => {
        n.is_read = true
        n.read_at = new Date().toISOString()
      })
      ElMessage.success('所有通知已标记为已读（本地）')
    }
  } catch (error) {
    console.error('标记所有已读失败:', error)
    ElMessage.error('操作失败：' + (error.message || '网络错误'))
  }
}

const clearReadNotifications = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有已读通知吗？此操作不可恢复', '确认清空', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 尝试不同的API端点
    const endpoints = [
      '/api/notifications/clear-read',
      '/api/notifications/delete-read',
      '/api/messages/clear-read',
    ]

    let success = false
    for (const endpoint of endpoints) {
      try {
        const response = await request.delete(endpoint)
        if (response && response.success) {
          success = true
          break
        }
      } catch (e) {
        console.log(`端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (success) {
      ElMessage.success('已读通知已清空')

      // 重新加载通知列表
      loadNotifications()
    } else {
      // 如果API都失败，只更新本地状态
      allNotifications.value = allNotifications.value.filter((n) => !n.is_read)
      ElMessage.success('已读通知已清空（本地）')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空已读通知失败:', error)
      ElMessage.error('操作失败：' + (error.message || '网络错误'))
    }
  }
}

const deleteNotification = async (notificationId) => {
  try {
    // 尝试不同的API端点
    const endpoints = [`/api/notifications/${notificationId}`, `/api/messages/${notificationId}`]

    let success = false
    for (const endpoint of endpoints) {
      try {
        const response = await request.delete(endpoint)
        if (response && response.success) {
          success = true
          break
        }
      } catch (e) {
        console.log(`端点 ${endpoint} 失败:`, e.message)
        continue
      }
    }

    if (success) {
      ElMessage.success('通知已删除')

      // 从列表中移除
      allNotifications.value = allNotifications.value.filter((n) => n.id !== notificationId)
    } else {
      // 如果API都失败，只更新本地状态
      allNotifications.value = allNotifications.value.filter((n) => n.id !== notificationId)
      ElMessage.success('通知已删除（本地）')
    }
  } catch (error) {
    console.error('删除通知失败:', error)
    ElMessage.error('删除失败：' + (error.message || '网络错误'))
  }
}

const viewNotification = (notification) => {
  // 先标记为已读
  if (!notification.is_read) {
    markAsRead(notification.id)
  }

  // 如果有action_url，跳转到相关页面
  if (notification.action_url) {
    router.push(notification.action_url)
    return
  }

  // 如果有相关数据，跳转到相关页面
  if (notification.related_id && notification.related_type) {
    switch (notification.related_type) {
      case 'project':
        router.push(`/projects/detail/${notification.related_id}`)
        break
      case 'achievement':
        router.push(`/achievements/${notification.related_id}/detail`)
        break
      case 'funding':
        router.push(`/funds/applications/${notification.related_id}`)
        break
      case 'expenditure':
        router.push(`/expenditures/${notification.related_id}`)
        break
      default:
        showNotificationDetail(notification)
    }
  } else {
    showNotificationDetail(notification)
  }
}

const showNotificationDetail = (notification) => {
  ElMessageBox.alert(
    `
    <div class="notification-detail">
      <h3>${notification.title}</h3>
      <p><strong>类型：</strong>${getTypeText(notification.type)}</p>
      <p><strong>优先级：</strong>${getPriorityText(notification.priority)}</p>
      <p><strong>时间：</strong>${formatTime(notification.created_at)}</p>
      <p><strong>状态：</strong>${notification.is_read ? '已读' : '未读'}</p>
      <div class="content-section">
        <strong>内容：</strong>
        <div class="content-text">${notification.description || '无详细内容'}</div>
      </div>
      ${notification.related_id ? `<p><strong>关联ID：</strong>${notification.related_id}</p>` : ''}
      ${notification.related_type ? `<p><strong>关联类型：</strong>${getTypeText(notification.related_type)}</p>` : ''}
    </div>
    `,
    '通知详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'notification-detail-modal',
      width: '500px',
    },
  )
}

const handleSizeChange = (size) => {
  pagination.value.limit = size
  pagination.value.page = 1
}

const handleCurrentChange = (page) => {
  pagination.value.page = page
}

// 辅助函数
const getNotificationIcon = (type) => {
  const iconMap = {
    system: '⚙️',
    project: '📋',
    review: '⭐',
    funding: '💰',
    expenditure: '💳',
    achievement: '🏆',
    reminder: '⏰',
    warning: '⚠️',
    info: 'ℹ️',
    success: '✅',
    error: '❌',
  }
  return iconMap[type] || '📢'
}

const getTypeText = (type) => {
  const typeMap = {
    system: '系统通知',
    project: '项目通知',
    review: '评审通知',
    funding: '经费通知',
    expenditure: '支出通知',
    achievement: '成果通知',
    reminder: '提醒通知',
    warning: '警告通知',
    info: '信息通知',
    success: '成功通知',
    error: '错误通知',
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    system: 'info',
    project: '',
    review: 'warning',
    funding: 'success',
    expenditure: '',
    achievement: 'success',
    reminder: 'warning',
    warning: 'danger',
    info: 'info',
    success: 'success',
    error: 'danger',
  }
  return typeMap[type] || 'info'
}

const getPriorityText = (priority) => {
  const priorityMap = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    low: '低',
  }
  return priorityMap[priority] || priority
}

const getPriorityTagType = (priority) => {
  const priorityMap = {
    urgent: 'danger',
    high: 'warning',
    medium: '',
    low: 'info',
  }
  return priorityMap[priority] || 'info'
}

const getPriorityBadgeType = (priority) => {
  const priorityMap = {
    urgent: 'danger',
    high: 'warning',
    medium: 'primary',
    low: 'success',
  }
  return priorityMap[priority] || 'primary'
}

const formatTime = (dateString) => {
  if (!dateString) return '-'
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString

    const now = new Date()
    const diffMs = now - date
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) {
      return '刚刚'
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分钟前`
    } else if (diffHours < 24) {
      return `${diffHours}小时前`
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
    }
  } catch {
    return dateString
  }
}

// 生命周期
onMounted(() => {
  console.log('🚀 NotificationCenter 组件已挂载')
  loadNotifications()
})
</script>

<style scoped>
.notification-center {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h1 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 15px;
}

.filter-card {
  margin-bottom: 20px;
}

.filter-container {
  display: flex;
  gap: 15px;
  align-items: center;
  flex-wrap: wrap;
}

.loading-container {
  padding: 40px;
  text-align: center;
}

.notification-icon {
  font-size: 24px;
  text-align: center;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-title {
  font-weight: 500;
  font-size: 14px;
}

.notification-title.unread {
  font-weight: bold;
  color: #303133;
}

.notification-description {
  font-size: 13px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
}

.notification-time {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons .el-button {
  padding: 2px 6px;
  min-height: auto;
  font-size: 12px;
}

.delete-btn {
  color: #f56c6c;
}

.delete-btn:hover {
  color: #f78989;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #f0f0f0;
  background: white;
  padding: 16px;
  border-radius: 8px;
}

.empty-state {
  padding: 60px 0;
  text-align: center;
  background: white;
  border-radius: 8px;
  margin-top: 20px;
}

/* 详情弹窗样式 */
:deep(.notification-detail-modal) .el-message-box__content {
  max-height: 400px;
  overflow-y: auto;
  padding: 20px;
}

.notification-detail h3 {
  margin-top: 0;
  color: #303133;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.notification-detail p {
  margin: 10px 0;
  color: #606266;
  line-height: 1.6;
}

.content-section {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px dashed #e4e7ed;
}

.content-text {
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f7fa;
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
  font-size: 14px;
}

@media (max-width: 768px) {
  .notification-center {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }

  .header-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    width: 100%;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .filter-container {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-container .el-select,
  .filter-container .el-date-picker {
    width: 100%;
  }

  .action-buttons {
    flex-direction: column;
    gap: 5px;
  }

  .notification-description {
    max-width: 200px;
  }
}
</style>
