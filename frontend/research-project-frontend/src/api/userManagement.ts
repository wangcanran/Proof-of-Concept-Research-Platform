// src/api/userManagement.ts
import request from '@/utils/request'

// 获取用户列表
export function getUsers(params?: any) {
  return request({
    url: '/admin/users',
    method: 'GET',
    params,
  })
}

// 获取用户统计
export function getUserStats() {
  return request({
    url: '/admin/users/stats',
    method: 'GET',
  })
}

// 获取用户详情
export function getUserDetail(id: string) {
  return request({
    url: `/admin/users/${id}`,
    method: 'GET',
  })
}

// 创建用户
export function createUser(data: any) {
  return request({
    url: '/admin/users',
    method: 'POST',
    data,
  })
}

// 更新用户
export function updateUser(id: string, data: any) {
  return request({
    url: `/admin/users/${id}`,
    method: 'PUT',
    data,
  })
}

// 删除用户
export function deleteUser(id: string) {
  return request({
    url: `/admin/users/${id}`,
    method: 'DELETE',
  })
}

// 更新用户状态
export function updateUserStatus(id: string, status: string) {
  return request({
    url: `/admin/users/${id}/status`,
    method: 'PUT',
    data: { status },
  })
}

// 重置用户密码
export function resetUserPassword(id: string) {
  return request({
    url: `/admin/users/${id}/reset-password`,
    method: 'POST',
  })
}

// 获取用户项目
export function getUserProjects(id: string) {
  return request({
    url: `/admin/users/${id}/projects`,
    method: 'GET',
  })
}

// 获取用户评审记录
export function getUserReviews(id: string) {
  return request({
    url: `/admin/users/${id}/reviews`,
    method: 'GET',
  })
}

// 获取用户操作日志
export function getUserLogs(id: string, params?: any) {
  return request({
    url: `/admin/users/${id}/logs`,
    method: 'GET',
    params,
  })
}

// 导出用户数据
export function exportUsers(params?: any) {
  return request({
    url: '/admin/users/export',
    method: 'GET',
    params,
    responseType: 'blob',
  })
}
