import request from '@/utils/request'

// 获取评审任务列表
export const getReviewTasks = (params) => {
  return request({
    url: '/review/tasks',
    method: 'get',
    params,
  })
}

// 获取评审任务详情
export const getReviewTask = (id) => {
  return request({
    url: `/review/tasks/${id}`,
    method: 'get',
  })
}

// 创建评审意见
export const createReview = (taskId, data) => {
  return request({
    url: `/review/tasks/${taskId}/review`,
    method: 'post',
    data,
  })
}

// 更新评审意见
export const updateReview = (id, data) => {
  return request({
    url: `/review/review${id}`,
    method: 'put',
    data,
  })
}

// 提交评审意见
export const submitReview = (id) => {
  return request({
    url: `/review/review/${id}/submit`,
    method: 'post',
  })
}

// 获取项目阶段
export const getProjectStages = (projectId) => {
  return request({
    url: `/projects/${projectId}/stages`,
    method: 'get',
  })
}

// 更新项目阶段
export const updateProjectStage = (projectId, stageId, data) => {
  return request({
    url: `/projects/${projectId}/stages/${stageId}`,
    method: 'put',
    data,
  })
}

// 批准进入下一阶段
export const approveNextStage = (projectId, stageId, data) => {
  return request({
    url: `/projects/${projectId}/stages/${stageId}/approve`,
    method: 'post',
    data,
  })
}
