declare module '@/utils/exportDownload' {
  type RequestLike = {
    get<T = any>(url: string, config?: any): Promise<T>
  }

  export function downloadBlob(blob: Blob, fallbackFilename: string): Promise<void>
  export function downloadExcelBlob(blob: Blob, fallbackFilename: string): Promise<void>
  export function downloadWordZipBlob(blob: Blob, fallbackFilename: string): Promise<void>
  export function adminExportExcel(
    request: RequestLike,
    apiPath: string,
    params: Record<string, unknown>,
    fallbackFilename: string,
  ): Promise<void>
  export function adminExportWordZip(
    request: RequestLike,
    apiPath: string,
    params: Record<string, unknown>,
    fallbackFilename: string,
  ): Promise<void>
}
