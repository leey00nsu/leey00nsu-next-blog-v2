import type {
  CreatePreviewRequest,
  CreatePreviewResponse,
  PreviewData,
} from '@/entities/studio/model/preview-types'

/**
 * 미리보기 생성 API 호출
 */
export async function createPreview(
  request: CreatePreviewRequest,
): Promise<CreatePreviewResponse> {
  const response = await fetch('/api/studio/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error('미리보기 생성 실패')
  }

  return response.json()
}

/**
 * 미리보기 조회 API 호출
 */
export async function getPreview(id: string): Promise<PreviewData> {
  const response = await fetch(`/api/studio/preview?id=${id}`)

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('PREVIEW_EXPIRED')
    }
    throw new Error('PREVIEW_NOT_FOUND')
  }

  return response.json()
}
