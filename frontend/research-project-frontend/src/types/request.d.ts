declare module '@/utils/request' {
  import type { AxiosRequestConfig } from 'axios'

  interface RequestService {
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>
  }

  export const EXPERT_IMPORT_TIMEOUT: number
  export function getApiOrigin(): string
  export function getUploadUrl(filePath?: string | null): string
  export function getApiBaseUrl(): string
  export function normalizeApiBaseUrl(raw?: string | null): string

  const service: RequestService
  export default service
}
