// Tiptap 이미지 업로드/미리보기 핸들러 팩토리
// - 에디터 플러그인(imagePlugin)에 주입되는 콜백을 생성합니다.
// - 파일 선택 시 최종 경로를 즉시 생성하여 마크다운에는 실제 경로를 넣고,
//   미리보기는 pendingImages에 보관된 objectURL을 사용합니다.

import type { PendingImageMap } from '@/features/editor/model/types'
import { buildUniquePath } from '@/features/editor/lib/image-utils'

type HandlersOptions = {
  slug?: string
  pendingImages: PendingImageMap
  onAddPendingImage?: (path: string, file: File) => void
}

export function makeImageHandlers({
  slug,
  pendingImages,
  onAddPendingImage,
}: HandlersOptions) {
  // 파일 업로드 처리: 경로 생성 후 파일을 보류 목록에 등록하고, 경로를 반환
  const imageUploadHandler = async (file: File) => {
    const path = buildUniquePath(slug, file.name, pendingImages)
    onAddPendingImage?.(path, file)
    return path
  }

  // 미리보기 처리: 마크다운에 들어간 경로(src)가 보류 목록의 경로라면 objectURL로 교체
  const imagePreviewHandler = async (src: string) => {
    const found = pendingImages[src]
    return found?.objectURL ?? src
  }

  return { imageUploadHandler, imagePreviewHandler }
}
