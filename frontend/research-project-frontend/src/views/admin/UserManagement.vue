<!-- src/views/admin/UserManagement.vue -->
<template>
  <div class="user-management">
    <!-- 页面标题栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">用户管理</h1>
        <div class="page-description">管理系统中的所有用户账户和权限</div>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="openCreateDialog" :icon="Plus"> 新增用户 </el-button>
        <el-button @click="exportUsers" :icon="Download">导出用户</el-button>
        <el-button @click="refreshData" :icon="Refresh">刷新</el-button>
        <el-dropdown @command="handleBatchCommand">
          <el-button :icon="Operation"> 批量操作 </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="batch-activate" :disabled="selectedUsers.length === 0">
                批量激活
              </el-dropdown-item>
              <el-dropdown-item command="batch-deactivate" :disabled="selectedUsers.length === 0">
                批量停用
              </el-dropdown-item>
              <el-dropdown-item
                command="batch-reset-password"
                :disabled="selectedUsers.length === 0"
              >
                批量重置密码
              </el-dropdown-item>
              <el-dropdown-item
                divided
                command="batch-delete"
                :disabled="selectedUsers.length === 0"
              >
                批量删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
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
          multiple
          collapse-tags
          collapse-tags-tooltip
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="申请人" value="applicant" />
          <el-option label="评审专家" value="reviewer" />
          <el-option label="科研助理" value="project_manager" />
          <el-option label="管理员" value="admin" />
        </el-select>

        <el-select
          v-model="filter.status"
          placeholder="状态筛选"
          clearable
          multiple
          collapse-tags
          collapse-tags-tooltip
          class="filter-select"
          @change="handleSearch"
        >
          <el-option label="活跃" value="active" />
          <el-option label="非活跃" value="inactive" />
          <el-option label="待激活" value="pending" />
        </el-select>

        <el-select
          v-model="filter.department"
          placeholder="部门筛选"
          clearable
          filterable
          remote
          :remote-method="searchDepartments"
          :loading="departmentLoading"
          class="filter-select"
          @change="handleSearch"
        >
          <el-option v-for="dept in departmentOptions" :key="dept" :label="dept" :value="dept" />
        </el-select>

        <el-button type="primary" @click="handleSearch" :icon="Search"> 搜索 </el-button>
        <el-button @click="resetFilters">重置</el-button>
        <el-button type="text" @click="showAdvancedFilter = !showAdvancedFilter">
          {{ showAdvancedFilter ? '收起高级筛选' : '展开高级筛选' }}
          <el-icon :class="{ 'rotate-180': showAdvancedFilter }">
            <ArrowDown />
          </el-icon>
        </el-button>
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

    <!-- 高级筛选面板 -->
    <div v-if="showAdvancedFilter" class="advanced-filter-panel">
      <div class="advanced-filter-row">
        <div class="filter-item">
          <label class="filter-label">注册时间：</label>
          <el-date-picker
            v-model="filter.registerDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">最后登录：</label>
          <el-date-picker
            v-model="filter.lastLoginDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            @change="handleSearch"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">职称：</label>
          <el-input
            v-model="filter.title"
            placeholder="搜索职称"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </div>
      </div>

      <div class="advanced-filter-row">
        <div class="filter-item">
          <label class="filter-label">研究领域：</label>
          <el-input
            v-model="filter.research_field"
            placeholder="搜索研究领域"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">用户ID：</label>
          <el-input
            v-model="filter.user_id"
            placeholder="精确搜索用户ID"
            clearable
            @clear="handleSearch"
            @keyup.enter="handleSearch"
          />
        </div>

        <div class="filter-item">
          <label class="filter-label">排序方式：</label>
          <el-select v-model="filter.sortBy" @change="handleSearch" clearable>
            <el-option label="注册时间（最新）" value="created_at_desc" />
            <el-option label="注册时间（最早）" value="created_at_asc" />
            <el-option label="最后登录（最近）" value="last_login_desc" />
            <el-option label="最后登录（最久）" value="last_login_asc" />
            <el-option label="姓名（A-Z）" value="name_asc" />
            <el-option label="姓名（Z-A）" value="name_desc" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="stats-summary">
      <div class="stat-item">
        <span class="stat-label">当前筛选：</span>
        <span class="stat-value">{{ pagination.total }} 个用户</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">已选择：</span>
        <span class="stat-value">{{ selectedUsers.length }} 个用户</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">活跃用户：</span>
        <span class="stat-value">{{ stats.activeCount || 0 }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">待激活：</span>
        <span class="stat-value">{{ stats.pendingCount || 0 }}</span>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-if="viewMode === 'list'" class="list-view">
      <div class="table-container">
        <el-table
          :data="users"
          v-loading="loading"
          stripe
          style="width: 100%"
          @selection-change="handleSelectionChange"
          @row-click="viewUserDetail"
        >
          <el-table-column type="selection" width="50" />

          <el-table-column prop="id" label="用户ID" width="120" fixed="left">
            <template #default="{ row }">
              <span class="user-id" @click.stop="copyUserId(row.id)" title="点击复制">
                {{ row.id.substring(0, 8) }}...
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="username" label="用户名" width="140" fixed="left">
            <template #default="{ row }">
              <div class="user-cell">
                <div class="user-avatar-small">{{ getInitial(row.name) }}</div>
                <div class="user-info">
                  <div class="user-name">{{ row.name }}</div>
                  <div class="user-username">@{{ row.username }}</div>
                </div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="email" label="邮箱" width="220">
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

          <el-table-column prop="department" label="部门" width="150">
            <template #default="{ row }">
              <span v-if="row.department">{{ row.department }}</span>
              <span v-else class="empty-field">未设置</span>
            </template>
          </el-table-column>

          <el-table-column prop="title" label="职称" width="150">
            <template #default="{ row }">
              <span v-if="row.title">{{ row.title }}</span>
              <span v-else class="empty-field">未设置</span>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="
                  row.status === 'active'
                    ? 'success'
                    : row.status === 'pending'
                      ? 'warning'
                      : 'info'
                "
                size="small"
              >
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="last_login" label="最后登录" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.last_login) || '从未登录' }}
            </template>
          </el-table-column>

          <el-table-column prop="created_at" label="注册时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.created_at) }}
            </template>
          </el-table-column>

          <el-table-column label="操作" width="220" fixed="right">
            <template #default="{ row }">
              <el-button-group>
                <el-button type="primary" size="small" @click.stop="editUser(row)">
                  编辑
                </el-button>
                <el-dropdown
                  @command="(command) => handleUserCommand(command, row)"
                  trigger="click"
                >
                  <el-button type="primary" size="small">
                    <el-icon><ArrowDown /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view">查看详情</el-dropdown-item>
                      <el-dropdown-item
                        command="reset-password"
                        :disabled="row.id === currentUserId"
                      >
                        重置密码
                      </el-dropdown-item>
                      <el-dropdown-item
                        command="toggle-status"
                        :disabled="row.id === currentUserId || row.role === 'admin'"
                      >
                        {{ row.status === 'active' ? '停用账户' : '激活账户' }}
                      </el-dropdown-item>
                      <el-dropdown-item divided command="send-message"> 发送消息 </el-dropdown-item>
                      <el-dropdown-item
                        command="delete"
                        :disabled="row.id === currentUserId || row.role === 'admin'"
                      >
                        删除账户
                      </el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </el-button-group>
            </template>
          </el-table-column>
        </el-table>
      </div>

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
    <div v-else class="card-view">
      <div v-loading="loading" class="cards-container">
        <div class="cards-grid">
          <div
            v-for="user in users"
            :key="user.id"
            class="user-card"
            :class="{ selected: selectedUserIds.includes(user.id) }"
            @click="toggleUserSelect(user)"
          >
            <div class="card-select">
              <el-checkbox
                :model-value="selectedUserIds.includes(user.id)"
                @click.stop
                @change="toggleUserSelect(user)"
              />
            </div>

            <div class="card-header">
              <div class="user-avatar-large" :style="{ background: getRoleColor(user.role) }">
                {{ getInitial(user.name) }}
              </div>
              <div class="user-basic-info">
                <h3 class="user-name">{{ user.name }}</h3>
                <p class="user-username">@{{ user.username }}</p>
                <div class="user-role">
                  <el-tag :type="getRoleTagType(user.role)" size="small">
                    {{ getRoleText(user.role) }}
                  </el-tag>
                </div>
              </div>
              <el-dropdown @command="(command) => handleUserCommand(command, user)" trigger="click">
                <span class="card-menu">
                  <el-icon><More /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="view">查看详情</el-dropdown-item>
                    <el-dropdown-item command="edit">编辑信息</el-dropdown-item>
                    <el-dropdown-item
                      command="reset-password"
                      :disabled="user.id === currentUserId"
                    >
                      重置密码
                    </el-dropdown-item>
                    <el-dropdown-item
                      command="toggle-status"
                      :disabled="user.id === currentUserId || user.role === 'admin'"
                    >
                      {{ user.status === 'active' ? '停用账户' : '激活账户' }}
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

              <div class="info-row">
                <el-icon><Calendar /></el-icon>
                <span class="info-label">注册时间：</span>
                <span class="info-value">{{ formatDate(user.created_at) }}</span>
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
              <el-button type="primary" size="small" @click.stop="editUser(user)" class="edit-btn">
                编辑
              </el-button>
            </div>
          </div>
        </div>

        <div v-if="users.length === 0" class="empty-state">
          <el-empty description="暂无用户数据" />
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

    <!-- 创建/编辑用户对话框 -->
    <el-dialog
      v-model="dialog.visible"
      :title="dialog.isEdit ? '编辑用户' : '创建用户'"
      width="700px"
      @close="closeDialog"
    >
      <el-form
        ref="userFormRef"
        :model="dialog.form"
        :rules="dialog.rules"
        label-width="120px"
        label-position="right"
      >
        <el-tabs v-model="dialog.activeTab">
          <!-- 基本信息标签页 -->
          <el-tab-pane label="基本信息" name="basic">
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
                @input="checkPasswordStrength"
              />
              <div class="password-strength" v-if="dialog.form.password">
                <div class="strength-bar">
                  <div
                    class="strength-fill"
                    :class="passwordStrength.class"
                    :style="{ width: passwordStrength.width }"
                  ></div>
                </div>
                <div class="strength-text">{{ passwordStrength.text }}</div>
              </div>
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
                <el-option label="评审专家" value="reviewer" />
                <el-option label="科研助理" value="project_manager" />
                <el-option label="管理员" value="admin" />
              </el-select>
            </el-form-item>

            <el-form-item label="账号状态" prop="status">
              <el-radio-group v-model="dialog.form.status">
                <el-radio label="active">活跃</el-radio>
                <el-radio label="inactive">非活跃</el-radio>
                <el-radio label="pending">待激活</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-tab-pane>

          <!-- 详细信息标签页 -->
          <el-tab-pane label="详细信息" name="details">
            <el-form-item label="所属部门" prop="department">
              <el-input v-model="dialog.form.department" placeholder="请输入部门" />
            </el-form-item>

            <el-form-item label="职称" prop="title">
              <el-input v-model="dialog.form.title" placeholder="请输入职称" />
            </el-form-item>

            <el-form-item label="研究领域" prop="research_field">
              <el-input
                v-model="dialog.form.research_field"
                type="textarea"
                :rows="3"
                placeholder="请输入研究领域"
                show-word-limit
                maxlength="500"
              />
            </el-form-item>

            <el-form-item label="联系电话" prop="phone">
              <el-input v-model="dialog.form.phone" placeholder="请输入联系电话" />
            </el-form-item>

            <el-form-item label="个人简介" prop="bio">
              <el-input
                v-model="dialog.form.bio"
                type="textarea"
                :rows="4"
                placeholder="请输入个人简介"
                show-word-limit
                maxlength="1000"
              />
            </el-form-item>
          </el-tab-pane>

          <!-- 权限设置标签页 -->
          <el-tab-pane label="权限设置" name="permissions" v-if="dialog.isEdit">
            <div class="permissions-section">
              <div class="permissions-header">
                <h4>用户权限</h4>
                <el-button type="text" @click="selectAllPermissions">全选</el-button>
                <el-button type="text" @click="clearAllPermissions">清空</el-button>
              </div>

              <div class="permissions-list">
                <div
                  class="permission-category"
                  v-for="category in permissionCategories"
                  :key="category.id"
                >
                  <h5>{{ category.name }}</h5>
                  <div class="permission-items">
                    <el-checkbox-group v-model="dialog.form.permissions">
                      <el-checkbox
                        v-for="permission in category.permissions"
                        :key="permission.value"
                        :label="permission.value"
                        :value="permission.value"
                      >
                        {{ permission.label }}
                      </el-checkbox>
                    </el-checkbox-group>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
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
    <el-dialog v-model="resetPasswordDialog.visible" title="重置密码" width="450px">
      <el-form
        ref="resetPasswordFormRef"
        :model="resetPasswordDialog.form"
        :rules="resetPasswordDialog.rules"
        label-width="100px"
      >
        <el-form-item label="用户名">
          <el-input :value="resetPasswordDialog.userName" disabled />
        </el-form-item>

        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="resetPasswordDialog.form.newPassword"
            type="password"
            placeholder="请输入新密码"
            show-password
            @input="checkPasswordStrength"
          />
          <div class="password-strength" v-if="resetPasswordDialog.form.newPassword">
            <div class="strength-bar">
              <div
                class="strength-fill"
                :class="passwordStrength.class"
                :style="{ width: passwordStrength.width }"
              ></div>
            </div>
            <div class="strength-text">{{ passwordStrength.text }}</div>
          </div>
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="resetPasswordDialog.form.confirmPassword"
            type="password"
            placeholder="请确认新密码"
            show-password
          />
        </el-form-item>

        <el-form-item label="通知用户">
          <el-switch v-model="resetPasswordDialog.notifyUser" />
          <span class="notify-hint">将通过邮件通知用户新密码</span>
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
            确定重置
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 批量操作对话框 -->
    <el-dialog v-model="batchDialog.visible" :title="batchDialog.title" width="500px">
      <div v-if="batchDialog.type === 'status'">
        <p>确定要对选中的 {{ selectedUsers.length }} 个用户执行此操作吗？</p>
        <el-form :model="batchDialog.form" label-width="100px">
          <el-form-item label="新状态">
            <el-radio-group v-model="batchDialog.form.status">
              <el-radio label="active">激活</el-radio>
              <el-radio label="inactive">停用</el-radio>
            </el-radio-group>
          </el-form-item>
        </el-form>
      </div>

      <div v-else-if="batchDialog.type === 'reset-password'">
        <p>确定要为选中的 {{ selectedUsers.length }} 个用户重置密码吗？</p>
        <el-form :model="batchDialog.form" label-width="100px">
          <el-form-item label="新密码">
            <el-input
              v-model="batchDialog.form.newPassword"
              type="password"
              placeholder="请输入新密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="确认密码">
            <el-input
              v-model="batchDialog.form.confirmPassword"
              type="password"
              placeholder="请确认新密码"
              show-password
            />
          </el-form-item>
          <el-form-item label="通知用户">
            <el-switch v-model="batchDialog.form.notifyUser" />
          </el-form-item>
        </el-form>
      </div>

      <div v-else-if="batchDialog.type === 'delete'">
        <p class="warning-text">
          ⚠️ 警告：确定要删除选中的 {{ selectedUsers.length }} 个用户吗？<br />
          此操作将永久删除用户数据且不可恢复！
        </p>
        <el-form :model="batchDialog.form" label-width="100px">
          <el-form-item label="确认操作">
            <el-input
              v-model="batchDialog.form.confirmation"
              placeholder="请输入 'DELETE' 以确认删除"
            />
          </el-form-item>
          <el-form-item label="保留数据">
            <el-switch v-model="batchDialog.form.keepData" />
            <span class="hint-text">保留用户相关数据（项目、成果等）</span>
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="batchDialog.visible = false">取消</el-button>
          <el-button type="primary" :loading="batchDialog.loading" @click="submitBatchOperation">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { useClipboard } from '@vueuse/core'
