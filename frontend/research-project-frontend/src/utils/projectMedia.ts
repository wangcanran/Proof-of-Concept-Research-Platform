import { getUploadUrl } from './request'

/** 项目「图片与视频展示」步骤中的展示类媒体（与附件材料区分） */

export function isProjectShowcaseMedia(item: {
  type?: string
  mime_type?: string
}): boolean {
  const t = item.type
  const m = item.mime_type || ''
  return (
    t === 'image' ||
    t === 'video' ||
    m.startsWith('image/') ||
    m.startsWith('video/')
  )
}

export function isProjectVideoMedia(item: {
  type?: string
  mime_type?: string
}): boolean {
  const t = item.type
  const m = item.mime_type || ''
  return t === 'video' || m.startsWith('video/')
}

export function showcaseMediaTypeFromMime(mime?: string): 'image' | 'video' {
  if (mime?.startsWith('video/')) return 'video'
  return 'image'
}

export const SHOWCASE_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const SHOWCASE_VIDEO_MAX_BYTES = 50 * 1024 * 1024

export function isShowcaseUploadFile(file: File): boolean {
  return file.type.startsWith('image/') || file.type.startsWith('video/')
}

export function showcaseFileMaxBytes(file: File): number {
  return file.type.startsWith('video/') ? SHOWCASE_VIDEO_MAX_BYTES : SHOWCASE_IMAGE_MAX_BYTES
}

/**
 * 展示媒体访问地址（缩略图 / 预览弹窗）。
 * 优先已上传的 file_path（开发环境走 Vite /uploads 代理），上传中回退本地 blob preview。
 */
export function getShowcaseMediaSrc(
  item: { file_path?: string; preview?: string | null },
  _apiOrigin?: string,
): string {
  const p = String(item.file_path || '').trim()
  if (p) {
    if (p.startsWith('http://') || p.startsWith('https://')) return p
    return getUploadUrl(p)
  }
  if (item.preview) return item.preview
  return ''
}
