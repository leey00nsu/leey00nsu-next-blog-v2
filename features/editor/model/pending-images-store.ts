/**
 * Pending Images Store
 *
 * 에디터에서 업로드된 이미지의 objectURL을 저장하는 전역 스토어입니다.
 * Tiptap NodeView에서 React Context에 접근할 수 없어서 전역 스토어를 사용합니다.
 */

import type { PendingImageMap } from '@/features/editor/model/types'

// 전역 pending images 저장소
let globalPendingImages: PendingImageMap = {}

/**
 * pending images를 설정합니다.
 */
export function setPendingImagesStore(images: PendingImageMap): void {
    globalPendingImages = images
}

/**
 * pending images를 가져옵니다.
 */
export function getPendingImagesStore(): PendingImageMap {
    return globalPendingImages
}

/**
 * 특정 경로의 objectURL을 가져옵니다.
 */
export function getObjectURLForPath(path: string): string | undefined {
    return globalPendingImages[path]?.objectURL
}
