/** Download a blob returned by the backend. */
export async function downloadBlob(blob, fallbackFilename) {
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

export async function downloadExcelBlob(blob, fallbackFilename) {
  await downloadBlob(blob, fallbackFilename)
}

export async function downloadWordZipBlob(blob, fallbackFilename) {
  await downloadBlob(blob, fallbackFilename)
}

export async function adminExportExcel(request, apiPath, params, fallbackFilename) {
  const blob = await requestDownloadBlob(request, apiPath, params)
  await downloadExcelBlob(blob, fallbackFilename)
}

export async function adminExportWordZip(request, apiPath, params, fallbackFilename) {
  const blob = await requestDownloadBlob(request, apiPath, params)
  await downloadWordZipBlob(blob, fallbackFilename)
}

async function requestDownloadBlob(request, apiPath, params) {
  try {
    return await request.get(apiPath, {
      params,
      responseType: 'blob',
      timeout: 120000,
    })
  } catch (error) {
    const data = error?.response?.data
    if (data instanceof Blob) {
      const text = await data.text()
      try {
        const json = JSON.parse(text)
        throw new Error(json.message || json.error || '导出失败')
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          throw new Error(text || error?.message || '导出失败')
        }
        throw parseError
      }
    }
    throw error
  }
}