import request from '@/utils/request'
import {
  Search,
  Plus,
  Download,
  Refresh,
  Operation,
  ArrowDown,
  More,
  Message,
  OfficeBuilding,
  Medal,
  Timer,
  Calendar,
} from '@element-plus/icons-vue'

const router = useRouter()
const { copy } = useClipboard()

// 响应式数据
const loading = ref(false)
const viewMode = ref<'list' | 'card'>('list')
const showAdvancedFilter = ref(false)
const departmentLoading = ref(false)
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
  role: [] as string[],
  status: [] as string[],
  department: '',
  registerDateRange: [] as string[],
  lastLoginDateRange: [] as string[],
  title: '',
  research_field: '',
  user_id: '',
  sortBy: 'created_at_desc',
})

// 分页
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

// 统计数据
const stats = reactive({
  activeCount: 0,
  inactiveCount: 0,
  pendingCount: 0,
  totalCount: 0,
})

// 用户数据
const users = ref<any[]>([])
const selectedUsers = ref<any[]>([])
const departmentOptions = ref<string[]>([])

// 计算属性
const selectedUserIds = computed(() => selectedUsers.value.map((user) => user.id))

// 密码强度
const passwordStrength = reactive({
  width: '0%',
  class: '',
  text: '',
})

// 权限分类
const permissionCategories = [
  {
    id: 'project',
    name: '项目管理',
    permissions: [
      { value: 'view_projects', label: '查看项目' },
      { value: 'create_project', label: '创建项目' },
      { value: 'edit_project', label: '编辑项目' },
      { value: 'delete_project', label: '删除项目' },
      { value: 'review_project', label: '审核项目' },
    ],
  },
  {
    id: 'funding',
    name: '经费管理',
    permissions: [
      { value: 'view_funding', label: '查看经费' },
      { value: 'apply_funding', label: '申请经费' },
      { value: 'review_funding', label: '审核经费' },
      { value: 'manage_funding', label: '管理经费' },
    ],
  },
  {
    id: 'achievement',
    name: '成果管理',
    permissions: [
      { value: 'view_achievements', label: '查看成果' },
      { value: 'create_achievement', label: '创建成果' },
      { value: 'edit_achievement', label: '编辑成果' },
      { value: 'review_achievement', label: '审核成果' },
    ],
  },
  {
    id: 'user',
    name: '用户管理',
    permissions: [
      { value: 'view_users', label: '查看用户' },
      { value: 'create_user', label: '创建用户' },
      { value: 'edit_user', label: '编辑用户' },
      { value: 'delete_user', label: '删除用户' },
      { value: 'manage_roles', label: '管理角色' },
    ],
  },
  {
    id: 'system',
    name: '系统管理',
    permissions: [
      { value: 'view_logs', label: '查看日志' },
      { value: 'manage_settings', label: '管理设置' },
      { value: 'backup_data', label: '数据备份' },
      { value: 'monitor_system', label: '系统监控' },
    ],
  },
]

