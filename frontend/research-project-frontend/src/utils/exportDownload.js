/** 下载后端返回的 Excel blob */
export async function downloadExcelBlob(blob, fallbackFilename) {
  if (!blob || (blob.size !== undefined && blob.size === 0)) {
    throw new Error('导出文件为空')
  }
  if (blob.type && blob.type.includes('json')) {
    const text = await blob.text()
    try {
      const j = JSON.parse(text)
      throw new Error(j.error || j.message || '导出失败')
    } catch (e) {
      if (e instanceof SyntaxError) throw new Error('导出失败')
      throw e
    }
  }
  const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob]))
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fallbackFilename)
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

/** 管理员列表导出：GET blob 并触发下载 */
export async function adminExportExcel(request, apiPath, params, fallbackFilename) {
  const blob = await request.get(apiPath, {
    params,
    responseType: 'blob',
    timeout: 120000,
  })
  await downloadExcelBlob(blob, fallbackFilename)
}
