'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TiptapEditorMethods } from '@/features/editor/ui/tiptap-editor'
import type { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import type { PendingImageMap } from '@/features/editor/model/types'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { collectUsedImageSrcs } from '@/features/editor/lib/image-utils'
import { useDraftStorage } from '@/features/studio/model/use-draft-storage'
import { useRemapImagesOnSlugChange } from '@/features/studio/model/use-remap-images-on-slug-change'
import { FRONTMATTER_BLOCK_REGEX, LOCALES } from '@/shared/config/constants'
import { useLocale } from 'next-intl'

export interface UseStudioEditorOptions {
  existingSlugs?: string[]
  existingTags?: string[]
}

export interface UseStudioEditorReturn {
  // 상태
  markdown: string
  setMarkdown: React.Dispatch<React.SetStateAction<string>>
  frontMatter: Frontmatter | undefined
  setFrontMatter: React.Dispatch<React.SetStateAction<Frontmatter | undefined>>
  pendingImages: PendingImageMap
  setPendingImages: React.Dispatch<React.SetStateAction<PendingImageMap>>
  isFrontmatterValid: boolean
  setIsFrontmatterValid: React.Dispatch<React.SetStateAction<boolean>>
  showPreview: boolean
  setShowPreview: React.Dispatch<React.SetStateAction<boolean>>
  showRestoreDialog: boolean
  setShowRestoreDialog: React.Dispatch<React.SetStateAction<boolean>>
  editorRef: React.MutableRefObject<TiptapEditorMethods | null>

  // 언어 설정
  sourceLocale: string
  setSourceLocale: React.Dispatch<React.SetStateAction<string>>
  targetLocales: string[]
  setTargetLocales: React.Dispatch<React.SetStateAction<string[]>>

  // 계산된 값
  bodyMarkdown: string
  finalMarkdown: string
  thumbnailChoices: { path: string; previewUrl: string }[]

  // 임시 저장 상태
  isDraftSaving: boolean
  lastSavedAt: number | null
  hasDraft: boolean

  // 핸들러
  handleFrontmatterChange: (fm: Frontmatter) => void
  handleValidityChange: (valid: boolean) => void
  handleAddPendingImage: (path: string, file: File, objectURL: string) => void
  handleRestoreDraft: () => Promise<void>
  handleDiscardDraft: () => Promise<void>
  clearDraft: () => Promise<void>

  // Props 전달용
  existingSlugs: string[]
  existingTags: string[]
}

/**
 * Studio/Playground 공통 에디터 상태 및 로직을 관리하는 hook
 */
export function useStudioEditor(
  options: UseStudioEditorOptions = {},
): UseStudioEditorReturn {
  const { existingSlugs = [], existingTags = [] } = options

  const currentLocale = useLocale()
  const editorRef = useRef<TiptapEditorMethods | null>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 기본 상태
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()
  const [pendingImages, setPendingImages] = useState<PendingImageMap>({})
  const [isFrontmatterValid, setIsFrontmatterValid] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)

  // 언어 설정
  const [sourceLocale, setSourceLocale] = useState<string>(currentLocale)
  const [targetLocales, setTargetLocales] = useState<string[]>([
    ...LOCALES.SUPPORTED,
  ])

  // 임시 저장 hook
  const {
    hasDraft,
    isSaving: isDraftSaving,
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
    debounceMs,
  } = useDraftStorage()

  // 계산된 값
  const bodyMarkdown = useMemo(
    () => markdown.replace(FRONTMATTER_BLOCK_REGEX, ''),
    [markdown],
  )

  const finalMarkdown = useMemo(() => {
    if (!frontMatter) return bodyMarkdown
    return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
  }, [frontMatter, bodyMarkdown])

  const usedSrcs = useMemo(
    () => collectUsedImageSrcs(bodyMarkdown),
    [bodyMarkdown],
  )

  const thumbnailChoices = useMemo(
    () =>
      Object.entries(pendingImages)
        .filter(([path]) => usedSrcs.has(path))
        .map(([path, entry]) => ({ path, previewUrl: entry.objectURL })),
    [pendingImages, usedSrcs],
  )

  // 이미 복원 대화상자를 처리했는지 추적 (HMR/Strict Mode 중복 방지)
  const hasCheckedDraftRef = useRef(false)

  // 페이지 로드 시 임시 저장 데이터 확인 (한 번만 실행)
  useEffect(() => {
    if (hasDraft && !hasCheckedDraftRef.current) {
      hasCheckedDraftRef.current = true
      setShowRestoreDialog(true)
    }
  }, [hasDraft])

  // 자동 저장
  useEffect(() => {
    if (!frontMatter || bodyMarkdown.trim().length === 0) return

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      saveDraft(frontMatter, bodyMarkdown, pendingImages)
    }, debounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [frontMatter, bodyMarkdown, pendingImages, saveDraft, debounceMs])

  // 슬러그 변경 시 이미지 경로 리매핑
  useRemapImagesOnSlugChange({
    slug: frontMatter?.slug,
    markdown,
    setMarkdown,
    pendingImages,
    setPendingImages,
    setFrontMatter,
    editorRef,
  })

  // 핸들러
  const handleFrontmatterChange = useCallback((fm: Frontmatter) => {
    setFrontMatter(fm)
  }, [])

  const handleValidityChange = useCallback((valid: boolean) => {
    setIsFrontmatterValid(valid)
  }, [])

  const handleAddPendingImage = useCallback(
    (path: string, file: File, objectURL: string) => {
      setPendingImages((prev) => {
        const prevEntry = prev[path]
        if (prevEntry && prevEntry.objectURL !== objectURL) {
          URL.revokeObjectURL(prevEntry.objectURL)
        }
        return { ...prev, [path]: { file, objectURL } }
      })
    },
    [],
  )

  const handleRestoreDraft = useCallback(async () => {
    const draft = await loadDraft()
    if (draft) {
      setFrontMatter(draft.frontmatter)
      setMarkdown(draft.bodyMarkdown)
      setPendingImages(draft.pendingImages)
      editorRef.current?.setMarkdown(draft.bodyMarkdown)
    }
    setShowRestoreDialog(false)
  }, [loadDraft])

  const handleDiscardDraft = useCallback(async () => {
    await clearDraft()
    setShowRestoreDialog(false)
  }, [clearDraft])

  return {
    // 상태
    markdown,
    setMarkdown,
    frontMatter,
    setFrontMatter,
    pendingImages,
    setPendingImages,
    isFrontmatterValid,
    setIsFrontmatterValid,
    showPreview,
    setShowPreview,
    showRestoreDialog,
    setShowRestoreDialog,
    editorRef,

    // 언어 설정
    sourceLocale,
    setSourceLocale,
    targetLocales,
    setTargetLocales,

    // 계산된 값
    bodyMarkdown,
    finalMarkdown,
    thumbnailChoices,

    // 임시 저장 상태
    isDraftSaving,
    lastSavedAt,
    hasDraft,

    // 핸들러
    handleFrontmatterChange,
    handleValidityChange,
    handleAddPendingImage,
    handleRestoreDraft,
    handleDiscardDraft,
    clearDraft,

    // Props 전달용
    existingSlugs,
    existingTags,
  }
}
