import request from '@/utils/request'

// 获取通知列表
export const getNotifications = (params) => {
  return request({
    url: '/notifications',
    method: 'get',
    params,
  })
}

// 获取未读通知数量
export const getUnreadCount = () => {
  return request({
    url: '/notifications/unread-count',
    method: 'get',
  })
}

// 标记通知为已读
export const markAsRead = (id) => {
  return request({
    url: `/notifications/${id}/read`,
    method: 'post',
  })
}

// 标记所有通知为已读
export const markAllAsRead = () => {
  return request({
    url: '/notifications/mark-all-read',
    method: 'post',
  })
}

// 删除通知
export const deleteNotification = (id) => {
  return request({
    url: `/notifications/${id}`,
    method: 'delete',
  })
}
