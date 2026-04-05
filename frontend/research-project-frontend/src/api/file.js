import request from '@/utils/request'

// 上传文件
export const uploadFile = (file, onUploadProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)

  return request({
    url: '/files/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  })
}

// 批量上传文件
export const uploadFiles = (files, onUploadProgress = null) => {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })

  return request({
    url: '/files/upload-multiple',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  })
}

// 获取文件列表
export const getFiles = (params) => {
  return request({
    url: '/files',
    method: 'get',
    params,
  })
}

// 删除文件
export const deleteFile = (id) => {
  return request({
    url: `/files/${id}`,
    method: 'delete',
  })
}

// 获取文件下载链接
export const getDownloadUrl = (id) => {
  return `/api/files/${id}/download`
}
