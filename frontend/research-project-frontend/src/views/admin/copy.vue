<!-- src/views/admin/AdminDashboard.vue -->
<template>
  <div class="admin-dashboard">
    <!-- 顶部导航栏 -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="mobile-menu-btn" @click="toggleMobileMenu">
          <span class="icon">☰</span>
        </div>
        <h1 class="logo">科研项目管理系统</h1>
        <div class="breadcrumb">
          <span class="current-page">管理员控制台</span>
        </div>
      </div>
      <div class="header-right">
        <div class="user-menu">
          <div class="header-actions">
            <button class="icon-btn" @click="refreshData" title="刷新">
              <span class="icon">🔄</span>
            </button>
            <button class="icon-btn" @click="toggleTheme" title="切换主题">
              <span class="icon">{{ isDarkMode ? '☀️' : '🌙' }}</span>
            </button>
            <div class="notifications-dropdown">
              <button class="icon-btn notification-btn" @click="toggleNotifications" title="通知">
                <span class="icon">🔔</span>
                <span v-if="unreadCount > 0" class="notification-count">{{ unreadCount }}</span>
              </button>
              <div v-if="showNotificationsDropdown" class="notifications-dropdown-content">
                <div class="notifications-dropdown-header">
                  <h4>最新通知</h4>
                  <button @click="markAllAsRead" v-if="unreadCount > 0">标记已读</button>
                </div>
                <div class="notifications-dropdown-list">
                  <div
                    v-for="notification in recentNotifications"
                    :key="notification.id"
                    class="notification-dropdown-item"
                    @click="openNotification(notification)"
                  >
                    <div class="notification-dropdown-icon">{{ notification.icon }}</div>
                    <div class="notification-dropdown-content">
                      <div class="notification-dropdown-title">{{ notification.title }}</div>
                      <div class="notification-dropdown-time">{{ notification.time }}</div>
                    </div>
                    <span class="unread-dot-small" v-if="!notification.read"></span>
                  </div>
                  <div v-if="recentNotifications.length === 0" class="no-notifications">
                    暂无通知
                  </div>
                </div>
                <div class="notifications-dropdown-footer">
                  <router-link to="/notifications" @click="showNotificationsDropdown = false">
                    查看全部
                  </router-link>
                </div>
              </div>
            </div>
            <div class="user-info-mini">
              <div class="user-avatar-mini">{{ userInitial }}</div>
              <div class="user-details">
                <div class="user-name-mini">{{ userName }}</div>
                <div class="user-role-mini">系统管理员</div>
              </div>
            </div>
            <button class="logout-btn" @click="handleLogout">
              <span class="icon">🚪</span>
              退出
            </button>
          </div>
        </div>
      </div>
    </header>

    <div class="dashboard-content">
      <!-- 侧边栏导航 -->
      <aside class="sidebar" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <div class="sidebar-header">
          <h3 v-if="!sidebarCollapsed" class="sidebar-title">管理员控制台</h3>
          <button class="sidebar-toggle" @click="toggleSidebar">
            {{ sidebarCollapsed ? '→' : '←' }}
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">控制面板</h4>
            <router-link to="/admin/dashboard" class="nav-link" active-class="active">
              <span class="nav-icon">📊</span>
              <span v-if="!sidebarCollapsed" class="nav-text">仪表板</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">用户管理</h4>
            <router-link to="/admin/users" class="nav-link" active-class="active">
              <span class="nav-icon">👥</span>
              <span v-if="!sidebarCollapsed" class="nav-text">用户列表</span>
            </router-link>
            <router-link to="/admin/users/create" class="nav-link" active-class="active">
              <span class="nav-icon">➕</span>
              <span v-if="!sidebarCollapsed" class="nav-text">添加用户</span>
            </router-link>
            <router-link to="/admin/roles" class="nav-link" active-class="active">
              <span class="nav-icon">🎭</span>
              <span v-if="!sidebarCollapsed" class="nav-text">角色权限</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">项目管理</h4>
            <router-link to="/admin/projects" class="nav-link" active-class="active">
              <span class="nav-icon">📋</span>
              <span v-if="!sidebarCollapsed" class="nav-text">所有项目</span>
            </router-link>
            <router-link to="/admin/projects/pending" class="nav-link" active-class="active">
              <span class="nav-icon">⏳</span>
              <span v-if="!sidebarCollapsed" class="nav-text">待审核项目</span>
              <span v-if="!sidebarCollapsed && pendingStats.projects > 0" class="nav-badge">
                {{ pendingStats.projects }}
              </span>
            </router-link>
            <router-link to="/admin/projects/statistics" class="nav-link" active-class="active">
              <span class="nav-icon">📈</span>
              <span v-if="!sidebarCollapsed" class="nav-text">项目统计</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">经费管理</h4>
            <router-link to="/admin/funding" class="nav-link" active-class="active">
              <span class="nav-icon">💰</span>
              <span v-if="!sidebarCollapsed" class="nav-text">经费申请</span>
              <span v-if="!sidebarCollapsed && pendingStats.funding > 0" class="nav-badge">
                {{ pendingStats.funding }}
              </span>
            </router-link>
            <router-link to="/admin/expenditures" class="nav-link" active-class="active">
              <span class="nav-icon">💸</span>
              <span v-if="!sidebarCollapsed" class="nav-text">经费支出</span>
              <span v-if="!sidebarCollapsed && pendingStats.expenditures > 0" class="nav-badge">
                {{ pendingStats.expenditures }}
              </span>
            </router-link>
            <router-link to="/admin/finance-reports" class="nav-link" active-class="active">
              <span class="nav-icon">📊</span>
              <span v-if="!sidebarCollapsed" class="nav-text">财务报告</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">成果管理</h4>
            <router-link to="/admin/achievements" class="nav-link" active-class="active">
              <span class="nav-icon">🏆</span>
              <span v-if="!sidebarCollapsed" class="nav-text">成果列表</span>
              <span v-if="!sidebarCollapsed && pendingStats.achievements > 0" class="nav-badge">
                {{ pendingStats.achievements }}
              </span>
            </router-link>
            <router-link to="/admin/transfers" class="nav-link" active-class="active">
              <span class="nav-icon">🔄</span>
              <span v-if="!sidebarCollapsed" class="nav-text">成果转化</span>
            </router-link>
          </div>

          <div class="nav-section">
            <h4 v-if="!sidebarCollapsed" class="nav-section-title">系统管理</h4>
            <router-link to="/admin/system/config" class="nav-link" active-class="active">
              <span class="nav-icon">⚙️</span>
              <span v-if="!sidebarCollapsed" class="nav-text">系统配置</span>
            </router-link>
            <router-link to="/admin/logs" class="nav-link" active-class="active">
              <span class="nav-icon">📜</span>
              <span v-if="!sidebarCollapsed" class="nav-text">系统日志</span>
            </router-link>
          </div>
        </nav>

        <div class="sidebar-footer">
          <div class="user-info-mini">
            <div class="user-avatar-mini">{{ userInitial }}</div>
            <div v-if="!sidebarCollapsed" class="user-details">
              <div class="user-name-mini">{{ userName }}</div>
              <div class="user-role-mini">系统管理员</div>
            </div>
          </div>
        </div>
      </aside>

      <!-- 主内容区域 -->
      <main class="main-content" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
        <!-- 欢迎横幅 -->
        <div class="welcome-section">
          <div class="welcome-card admin-banner">
            <div class="welcome-content">
              <h2 class="welcome-title">管理员控制台</h2>
              <p class="welcome-subtitle">欢迎回来，{{ userName }}！今天是 {{ currentDate }}</p>
              <div class="quick-stats">
                <div class="stat-badge">
                  <span class="stat-value">{{ summary.totalUsers || 0 }}</span>
                  <span class="stat-label">总用户数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ summary.totalProjects || 0 }}</span>
                  <span class="stat-label">总项目数</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ summary.pendingReviews || 0 }}</span>
                  <span class="stat-label">待审核</span>
                </div>
                <div class="stat-badge">
                  <span class="stat-value">{{ formatFunds(summary.totalBudget) }}</span>
                  <span class="stat-label">总预算</span>
                </div>
              </div>
            </div>
            <div class="welcome-illustration">
              <div class="illustration-icon">⚙️</div>
            </div>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="loading" class="loading-overlay">
          <div class="loading-spinner"></div>
          <div class="loading-text">正在加载数据...</div>
        </div>

        <!-- 三列布局 -->
        <div class="dashboard-layout">
          <!-- 左列：系统概览 -->
          <div class="dashboard-column">
            <div class="projects-overview card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📊</span>
                  系统概览
                </h3>
                <button class="refresh-stat-btn" @click="refreshData" title="刷新统计">🔄</button>
              </div>

              <!-- 用户统计 -->
              <div class="overview-card" @click="navigateTo('users')">
                <div class="overview-icon" style="background: #e6f7ff; color: #1890ff">👥</div>
                <div class="overview-content">
                  <h4>用户统计</h4>
                  <div class="overview-stats">
                    <div class="stat-row">
                      <span>申请人</span>
                      <span class="stat-number">{{ userStats.applicants || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>评审专家</span>
                      <span class="stat-number">{{ userStats.reviewers || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>科研助理</span>
                      <span class="stat-number">{{ userStats.assistants || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>管理员</span>
                      <span class="stat-number">{{ userStats.admins || 0 }}</span>
                    </div>
                  </div>
                  <div class="overview-footer">
                    <span class="trend" :class="getTrendClass(userStats.userGrowth)">
                      {{ userStats.userGrowth > 0 ? '+' : '' }}{{ userStats.userGrowth || 0 }}%
                    </span>
                    <span class="trend-label">本月增长</span>
                  </div>
                </div>
              </div>

              <!-- 项目状态 -->
              <div class="overview-card" @click="navigateTo('projects')">
                <div class="overview-icon" style="background: #f6ffed; color: #52c41a">📋</div>
                <div class="overview-content">
                  <h4>项目状态</h4>
                  <div class="overview-stats">
                    <div class="stat-row">
                      <span>草稿</span>
                      <span class="stat-number">{{ projectStats.draft || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>待审核</span>
                      <span class="stat-number">{{ projectStats.under_review || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>进行中</span>
                      <span class="stat-number">{{ projectStats.in_progress || 0 }}</span>
                    </div>
                    <div class="stat-row">
                      <span>已完成</span>
                      <span class="stat-number">{{ projectStats.completed || 0 }}</span>
                    </div>
                  </div>
                  <div class="overview-footer">
                    <span class="trend" :class="getTrendClass(projectStats.projectGrowth)">
                      {{ projectStats.projectGrowth > 0 ? '+' : ''
                      }}{{ projectStats.projectGrowth || 0 }}%
                    </span>
                    <span class="trend-label">本月增长</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 中列：快速操作 + 待处理任务 -->
          <div class="dashboard-column">
            <!-- 快速操作 -->
            <div class="quick-actions-section card-section">
              <h3 class="section-title">
                <span class="section-icon">⚡</span>
                快速操作
              </h3>
              <div class="actions-grid">
                <button class="action-card" @click="navigateTo('create-user')">
                  <div class="action-icon">👥</div>
                  <div class="action-content">
                    <h4>添加用户</h4>
                    <p>创建新用户账号</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('projects')">
                  <div class="action-icon">📋</div>
                  <div class="action-content">
                    <h4>项目管理</h4>
                    <p>查看所有项目</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('funding')">
                  <div class="action-icon">💰</div>
                  <div class="action-content">
                    <h4>经费管理</h4>
                    <p>审批经费申请</p>
                  </div>
                </button>
                <button class="action-card" @click="navigateTo('logs')">
                  <div class="action-icon">📜</div>
                  <div class="action-content">
                    <h4>系统日志</h4>
                    <p>查看操作记录</p>
                  </div>
                </button>
              </div>
            </div>

            <!-- 待处理任务 -->
            <div class="dashboard-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">⏳</span>
                  待处理任务
                </h3>
                <span class="badge-count">{{ pendingTasks.total }} 项</span>
              </div>
              <div class="task-grid">
                <!-- 待审核项目 -->
                <div
                  class="task-card"
                  v-if="pendingTasks.projects > 0"
                  @click="goToPendingProjects"
                >
                  <div class="task-header">
                    <div class="task-title">待审核项目</div>
                    <div class="task-count">{{ pendingTasks.projects || 0 }}</div>
                  </div>
                  <div class="task-description">有新提交的项目等待审核</div>
                  <div class="task-actions">
                    <button class="task-btn">前往审核</button>
                  </div>
                </div>

                <!-- 待审核经费 -->
                <div class="task-card" v-if="pendingTasks.funding > 0" @click="goToPendingFunding">
                  <div class="task-header">
                    <div class="task-title">待审核经费</div>
                    <div class="task-count">{{ pendingTasks.funding || 0 }}</div>
                  </div>
                  <div class="task-description">有新的经费申请等待审核</div>
                  <div class="task-actions">
                    <button class="task-btn">前往审核</button>
                  </div>
                </div>

                <!-- 待审核支出 -->
                <div
                  class="task-card"
                  v-if="pendingTasks.expenditures > 0"
                  @click="goToPendingExpenditures"
                >
                  <div class="task-header">
                    <div class="task-title">待审核支出</div>
                    <div class="task-count">{{ pendingTasks.expenditures || 0 }}</div>
                  </div>
                  <div class="task-description">有新的经费支出等待审核</div>
                  <div class="task-actions">
                    <button class="task-btn">前往审核</button>
                  </div>
                </div>

                <!-- 待审核成果 -->
                <div
                  class="task-card"
                  v-if="pendingTasks.achievements > 0"
                  @click="goToPendingAchievements"
                >
                  <div class="task-header">
                    <div class="task-title">待审核成果</div>
                    <div class="task-count">{{ pendingTasks.achievements || 0 }}</div>
                  </div>
                  <div class="task-description">有新提交的成果等待审核</div>
                  <div class="task-actions">
                    <button class="task-btn">前往审核</button>
                  </div>
                </div>

                <div v-if="pendingTasks.total === 0" class="empty-state">
                  <span>🎉 暂无待处理任务</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：数据统计 + 最近活动 -->
          <div class="dashboard-column">
            <!-- 数据统计 -->
            <div class="data-statistics-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📈</span>
                  数据统计
                </h3>
                <button class="view-all-btn" @click="navigateTo('reports')">查看报表 →</button>
              </div>

              <div class="stats-grid">
                <!-- 经费统计 -->
                <div class="stat-card enhanced">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #fa8c16, #ffa940)"
                      >
                        <span class="stat-icon">💰</span>
                      </div>
                      <div class="stat-trend-container">
                        <span class="stat-trend" :class="getTrendClass(financeStats.fundGrowth)">
                          {{ financeStats.fundGrowth > 0 ? '+' : ''
                          }}{{ financeStats.fundGrowth || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value funding-value">
                      {{ formatFunds(financeStats.totalBudget) }}
                    </div>
                    <div class="stat-label">总经费额度</div>
                    <div class="funding-breakdown">
                      <div class="breakdown-item">
                        <span class="breakdown-label">已分配</span>
                        <span class="breakdown-value">{{
                          formatFunds(financeStats.allocated || 0)
                        }}</span>
                      </div>
                      <div class="breakdown-item">
                        <span class="breakdown-label">已支出</span>
                        <span class="breakdown-value">{{
                          formatFunds(financeStats.expended || 0)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 成果统计 -->
                <div class="stat-card enhanced">
                  <div class="stat-header">
                    <div class="stat-icon-container">
                      <div
                        class="stat-icon-bg"
                        style="background: linear-gradient(135deg, #722ed1, #9254de)"
                      >
                        <span class="stat-icon">🏆</span>
                      </div>
                      <div class="stat-trend-container">
                        <span
                          class="stat-trend"
                          :class="getTrendClass(achievementStats.achievementGrowth)"
                        >
                          {{ achievementStats.achievementGrowth > 0 ? '+' : ''
                          }}{{ achievementStats.achievementGrowth || 0 }}%
                        </span>
                        <span class="trend-label">月同比</span>
                      </div>
                    </div>
                  </div>
                  <div class="stat-body">
                    <div class="stat-value">{{ achievementStats.total || 0 }}</div>
                    <div class="stat-label">总成果数</div>
                    <div class="achievement-breakdown">
                      <div class="breakdown-item">
                        <span class="breakdown-label">论文</span>
                        <span class="breakdown-value">{{ achievementStats.papers || 0 }}</span>
                      </div>
                      <div class="breakdown-item">
                        <span class="breakdown-label">专利</span>
                        <span class="breakdown-value">{{ achievementStats.patents || 0 }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 最近用户 -->
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">👥</span>
                  最近用户
                </h3>
                <button class="view-all-btn" @click="navigateTo('users')">查看全部 →</button>
              </div>

              <div class="user-list">
                <div
                  v-for="user in recentUsers"
                  :key="user.id"
                  class="user-item"
                  @click="viewUser(user.id)"
                >
                  <div class="user-avatar-small">{{ user.name.charAt(0).toUpperCase() }}</div>
                  <div class="user-content">
                    <div class="user-header">
                      <h4 class="user-name">{{ user.name }}</h4>
                      <span class="user-role-tag">{{ getRoleText(user.role) }}</span>
                    </div>
                    <div class="user-meta">
                      <span>{{ user.department || '未设置部门' }}</span>
                      <span
                        class="user-status"
                        :class="user.status === 'active' ? 'active' : 'inactive'"
                      >
                        {{ user.status === 'active' ? '活跃' : '非活跃' }}
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="recentUsers.length === 0" class="empty-state">
                  <div class="empty-icon">👤</div>
                  <p>暂无用户数据</p>
                </div>
              </div>
            </div>

            <!-- 最近日志 -->
            <div class="notifications-section card-section">
              <div class="section-header">
                <h3 class="section-title">
                  <span class="section-icon">📜</span>
                  最近日志
                </h3>
                <button class="view-all-btn" @click="navigateTo('logs')">查看全部 →</button>
              </div>

              <div class="log-list">
                <div v-for="log in recentLogs" :key="log.id" class="log-item">
                  <div class="log-icon">
                    {{ getLogIcon(log.action) }}
                  </div>
                  <div class="log-content">
                    <div class="log-title">
                      <strong>{{ log.user_name || '系统' }}</strong>
                      {{ getLogActionText(log.action) }}
                      <span class="log-time">{{ formatDateTime(log.created_at) }}</span>
                    </div>
                    <div class="log-details">
                      <span v-if="log.table_name" class="log-table">表: {{ log.table_name }}</span>
                      <span v-if="log.record_id" class="log-record">ID: {{ log.record_id }}</span>
                    </div>
                  </div>
                </div>
                <div v-if="recentLogs.length === 0" class="empty-state">
                  <div class="empty-icon">📜</div>
                  <p>暂无系统日志</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 最近项目表格 -->
        <div class="dashboard-section full-width">
          <div class="section-header">
            <h3 class="section-title">
              <span class="section-icon">📋</span>
              最近项目
            </h3>
            <router-link to="/admin/projects" class="view-all">查看全部 →</router-link>
          </div>
          <div class="project-table">
            <table>
              <thead>
                <tr>
                  <th>项目编号</th>
                  <th>项目标题</th>
                  <th>申请者</th>
                  <th>类别</th>
                  <th>状态</th>
                  <th>创建时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="project in recentProjects" :key="project.id">
                  <td class="project-code">{{ project.project_code }}</td>
                  <td class="project-title">{{ project.title }}</td>
                  <td class="project-applicant">{{ project.applicant_name }}</td>
                  <td class="project-category">
                    <span class="category-badge">{{ project.category }}</span>
                  </td>
                  <td class="project-status">
                    <span class="status-badge" :class="getStatusClass(project.status)">
                      {{ getStatusText(project.status) }}
                    </span>
                  </td>
                  <td class="project-date">{{ formatDate(project.created_at) }}</td>
                  <td class="project-actions">
                    <button class="action-btn small" @click="viewProject(project.id)">查看</button>
                  </td>
                </tr>
                <tr v-if="recentProjects.length === 0">
                  <td colspan="7" class="empty-state">
                    <span>📁 暂无项目数据</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>

    <!-- 移动端菜单遮罩 -->
    <div v-if="showMobileMenu" class="mobile-menu-overlay" @click="toggleMobileMenu"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const isDarkMode = ref(false)
const sidebarCollapsed = ref(false)
const showMobileMenu = ref(false)
const showNotificationsDropdown = ref(false)
const userName = ref('')
const unreadCount = ref(0)

// 数据状态
const summary = ref({
  totalUsers: 0,
  totalProjects: 0,
  pendingReviews: 0,
  totalBudget: 0,
})

const userStats = ref({
  applicants: 0,
  reviewers: 0,
  assistants: 0,
  admins: 0,
  userGrowth: 0,
})

const projectStats = ref({
  draft: 0,
  under_review: 0,
  approved: 0,
  in_progress: 0,
  completed: 0,
  projectGrowth: 0,
})

const financeStats = ref({
  totalBudget: 0,
  allocated: 0,
  expended: 0,
  remaining: 0,
  fundGrowth: 0,
})

const achievementStats = ref({
  total: 0,
  papers: 0,
  patents: 0,
  software: 0,
  reports: 0,
  prototypes: 0,
  transfers: 0,
  achievementGrowth: 0,
})

const recentProjects = ref([])
const recentUsers = ref([])
const recentLogs = ref([])
const notifications = ref([])

const pendingTasks = ref({
  projects: 0,
  funding: 0,
  expenditures: 0,
  achievements: 0,
  get total() {
    return this.projects + this.funding + this.expenditures + this.achievements
  },
})

const pendingStats = computed(() => ({
  projects: pendingTasks.value.projects,
  funding: pendingTasks.value.funding,
  expenditures: pendingTasks.value.expenditures,
  achievements: pendingTasks.value.achievements,
}))

// 计算属性
const userInitial = computed(() => {
  return userName.value ? userName.value.charAt(0).toUpperCase() : 'A'
})

const currentDate = computed(() => {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[now.getDay()]
  return `${year}年${month}月${day}日 星期${weekday}`
})

const recentNotifications = computed(() => {
  return notifications.value.slice(0, 3)
})

// 工具函数
const formatFunds = (funds: number) => {
  if (!funds) return '¥0'
  const num = Number(funds)
  if (isNaN(num)) return '¥0'
  if (num >= 100000000) {
    return '¥' + (num / 100000000).toFixed(2) + '亿'
  }
  if (num >= 10000) {
    return '¥' + (num / 10000).toFixed(2) + '万'
  }
  return '¥' + num.toFixed(2)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '未设置'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN')
  } catch (e) {
    return dateString
  }
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now - date
    const diffHours = diff / (1000 * 60 * 60)

    if (diffHours < 1) {
      return `${Math.floor(diff / (1000 * 60))}分钟前`
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}小时前`
    } else if (diffHours < 168) {
      return `${Math.floor(diffHours / 24)}天前`
    } else {
      return date.toLocaleDateString('zh-CN')
    }
  } catch (e) {
    return dateString
  }
}

const getTrendClass = (trend: number) => {
  if (trend > 0) return 'positive'
  if (trend < 0) return 'negative'
  return 'neutral'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    draft: '草稿',
    submitted: '已提交',
    under_review: '评审中',
    approved: '已批准',
    rejected: '已拒绝',
    in_progress: '进行中',
    stage_review: '阶段评审',
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
    approved: 'approved',
    rejected: 'rejected',
    in_progress: 'ongoing',
    stage_review: 'reviewing',
    completed: 'completed',
    terminated: 'terminated',
  }
  return classMap[status] || status
}

const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '管理员',
  }
  return roleMap[role] || role
}

const getLogIcon = (action: string) => {
  const iconMap: Record<string, string> = {
    create: '➕',
    update: '✏️',
    delete: '🗑️',
    login: '🔑',
    logout: '🚪',
    download: '📥',
    upload: '📤',
    approve: '✅',
    reject: '❌',
    review: '⭐',
    submit: '📝',
  }
  return iconMap[action] || '📋'
}

const getLogActionText = (action: string) => {
  const actionMap: Record<string, string> = {
    create: '创建了',
    update: '更新了',
    delete: '删除了',
    login: '登录系统',
    logout: '退出系统',
    download: '下载了',
    upload: '上传了',
    approve: '批准了',
    reject: '拒绝了',
    review: '评审了',
    submit: '提交了',
  }
  return actionMap[action] || '操作了'
}

const getNotificationIcon = (type: string) => {
  const iconMap: Record<string, string> = {
    project: '📋',
    funding: '💰',
    achievement: '🏆',
    system: '🔧',
    review: '⭐',
    message: '💬',
    task: '✅',
    warning: '⚠️',
    info: 'ℹ️',
  }
  return iconMap[type] || '📢'
}

// 导航功能
const navigateTo = (action: string) => {
  const routes: Record<string, string> = {
    'create-user': '/admin/users/create',
    users: '/admin/users',
    projects: '/admin/projects',
    funding: '/admin/funding',
    logs: '/admin/logs',
    reports: '/admin/finance-reports',
  }

  if (routes[action]) {
    router.push(routes[action])
  }
}

const viewProject = (projectId: string) => {
  router.push(`/projects/detail/${projectId}`)
}

const viewUser = (userId: string) => {
  router.push(`/admin/users/${userId}`)
}

// 跳转到待处理页面
const goToPendingProjects = () => {
  router.push('/admin/projects?status=under_review')
}

const goToPendingFunding = () => {
  router.push('/admin/funding?status=submitted')
}

const goToPendingExpenditures = () => {
  router.push('/admin/expenditures?status=submitted')
}

const goToPendingAchievements = () => {
  router.push('/admin/achievements?status=submitted')
}

// UI控制
const toggleSidebar = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value
}

const toggleNotifications = () => {
  showNotificationsDropdown.value = !showNotificationsDropdown.value
}

const openNotification = async (notification: any) => {
  try {
    if (!notification.read) {
      await request.post(`/api/notifications/${notification.id}/read`)
      notification.read = true
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }

    if (notification.link) {
      router.push(notification.link)
    }

    showNotificationsDropdown.value = false
  } catch (error) {
    console.error('打开通知失败:', error)
  }
}

const markAllAsRead = async () => {
  try {
    await request.post('/api/notifications/mark-all-read')
    notifications.value.forEach((notification) => {
      notification.read = true
    })
    unreadCount.value = 0
    ElMessage.success('所有通知已标记为已读')
  } catch (error) {
    console.error('标记全部已读失败:', error)
    ElMessage.error('标记全部已读失败')
  }
}

const refreshData = () => {
  loadDashboardData()
}

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light')
  ElMessage.info(isDarkMode.value ? '已切换到深色模式' : '已切换到浅色模式')
}

const handleLogout = () => {
  if (confirm('确定要退出登录吗？')) {
    localStorage.clear()
    sessionStorage.clear()
    router.push('/login')
  }
}

// 加载用户信息
const loadUserInfo = async () => {
  try {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      const user = JSON.parse(userStr)
      userName.value = user.username || user.nickname || user.name || '管理员'
    }
  } catch (error) {
    console.warn('加载用户信息失败:', error)
    userName.value = localStorage.getItem('userName') || '管理员'
  }
}

// 加载仪表板数据
const loadDashboardData = async () => {
  loading.value = true

  try {
    console.log('正在获取管理员仪表板数据...')

    // 测试后端连接
    const connectionTest = await request.get('/api/db/test')
    console.log('后端连接状态:', connectionTest.success ? '正常' : '异常')

    // 并行加载所有数据
    await Promise.all([
      loadSummaryData(),
      loadUserStats(),
      loadProjectStats(),
      loadFinanceStats(),
      loadAchievementStats(),
      loadRecentProjects(),
      loadRecentUsers(),
      loadRecentLogs(),
      loadNotifications(),
      loadPendingTasks(),
    ])
  } catch (error) {
    console.error('加载仪表板数据失败:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录状态已过期，请重新登录')
      localStorage.clear()
      sessionStorage.clear()
      router.push('/login')
    } else if (error.response?.status === 403) {
      ElMessage.error('您没有管理员权限')
      router.push('/dashboard')
    } else {
      ElMessage.error('加载数据失败，将显示模拟数据')
      showMockData()
    }
  } finally {
    loading.value = false
  }
}

// 加载各项数据的具体方法
const loadSummaryData = async () => {
  try {
    const response = await request.get('/api/admin/dashboard/summary')
    if (response.success && response.data) {
      summary.value = response.data
    }
  } catch (error) {
    console.error('加载汇总数据失败:', error)
  }
}

const loadUserStats = async () => {
  try {
    const response = await request.get('/api/admin/stats/users')
    if (response.success && response.data) {
      userStats.value = response.data
    }
  } catch (error) {
    console.error('加载用户统计失败:', error)
  }
}

const loadProjectStats = async () => {
  try {
    const response = await request.get('/api/admin/stats/projects')
    if (response.success && response.data) {
      projectStats.value = response.data
    }
  } catch (error) {
    console.error('加载项目统计失败:', error)
  }
}

const loadFinanceStats = async () => {
  try {
    const response = await request.get('/api/admin/stats/finance')
    if (response.success && response.data) {
      financeStats.value = response.data
    }
  } catch (error) {
    console.error('加载经费统计失败:', error)
  }
}

const loadAchievementStats = async () => {
  try {
    const response = await request.get('/api/admin/stats/achievements')
    if (response.success && response.data) {
      achievementStats.value = response.data
    }
  } catch (error) {
    console.error('加载成果统计失败:', error)
  }
}

const loadRecentProjects = async () => {
  try {
    const response = await request.get('/api/admin/projects/recent', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      recentProjects.value = response.data
    }
  } catch (error) {
    console.error('加载最近项目失败:', error)
  }
}

const loadRecentUsers = async () => {
  try {
    const response = await request.get('/api/admin/users/recent', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      recentUsers.value = response.data
    }
  } catch (error) {
    console.error('加载最近用户失败:', error)
  }
}

const loadRecentLogs = async () => {
  try {
    const response = await request.get('/api/admin/logs/recent', {
      params: { limit: 5 },
    })
    if (response.success && response.data) {
      recentLogs.value = response.data
    }
  } catch (error) {
    console.error('加载最近日志失败:', error)
  }
}

const loadNotifications = async () => {
  try {
    const response = await request.get('/api/notifications', {
      params: { limit: 10, orderBy: 'created_at', order: 'desc' },
    })
    if (response.success && response.data) {
      notifications.value = response.data.map((n: any) => ({
        ...n,
        icon: getNotificationIcon(n.type),
        time: formatDateTime(n.created_at),
      }))
      unreadCount.value = notifications.value.filter((n: any) => !n.read).length
    }
  } catch (error) {
    console.error('加载通知失败:', error)
  }
}

const loadPendingTasks = async () => {
  try {
    const response = await request.get('/api/admin/tasks/pending')
    if (response.success && response.data) {
      pendingTasks.value = {
        projects: response.data.projects || 0,
        funding: response.data.funding || 0,
        expenditures: response.data.expenditures || 0,
        achievements: response.data.achievements || 0,
      }
    }
  } catch (error) {
    console.error('加载待处理任务失败:', error)
  }
}

// 显示模拟数据
const showMockData = () => {
  console.log('使用模拟数据')

  // 模拟数据
  summary.value = {
    totalUsers: 156,
    totalProjects: 42,
    pendingReviews: 8,
    totalBudget: 12500000,
  }

  userStats.value = {
    applicants: 120,
    reviewers: 25,
    assistants: 10,
    admins: 1,
    userGrowth: 12,
  }

  projectStats.value = {
    draft: 5,
    under_review: 8,
    approved: 15,
    in_progress: 12,
    completed: 2,
    projectGrowth: 5,
  }

  financeStats.value = {
    totalBudget: 12500000,
    allocated: 8500000,
    expended: 6200000,
    remaining: 2300000,
    fundGrowth: 8,
  }

  achievementStats.value = {
    total: 78,
    papers: 45,
    patents: 18,
    software: 8,
    reports: 5,
    prototypes: 2,
    transfers: 0,
    achievementGrowth: 15,
  }

  recentProjects.value = [
    {
      id: '1',
      project_code: 'PROJ-2024001',
      title: '人工智能辅助医疗诊断系统研究',
      applicant_name: '张研究员',
      category: '基础研究',
      status: 'in_progress',
      created_at: '2024-01-15',
    },
    {
      id: '2',
      project_code: 'PROJ-2024002',
      title: '新型环保材料开发与应用',
      applicant_name: '李教授',
      category: '应用研究',
      status: 'under_review',
      created_at: '2024-01-20',
    },
  ]

  recentUsers.value = [
    {
      id: '1',
      name: '王博士',
      role: 'applicant',
      department: '计算机学院',
      status: 'active',
    },
    {
      id: '2',
      name: '刘教授',
      role: 'reviewer',
      department: '材料学院',
      status: 'active',
    },
  ]

  recentLogs.value = [
    {
      id: 1,
      user_name: '张研究员',
      action: 'create',
      table_name: 'Project',
      record_id: 'PROJ-2024003',
      created_at: '2024-01-25 14:30:00',
    },
    {
      id: 2,
      user_name: '系统',
      action: 'login',
      table_name: 'User',
      record_id: 'user-001',
      created_at: '2024-01-25 09:15:00',
    },
  ]

  pendingTasks.value = {
    projects: 8,
    funding: 3,
    expenditures: 5,
    achievements: 2,
  }

  notifications.value = [
    {
      id: 1,
      title: '新用户注册',
      type: 'system',
      icon: '👤',
      time: '2小时前',
      read: false,
    },
    {
      id: 2,
      title: '项目待审核',
      type: 'project',
      icon: '📋',
      time: '1天前',
      read: true,
    },
  ]

  unreadCount.value = notifications.value.filter((n) => !n.read).length
}

// 组件生命周期
onMounted(() => {
  console.log('=== 初始化管理员工作台页面 ===')

  // 先加载用户信息
  loadUserInfo().then(() => {
    // 检查角色是否匹配
    const userRole = localStorage.getItem('userRole')
    if (userRole?.toUpperCase() !== 'ADMIN') {
      console.warn(`⚠️ 警告：当前用户角色 "${userRole}" 不匹配管理员角色`)
      ElMessage.warning(`检测到您不是管理员，将跳转到对应工作台`)

      setTimeout(() => {
        const rolePaths: Record<string, string> = {
          applicant: '/applicant/dashboard',
          reviewer: '/reviewer/dashboard',
          project_manager: '/assistant/dashboard',
        }
        const targetPath = rolePaths[userRole?.toLowerCase() || ''] || '/login'
        router.push(targetPath)
      }, 2000)
    } else {
      // 然后加载仪表板数据
      loadDashboardData()
    }
  })

  // 设置定时刷新
  const refreshInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshData()
    }
  }, 300000) // 5分钟刷新一次

  // 清理定时器
  onUnmounted(() => {
    clearInterval(refreshInterval)
  })

  // 点击外部关闭通知下拉
  document.addEventListener('click', (e) => {
    if (showNotificationsDropdown.value && !e.target.closest('.notifications-dropdown')) {
      showNotificationsDropdown.value = false
    }
  })
})
</script>

<style scoped>
/* 复用ApplicantDashboard的样式基础，添加管理员特有样式 */
.admin-dashboard {
  min-height: 100vh;
  background: #f5f7fa;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
}

/* 顶部导航栏 - 使用深色主题 */
.dashboard-header {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 0 24px;
  height: 70px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  position: sticky;
  top: 0;
  z-index: 900;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.mobile-menu-btn {
  display: none;
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: white;
}

.mobile-menu-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.logo {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.breadcrumb {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.current-page {
  color: white;
  font-weight: 500;
}

/* 右侧用户区域 */
.header-right {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.user-menu {
  display: flex;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  color: white;
  position: relative;
}

.icon-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.notification-btn {
  position: relative;
}

.notification-count {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

.user-info-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.user-avatar-mini {
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name-mini {
  font-size: 14px;
  font-weight: 500;
  color: white;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role-mini {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  padding: 8px 16px;
  background: rgba(255, 77, 79, 0.2);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
}

.logout-btn:hover {
  background: rgba(255, 77, 79, 0.3);
  color: white;
}

/* 通知下拉菜单 */
.notifications-dropdown-content {
  position: absolute;
  top: 100%;
  right: 0;
  width: 320px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 8px;
}

.notifications-dropdown-header {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notifications-dropdown-header h4 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
  font-weight: 600;
}

.notifications-dropdown-header button {
  background: none;
  border: none;
  color: #1890ff;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.notifications-dropdown-header button:hover {
  background: #f5f7fa;
}

.notifications-dropdown-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-dropdown-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #fafafa;
  cursor: pointer;
  transition: all 0.3s;
}

.notification-dropdown-item:hover {
  background: #fafafa;
}

.notification-dropdown-icon {
  font-size: 18px;
  margin-right: 12px;
  min-width: 24px;
}

.notification-dropdown-content {
  flex: 1;
  min-width: 0;
}

.notification-dropdown-title {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.notification-dropdown-time {
  font-size: 11px;
  color: #7f8c8d;
}

.unread-dot-small {
  width: 6px;
  height: 6px;
  background: #52c41a;
  border-radius: 50%;
  margin-left: 8px;
}

.no-notifications {
  padding: 24px;
  text-align: center;
  color: #7f8c8d;
  font-size: 13px;
}

.notifications-dropdown-footer {
  padding: 12px 16px;
  border-top: 1px solid #f0f0f0;
  text-align: center;
}

.notifications-dropdown-footer a {
  color: #1890ff;
  text-decoration: none;
  font-size: 12px;
}

.notifications-dropdown-footer a:hover {
  text-decoration: underline;
}

/* 主要内容布局 */
.dashboard-content {
  display: flex;
  flex: 1;
  min-height: calc(100vh - 70px);
}

/* 侧边栏 - 保持与ApplicantDashboard一致 */
.sidebar {
  width: 250px;
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  z-index: 1000;
  position: relative;
}

.sidebar-collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar-toggle {
  background: #f5f7fa;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
}

.sidebar-toggle:hover {
  background: #e8e8e8;
  color: #333;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-section-title {
  font-size: 12px;
  color: #7f8c8d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 20px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-link {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #2c3e50;
  text-decoration: none;
  transition: all 0.3s;
  position: relative;
  white-space: nowrap;
}

.nav-link:hover {
  background: #f5f7fa;
  color: #1890ff;
}

.nav-link.active {
  background: #e6f7ff;
  color: #1890ff;
  border-right: 3px solid #1890ff;
}

.nav-link.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: #1890ff;
}

.nav-icon {
  font-size: 18px;
  margin-right: 12px;
  min-width: 24px;
  text-align: center;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  background: #ff4d4f;
  color: white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: auto;
  min-width: 18px;
  text-align: center;
}

.sidebar-footer {
  border-top: 1px solid #f0f0f0;
  padding: 16px 20px;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f8f9fa;
}

.main-content.sidebar-collapsed {
  margin-left: 60px;
}

/* 欢迎区域 - 管理员特有样式 */
.admin-banner {
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
}

.welcome-card.admin-banner .welcome-title,
.welcome-card.admin-banner .welcome-subtitle,
.welcome-card.admin-banner .stat-value,
.welcome-card.admin-banner .stat-label {
  color: white;
}

.welcome-card.admin-banner .stat-badge {
  background: rgba(255, 255, 255, 0.15);
}

.welcome-card.admin-banner .illustration-icon {
  color: rgba(255, 255, 255, 0.8);
}

/* 加载状态 */
.loading-overlay {
  position: fixed;
  top: 70px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #1890ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #666;
  font-size: 16px;
}

/* 三列布局 */
.dashboard-layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
}

.dashboard-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 卡片通用样式 */
.card-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  padding: 24px;
}

/* 概览卡片 */
.overview-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  cursor: pointer;
  margin-bottom: 16px;
}

.overview-card:last-child {
  margin-bottom: 0;
}

.overview-card:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 20px rgba(24, 144, 255, 0.1);
  transform: translateY(-2px);
}

.overview-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 16px;
}

.overview-content h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #1a1a1a;
  font-weight: 600;
}

.overview-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}

.stat-number {
  font-weight: 600;
  color: #1a1a1a;
}

.overview-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.trend {
  font-size: 14px;
  font-weight: 500;
}

.trend.positive {
  color: #52c41a;
}

.trend.negative {
  color: #ff4d4f;
}

.trend.neutral {
  color: #8c8c8c;
}

.trend-label {
  font-size: 12px;
  color: #8c8c8c;
}

/* 快速操作 */
.quick-actions-section {
  padding: 24px;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.action-card {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 16px;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-card:hover {
  border-color: #1890ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.1);
}

.action-icon {
  font-size: 24px;
  width: 48px;
  height: 48px;
  background: #f5f7fa;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-content h4 {
  margin: 0 0 4px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  color: #7f8c8d;
  font-size: 12px;
  line-height: 1.4;
}

/* 待处理任务 */
.task-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.task-card {
  background: white;
  border: 2px solid #f0f0f0;
  border-left: 4px solid #1890ff;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
  cursor: pointer;
}

.task-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-title {
  font-weight: 600;
  color: #1a1a1a;
  font-size: 16px;
}

.task-count {
  background: #1890ff;
  color: white;
  padding: 4px 8px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 500;
}

.task-description {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
}

.task-actions {
  display: flex;
  gap: 8px;
}

.task-btn {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.task-btn:hover {
  background: #40a9ff;
}

/* 数据统计 */
.data-statistics-section {
  padding: 24px;
}

.stats-grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-card.enhanced {
  background: white;
  border: 1px solid #f0f0f0;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s;
}

.stat-card.enhanced:hover {
  border-color: #1890ff;
  box-shadow: 0 4px 20px rgba(24, 144, 255, 0.1);
}

.stat-header {
  margin-bottom: 16px;
}

.stat-icon-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-icon-bg {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-icon {
  font-size: 24px;
  color: white;
}

.stat-trend-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-trend {
  font-size: 14px;
  font-weight: 600;
}

.stat-trend.positive {
  color: #52c41a;
}

.stat-trend.negative {
  color: #ff4d4f;
}

.stat-trend.neutral {
  color: #7f8c8d;
}

.trend-label {
  font-size: 11px;
  color: #7f8c8d;
  margin-top: 2px;
}

.stat-body {
  margin-top: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 4px;
}

.funding-value {
  font-size: 24px;
  color: #fa8c16;
}

.stat-label {
  font-size: 13px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.funding-breakdown,
.achievement-breakdown {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed #f0f0f0;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.breakdown-label {
  color: #7f8c8d;
}

.breakdown-value {
  font-weight: 500;
  color: #2c3e50;
}

/* 用户列表 */
.user-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.3s;
}

.user-item:hover {
  border-color: #d9d9d9;
  background: white;
}

.user-avatar-small {
  width: 36px;
  height: 36px;
  background: #1890ff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  margin-right: 12px;
  flex-shrink: 0;
}

.user-content {
  flex: 1;
  min-width: 0;
}

.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.user-name {
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
  font-size: 14px;
  flex: 1;
  margin-right: 8px;
}

.user-role-tag {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 500;
}

.user-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #7f8c8d;
}

.user-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
}

.user-status.active {
  background: #f6ffed;
  color: #52c41a;
}

.user-status.inactive {
  background: #fff2f0;
  color: #ff4d4f;
}

/* 日志列表 */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s;
}

.log-item:hover {
  border-color: #1890ff;
  background: #fafafa;
}

.log-icon {
  font-size: 18px;
  margin-right: 12px;
  margin-top: 2px;
  flex-shrink: 0;
}

.log-content {
  flex: 1;
}

.log-title {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #1a1a1a;
  flex-wrap: wrap;
  gap: 4px;
}

.log-time {
  font-size: 11px;
  color: #8c8c8c;
  margin-left: auto;
}

.log-details {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #666;
  flex-wrap: wrap;
}

.log-table,
.log-record {
  padding: 2px 6px;
  background: #f5f5f5;
  border-radius: 4px;
}

/* 最近项目表格 */
.dashboard-section.full-width {
  background: white;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 1px solid #f0f0f0;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h3 {
  margin: 0;
  font-size: 20px;
  color: #1a1a1a;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-icon {
  font-size: 20px;
}

.badge-count {
  background: #1890ff;
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
}

.view-all {
  color: #1890ff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
}

.view-all:hover {
  text-decoration: underline;
}

.project-table {
  overflow-x: auto;
}

.project-table table {
  width: 100%;
  border-collapse: collapse;
}

.project-table th {
  text-align: left;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 2px solid #f0f0f0;
  font-weight: 600;
  color: #666;
  font-size: 14px;
}

.project-table td {
  padding: 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
}

.project-table tr:hover {
  background: #fafafa;
}

.project-code {
  font-family: 'Courier New', monospace;
  color: #666;
}

.project-title {
  font-weight: 500;
  color: #1a1a1a;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-applicant {
  color: #666;
}

.category-badge {
  background: #f0f7ff;
  color: #1890ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.draft {
  background: #f5f5f5;
  color: #8c8c8c;
}

.status-badge.submitted {
  background: #e6f7ff;
  color: #1890ff;
}

.status-badge.reviewing {
  background: #fff7e6;
  color: #fa8c16;
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

.status-badge.terminated {
  background: #d9d9d9;
  color: #666;
}

.project-date {
  color: #8c8c8c;
  font-size: 13px;
}

.project-actions {
  display: flex;
  gap: 8px;
}

.action-btn.small {
  padding: 6px 12px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.3s;
}

.action-btn.small:hover {
  background: #40a9ff;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #8c8c8c;
  font-size: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px dashed #d9d9d9;
  grid-column: 1 / -1;
}

.empty-state span {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-icon {
  font-size: 36px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 移动端菜单遮罩 */
.mobile-menu-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-column:last-child {
    grid-column: 1 / -1;
  }

  .actions-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 992px) {
  .sidebar {
    transform: translateX(-100%);
    box-shadow: none;
    position: fixed;
    height: 100vh;
    top: 0;
    left: 0;
  }

  .sidebar.show {
    transform: translateX(0);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }

  .main-content {
    margin-left: 0 !important;
  }

  .mobile-menu-btn {
    display: flex;
  }

  .mobile-menu-overlay {
    display: block;
  }

  .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    padding: 0 16px;
    height: 60px;
  }

  .main-content {
    padding: 16px;
  }

  .dashboard-section.full-width {
    padding: 20px;
  }

  .header-actions {
    gap: 8px;
  }

  .user-info-mini {
    display: none;
  }

  .icon-btn {
    width: 36px;
    height: 36px;
  }

  .logout-btn {
    padding: 6px 12px;
    font-size: 12px;
  }

  .notifications-dropdown-content {
    width: 280px;
    right: -20px;
  }

  .project-table {
    font-size: 12px;
  }

  .project-table th,
  .project-table td {
    padding: 8px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .task-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 576px) {
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .notifications-dropdown-content {
    width: calc(100vw - 32px);
    right: -16px;
  }

  .log-details {
    flex-direction: column;
    gap: 4px;
  }
}

/* 打印样式 */
@media print {
  .sidebar,
  .dashboard-header,
  .section-header button,
  .task-actions,
  .project-actions {
    display: none !important;
  }

  .main-content {
    margin-left: 0 !important;
  }

  .card-section {
    box-shadow: none !important;
    border: 1px solid #ddd !important;
    page-break-inside: avoid;
  }

  .dashboard-layout {
    display: block;
  }

  .dashboard-column {
    margin-bottom: 20px;
  }

  .stat-card.enhanced {
    break-inside: avoid;
  }
}
</style>