// 对话框状态
const dialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  activeTab: 'basic',
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
    bio: '',
    status: 'active',
    permissions: [] as string[],
  },
  rules: {
    username: [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' },
      { pattern: /^[a-zA-Z0-9_]+$/, message: '只能包含字母、数字和下划线', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, message: '密码长度至少6位', trigger: 'blur' },
      {
        validator: (rule: any, value: string, callback: any) => {
          if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
            callback(new Error('密码必须包含大小写字母和数字'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
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
    phone: [
      {
        pattern: /^1[3-9]\d{9}$|^[\d\s\-\(\)]+$/,
        message: '请输入正确的电话号码',
        trigger: 'blur',
      },
    ],
  },
})

// 重置密码对话框
const resetPasswordDialog = reactive({
  visible: false,
  loading: false,
  userId: '',
  userName: '',
  notifyUser: true,
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

// 批量操作对话框
const batchDialog = reactive({
  visible: false,
  loading: false,
  type: '' as 'status' | 'reset-password' | 'delete',
  title: '',
  form: {
    status: 'active',
    newPassword: '',
    confirmPassword: '',
    notifyUser: true,
    confirmation: '',
    keepData: false,
  },
})

// 工具函数
const getInitial = (name: string) => {
  return name ? name.charAt(0).toUpperCase() : '?'
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    applicant: '申请人',
    reviewer: '评审专家',
    project_manager: '科研助理',
    admin: '管理员',
  }
  return map[role] || role
}

const getRoleTagType = (role: string) => {
  const map: Record<string, string> = {
    applicant: 'primary',
    reviewer: 'success',
    project_manager: 'warning',
    admin: 'danger',
  }
  return map[role] || 'info'
}

const getRoleColor = (role: string) => {
  const map: Record<string, string> = {
    applicant: 'linear-gradient(135deg, #b31b1b 0%, #8b1515 100%)',
    reviewer: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
    project_manager: 'linear-gradient(135deg, #fa8c16 0%, #d46b08 100%)',
    admin: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
  }
  return map[role] || '#cccccc'
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
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 7) {
    // 一周内显示相对时间
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    if (diffHours < 24) {
      return `${diffHours}小时前`
    } else {
      return `${diffDays}天前`
    }
  } else {
    // 超过一周显示具体日期
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

// 密码强度检查
const checkPasswordStrength = (password?: string) => {
  const pwd = password || dialog.form.password || resetPasswordDialog.form.newPassword
  if (!pwd) {
    passwordStrength.width = '0%'
    passwordStrength.class = ''
    passwordStrength.text = ''
    return
  }

  let score = 0
  if (pwd.length >= 8) score += 1
  if (/[a-z]/.test(pwd)) score += 1
  if (/[A-Z]/.test(pwd)) score += 1
  if (/\d/.test(pwd)) score += 1
  if (/[^a-zA-Z0-9]/.test(pwd)) score += 1

  const strengthMap = [
    { width: '20%', class: 'weak', text: '极弱' },
    { width: '40%', class: 'weak', text: '弱' },
    { width: '60%', class: 'medium', text: '一般' },
    { width: '80%', class: 'good', text: '强' },
    { width: '100%', class: 'strong', text: '极强' },
  ]

  const strength = strengthMap[Math.min(score - 1, 4)] || strengthMap[0]
  Object.assign(passwordStrength, strength)
}

// 数据加载
const loadUsers = async () => {
  loading.value = true

  try {
    const params: any = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      keyword: filter.keyword || undefined,
      sortBy: filter.sortBy || undefined,
    }

    // 处理数组参数
    if (filter.role.length > 0) {
      params.role = filter.role.join(',')
    }
    if (filter.status.length > 0) {
      params.status = filter.status.join(',')
    }
    if (filter.department) {
      params.department = filter.department
    }
    if (filter.registerDateRange?.length === 2) {
      params.registerStartDate = filter.registerDateRange[0]
      params.registerEndDate = filter.registerDateRange[1]
    }
    if (filter.lastLoginDateRange?.length === 2) {
      params.lastLoginStartDate = filter.lastLoginDateRange[0]
      params.lastLoginEndDate = filter.lastLoginDateRange[1]
    }
    if (filter.title) {
      params.title = filter.title
    }
    if (filter.research_field) {
      params.research_field = filter.research_field
    }
    if (filter.user_id) {
      params.user_id = filter.user_id
    }

    const response = await request.get('/api/admin/users', { params })

    if (response.success) {
      users.value = response.data.users
      pagination.total = response.data.pagination.total

      // 更新统计数据
      if (response.data.stats) {
        Object.assign(stats, response.data.stats)
      }
    }
  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
    users.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const loadDepartments = async () => {
  try {
    const response = await request.get('/api/admin/departments')
    if (response.success) {
      departmentOptions.value = response.data
    }
  } catch (error) {
    console.error('加载部门列表失败:', error)
  }
}

// 搜索部门
const searchDepartments = async (query: string) => {
  if (!query.trim()) {
    departmentOptions.value = []
    return
  }

  departmentLoading.value = true
  try {
    const response = await request.get('/api/admin/departments/search', {
      params: { keyword: query },
    })

    if (response.success) {
      departmentOptions.value = response.data
    }
  } catch (error) {
    console.error('搜索部门失败:', error)
  } finally {
    departmentLoading.value = false
  }
}

// 搜索和筛选
const handleSearch = () => {
  pagination.current = 1
  selectedUsers.value = []
  loadUsers()
}

const resetFilters = () => {
  filter.keyword = ''
  filter.role = []
  filter.status = []
  filter.department = ''
  filter.registerDateRange = []
  filter.lastLoginDateRange = []
  filter.title = ''
  filter.research_field = ''
  filter.user_id = ''
  filter.sortBy = 'created_at_desc'
  pagination.current = 1
  selectedUsers.value = []
  loadUsers()
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

// 用户选择
const handleSelectionChange = (selection: any[]) => {
  selectedUsers.value = selection
}

const toggleUserSelect = (user: any) => {
  const index = selectedUsers.value.findIndex((u) => u.id === user.id)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(user)
  }
}

// 用户操作
const viewUserDetail = (user: any) => {
  router.push(`/admin/users/${user.id}`)
}

const editUser = (user: any) => {
  dialog.isEdit = true
  dialog.visible = true
  dialog.activeTab = 'basic'

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
    bio: user.bio || '',
    status: user.status,
    permissions: user.permissions || [],
    password: '',
    confirmPassword: '',
  })
}

const openCreateDialog = () => {
  dialog.isEdit = false
  dialog.visible = true
  dialog.activeTab = 'basic'

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
    bio: '',
    status: 'active',
    permissions: [],
  }
}

const closeDialog = () => {
  dialog.visible = false
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

const selectAllPermissions = () => {
  const allPermissions = permissionCategories.flatMap((category) =>
    category.permissions.map((p) => p.value),
  )
  dialog.form.permissions = allPermissions
}

const clearAllPermissions = () => {
  dialog.form.permissions = []
}

const submitUserForm = async () => {
  if (!userFormRef.value) return

  try {
    await userFormRef.value.validate()
    dialog.loading = true

    const formData = { ...dialog.form }
    delete formData.confirmPassword

    const url = dialog.isEdit ? `/api/admin/users/${getCurrentEditUserId()}` : '/api/admin/users'

    const method = dialog.isEdit ? 'put' : 'post'

    const response = await request[method](url, formData)

    if (response.success) {
      ElMessage.success(dialog.isEdit ? '用户更新成功' : '用户创建成功')
      closeDialog()
      loadUsers()
    }
  } catch (error: any) {
    if (error.name !== 'ValidateError') {
      ElMessage.error(error.message || '操作失败')
    }
  } finally {
    dialog.loading = false
  }
}

const getCurrentEditUserId = () => {
  const user = users.value.find((u) => u.username === dialog.form.username)
  return user?.id || ''
}

const handleUserCommand = (command: string, user: any) => {
  switch (command) {
    case 'view':
      viewUserDetail(user)
      break
    case 'edit':
      editUser(user)
      break
    case 'reset-password':
      openResetPasswordDialog(user)
      break
    case 'toggle-status':
      toggleUserStatus(user)
      break
    case 'send-message':
      sendMessageToUser(user)
      break
    case 'delete':
      deleteUser(user)
      break
  }
}

// 重置密码
const openResetPasswordDialog = (user: any) => {
  resetPasswordDialog.userId = user.id
  resetPasswordDialog.userName = `${user.name} (${user.username})`
  resetPasswordDialog.visible = true
  resetPasswordDialog.form.newPassword = ''
  resetPasswordDialog.form.confirmPassword = ''
  resetPasswordDialog.notifyUser = true

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
      `/api/admin/users/${resetPasswordDialog.userId}/reset-password`,
      {
        newPassword: resetPasswordDialog.form.newPassword,
        notifyUser: resetPasswordDialog.notifyUser,
      },
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

// 切换用户状态
const toggleUserStatus = async (user: any) => {
  try {
    const action = user.status === 'active' ? '停用' : '激活'
    const confirmText =
      user.status === 'active'
        ? `确定要停用用户 "${user.name}" 吗？`
        : `确定要激活用户 "${user.name}" 吗？`

    await ElMessageBox.confirm(confirmText, `确认${action}`, {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const response = await request.put(`/api/admin/users/${user.id}/status`, {
      status: newStatus,
    })

    if (response.success) {
      ElMessage.success(`${action}成功`)
      loadUsers()
    }
  } catch (error) {
    // 用户取消操作
  }
}

// 发送消息
const sendMessageToUser = (user: any) => {
  ElMessage.info(`发送消息功能待实现，用户：${user.name}`)
}

// 删除用户
const deleteUser = async (user: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${user.name}" 吗？此操作不可恢复！`, '确认删除', {
      type: 'error',
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    })

    const response = await request.delete(`/api/admin/users/${user.id}`)

    if (response.success) {
      ElMessage.success('用户删除成功')
      loadUsers()
    }
  } catch (error) {
    // 用户取消操作
  }
}

// 复制用户ID
const copyUserId = async (userId: string) => {
  try {
    await copy(userId)
    ElMessage.success('用户ID已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

// 批量操作
const handleBatchCommand = (command: string) => {
  if (selectedUsers.value.length === 0) {
    ElMessage.warning('请先选择用户')
    return
  }

  switch (command) {
    case 'batch-activate':
    case 'batch-deactivate':
      batchDialog.type = 'status'
      batchDialog.title = command === 'batch-activate' ? '批量激活用户' : '批量停用用户'
      batchDialog.form.status = command === 'batch-activate' ? 'active' : 'inactive'
      batchDialog.visible = true
      break
    case 'batch-reset-password':
      batchDialog.type = 'reset-password'
      batchDialog.title = '批量重置密码'
      batchDialog.form.newPassword = ''
      batchDialog.form.confirmPassword = ''
      batchDialog.form.notifyUser = true
      batchDialog.visible = true
      break
    case 'batch-delete':
      batchDialog.type = 'delete'
      batchDialog.title = '批量删除用户'
      batchDialog.form.confirmation = ''
      batchDialog.form.keepData = false
      batchDialog.visible = true
      break
  }
}

const submitBatchOperation = async () => {
  try {
    batchDialog.loading = true

    const userIds = selectedUsers.value.map((user) => user.id)

    switch (batchDialog.type) {
      case 'status':
        await batchUpdateStatus(userIds, batchDialog.form.status)
        break
      case 'reset-password':
        await batchResetPassword(userIds, batchDialog.form)
        break
      case 'delete':
        await batchDeleteUsers(userIds, batchDialog.form)
        break
    }

    batchDialog.visible = false
    batchDialog.loading = false
  } catch (error) {
    console.error('批量操作失败:', error)
    ElMessage.error('批量操作失败')
    batchDialog.loading = false
  }
}

const batchUpdateStatus = async (userIds: string[], status: string) => {
  try {
    const response = await request.post('/api/admin/users/batch-status', {
      userIds,
      status,
    })

    if (response.success) {
      ElMessage.success(`已成功${status === 'active' ? '激活' : '停用'} ${userIds.length} 个用户`)
      selectedUsers.value = []
      loadUsers()
    }
  } catch (error) {
    throw error
  }
}

const batchResetPassword = async (userIds: string[], form: any) => {
  try {
    if (form.newPassword !== form.confirmPassword) {
      ElMessage.error('两次输入的密码不一致')
      return
    }

    const response = await request.post('/api/admin/users/batch-reset-password', {
      userIds,
      newPassword: form.newPassword,
      notifyUser: form.notifyUser,
    })

    if (response.success) {
      ElMessage.success(`已成功为 ${userIds.length} 个用户重置密码`)
      selectedUsers.value = []
    }
  } catch (error) {
    throw error
  }
}

const batchDeleteUsers = async (userIds: string[], form: any) => {
  try {
    if (form.confirmation !== 'DELETE') {
      ElMessage.error('请正确输入 DELETE 以确认删除')
      return
    }

    const response = await request.post('/api/admin/users/batch-delete', {
      userIds,
      keepData: form.keepData,
    })

    if (response.success) {
      ElMessage.success(`已成功删除 ${userIds.length} 个用户`)
      selectedUsers.value = []
      loadUsers()
    }
  } catch (error) {
    throw error
  }
}

// 导出功能
const exportUsers = async () => {
  try {
    const params = {
      keyword: filter.keyword || undefined,
      role: filter.role.join(',') || undefined,
      status: filter.status.join(',') || undefined,
      department: filter.department || undefined,
    }

    const response = await request.get('/api/admin/users/export', {
      params,
      responseType: 'blob',
    })

    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `users_${new Date().getTime()}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()

    ElMessage.success('用户数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const refreshData = () => {
  loadUsers()
  loadDepartments()
}

// 初始化
onMounted(() => {
  loadUsers()
  loadDepartments()
})

// 监听密码变化
watch(() => dialog.form.password, checkPasswordStrength)
watch(() => resetPasswordDialog.form.newPassword, checkPasswordStrength)
</script>

<style scoped>
.user-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 70px);
}

/* 页面标题栏 */
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
  margin-bottom: 16px;
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
  flex: 1;
}

.search-input {
  width: 300px;
}

.filter-select {
  width: 140px;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rotate-180 {
  transform: rotate(180deg);
  transition: transform 0.3s;
}

/* 高级筛选面板 */
.advanced-filter-panel {
  background: white;
  border-radius: 0 0 12px 12px;
  padding: 20px 24px;
  margin-top: -8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-top: 1px solid #f0f0f0;
}

.advanced-filter-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 16px;
}

.advanced-filter-row:last-child {
  margin-bottom: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.filter-label {
  font-size: 14px;
  color: #2c3e50;
  white-space: nowrap;
  min-width: 80px;
}

/* 统计信息 */
.stats-summary {
  background: white;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
}

/* 列表视图 */
.list-view {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.table-container {
  padding: 0;
}

.user-id {
  color: #722ed1;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 12px;
  cursor: pointer;
  background: #f9f0ff;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.3s;
}

.user-id:hover {
  background: #d3adf7;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar-small {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #722ed1 0%, #531dab 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
  margin: 0;
}

.user-username {
  font-size: 11px;
  color: #7f8c8d;
  margin: 0;
}

.email-link {
  color: #b31b1b;
  text-decoration: none;
}

.email-link:hover {
  text-decoration: underline;
}

.empty-field {
  color: #bfbfbf;
  font-style: italic;
}

/* 卡片视图 */
.card-view {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
}

.cards-container {
  margin-bottom: 24px;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.user-card {
  background: white;
  border: 2px solid #f0f0f0;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.user-card:hover {
  border-color: #722ed1;
  box-shadow: 0 4px 16px rgba(114, 46, 209, 0.1);
}

.user-card.selected {
  border-color: #722ed1;
  background: #f9f0ff;
}

.card-select {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.card-header {
  padding: 20px 20px 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.user-avatar-large {
  width: 60px;
  height: 60px;
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
  margin: 0 0 8px 0;
  color: #7f8c8d;
  font-size: 13px;
}

.user-role {
  display: inline-block;
}

.card-menu {
  cursor: pointer;
  padding: 4px;
  color: #7f8c8d;
  transition: color 0.3s;
}

.card-menu:hover {
  color: #722ed1;
}

.card-content {
  padding: 16px 20px;
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

.edit-btn {
  padding: 6px 16px;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
}

/* 分页 */
.pagination-container {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  text-align: center;
}

/* 对话框样式 */
.password-strength {
  margin-top: 8px;
}

.strength-bar {
  height: 4px;
  background: #f5f5f5;
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 4px;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.strength-fill.weak {
  background: #ff4d4f;
}

.strength-fill.medium {
  background: #fa8c16;
}

.strength-fill.good {
  background: #52c41a;
}

.strength-fill.strong {
  background: #13c2c2;
}

.strength-text {
  font-size: 12px;
  color: #7f8c8d;
}

.notify-hint {
  font-size: 12px;
  color: #7f8c8d;
  margin-left: 8px;
}

.warning-text {
  color: #ff4d4f;
  line-height: 1.5;
  margin-bottom: 16px;
}

.hint-text {
  font-size: 12px;
  color: #7f8c8d;
  margin-left: 8px;
}

/* 权限设置 */
.permissions-section {
  max-height: 400px;
  overflow-y: auto;
  padding-right: 8px;
}

.permissions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.permissions-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 15px;
}

.permission-category {
  margin-bottom: 20px;
}

.permission-category h5 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 14px;
  font-weight: 600;
}

.permission-items {
  padding-left: 8px;
}

.permission-items .el-checkbox {
  margin-right: 16px;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
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

  .filter-right {
    width: 100%;
    justify-content: flex-start;
  }

  .search-input {
    width: 100%;
  }

  .advanced-filter-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .cards-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }
}

@media (max-width: 768px) {
  .stats-summary {
    flex-wrap: wrap;
    gap: 16px;
  }

  .stat-item {
    width: calc(50% - 16px);
  }

  .cards-grid {
    grid-template-columns: 1fr;
  }

  .filter-item {
    width: 100%;
  }
}
</style>
