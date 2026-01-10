/**
 * 미리보기 세션 데이터 타입
 */
export interface PreviewData {
  content: string
  title: string
  description: string
  writer: string
  date: string
  tags: string[]
  pendingImages: Record<string, string> // path -> base64 data URL
}

/**
 * 미리보기 생성 요청 타입
 */
export interface CreatePreviewRequest {
  content: string
  title: string
  description?: string
  writer?: string
  date?: string
  tags?: string[]
  pendingImages?: Record<string, string>
}

/**
 * 미리보기 생성 응답 타입
 */
export interface CreatePreviewResponse {
  id: string
}
