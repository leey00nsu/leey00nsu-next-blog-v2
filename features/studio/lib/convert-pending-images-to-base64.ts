import type { PendingImageMap } from '@/features/editor/model/types'

/**
 * PendingImageMap의 objectURL을 Base64 데이터 URL로 변환
 */
export async function convertPendingImagesToBase64(
  pendingImages: PendingImageMap,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {}

  for (const [path, entry] of Object.entries(pendingImages)) {
    try {
      const response = await fetch(entry.objectURL)
      const blob = await response.blob()
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      result[path] = base64
    } catch {
      console.warn(`이미지 변환 실패: ${path}`)
    }
  }

  return result
}
