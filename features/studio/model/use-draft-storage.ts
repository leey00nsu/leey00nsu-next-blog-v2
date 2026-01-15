'use client'

import { useCallback, useState, useEffect } from 'react'
import { putDraft, getDraft, deleteDraft } from '@/shared/lib/indexed-db'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'

const DRAFT_ID = 'current-draft'

/**
 * IndexedDB에 저장되는 임시 저장 데이터 구조
 */
export interface DraftData {
  id: string
  frontmatter: Frontmatter
  bodyMarkdown: string
  // 이미지는 path -> ArrayBuffer 형태로 저장 (Blob은 직렬화 불가)
  images: Record<string, { buffer: ArrayBuffer; type: string; name: string }>
  savedAt: number
}

/**
 * File을 ArrayBuffer로 변환
 */
async function fileToBuffer(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer()
}

/**
 * ArrayBuffer를 File로 복원
 */
function bufferToFile(buffer: ArrayBuffer, name: string, type: string): File {
  return new File([buffer], name, { type })
}

interface UseDraftStorageOptions {
  /** 자동 저장 debounce 시간 (ms) */
  debounceMs?: number
}

/**
 * 스튜디오 임시 저장 기능을 제공하는 hook
 */
export function useDraftStorage(options: UseDraftStorageOptions = {}) {
  const { debounceMs = 2000 } = options
  const [hasDraft, setHasDraft] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null)

  // 초기화 시 임시 저장 데이터 존재 여부 확인
  useEffect(() => {
    getDraft<DraftData>(DRAFT_ID).then((draft) => {
      if (draft) {
        setHasDraft(true)
        setLastSavedAt(draft.savedAt)
      }
    })
  }, [])

  /**
   * 현재 작업 상태를 IndexedDB에 저장
   */
  const saveDraft = useCallback(
    async (
      frontmatter: Frontmatter,
      bodyMarkdown: string,
      pendingImages: Record<string, { file?: File; objectURL: string }>,
    ) => {
      setIsSaving(true)
      try {
        // 이미지 File을 ArrayBuffer로 변환
        const images: DraftData['images'] = {}
        for (const [path, entry] of Object.entries(pendingImages)) {
          if (entry.file) {
            const buffer = await fileToBuffer(entry.file)
            images[path] = {
              buffer,
              type: entry.file.type,
              name: entry.file.name,
            }
          }
        }

        const draft: DraftData = {
          id: DRAFT_ID,
          frontmatter,
          bodyMarkdown,
          images,
          savedAt: Date.now(),
        }

        await putDraft(draft)
        setHasDraft(true)
        setLastSavedAt(draft.savedAt)
      } catch (error) {
        console.error('Failed to save draft:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [],
  )

  /**
   * 저장된 임시 데이터 불러오기
   */
  const loadDraft = useCallback(async () => {
    const draft = await getDraft<DraftData>(DRAFT_ID)
    if (!draft) return null

    // ArrayBuffer를 File/objectURL로 복원
    const restoredImages: Record<string, { file: File; objectURL: string }> = {}

    for (const [path, entry] of Object.entries(draft.images)) {
      const file = bufferToFile(entry.buffer, entry.name, entry.type)
      const objectURL = URL.createObjectURL(file)
      restoredImages[path] = { file, objectURL }
    }

    return {
      frontmatter: draft.frontmatter,
      bodyMarkdown: draft.bodyMarkdown,
      pendingImages: restoredImages,
      savedAt: draft.savedAt,
    }
  }, [])

  /**
   * 임시 저장 데이터 삭제 (커밋 성공 후 호출)
   */
  const clearDraft = useCallback(async () => {
    await deleteDraft(DRAFT_ID)
    setHasDraft(false)
    setLastSavedAt(null)
  }, [])

  return {
    hasDraft,
    isSaving,
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
    debounceMs,
  }
}
