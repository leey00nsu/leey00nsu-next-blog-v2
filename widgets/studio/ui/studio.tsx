'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TiptapEditorMethods } from '@/features/editor/ui/tiptap-editor'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'
import type { PendingImageMap } from '@/features/editor/model/types'
import { collectUsedImageSrcs } from '@/features/editor/lib/image-utils'
import { signOut } from 'next-auth/react'
import { useCommitPost } from '@/features/studio/model/use-commit-post'
import { useDraftStorage } from '@/features/studio/model/use-draft-storage'
import {
  Loader2,
  Eye,
  EyeOff,
  Code,
  FileText,
  ExternalLink,
  RotateCcw,
} from 'lucide-react'
import { useRemapImagesOnSlugChange } from '@/features/studio/model/use-remap-images-on-slug-change'
import { useOpenPreviewNewTab } from '@/features/studio/model/use-open-preview-new-tab'
import { FRONTMATTER_BLOCK_REGEX } from '@/shared/config/constants'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { LOCALES } from '@/shared/config/constants'
import { LanguageSelector } from '@/features/studio/ui/language-selector'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { MdxClientRenderer } from '@/features/mdx/ui/mdx-client-renderer'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'

const TiptapEditor = dynamic(
  () =>
    import('@/features/editor/ui/tiptap-editor').then((m) => m.TiptapEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    ),
  },
)

export interface StudioProps {
  existingSlugs: string[]
  existingTags: string[]
}

export function Studio({ existingSlugs, existingTags }: StudioProps) {
  const t = useTranslations('studio')
  const currentLocale = useLocale()
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()
  const [pendingImages, setPendingImages] = useState<PendingImageMap>({})
  const [isFrontmatterValid, setIsFrontmatterValid] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const { isSaving, commitPost } = useCommitPost()
  const editorRef = useRef<TiptapEditorMethods | null>(null)
  const {
    hasDraft,
    isSaving: isDraftSaving,
    lastSavedAt,
    saveDraft,
    loadDraft,
    clearDraft,
    debounceMs,
  } = useDraftStorage()
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 언어 선택 상태
  const [sourceLocale, setSourceLocale] = useState<string>(currentLocale)
  const [targetLocales, setTargetLocales] = useState<string[]>([
    ...LOCALES.SUPPORTED,
  ])

  const bodyMarkdown = useMemo(
    () => markdown.replace(FRONTMATTER_BLOCK_REGEX, ''),
    [markdown],
  )
  const finalMarkdown = useMemo(() => {
    if (!frontMatter) return bodyMarkdown
    return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
  }, [frontMatter, bodyMarkdown])

  // 본문에서 사용 중인 pending 이미지들을 썸네일 후보로 표시
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

  // 페이지 로드 시 임시 저장 데이터가 있으면 복원 다이얼로그 표시
  useEffect(() => {
    if (hasDraft) {
      setShowRestoreDialog(true)
    }
  }, [hasDraft])

  // 자동 저장: frontmatter 또는 본문이 변경될 때마다 debounce로 저장
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

  // 임시 저장 데이터 복원 핸들러
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

  // 임시 저장 데이터 폐기 핸들러
  const handleDiscardDraft = useCallback(async () => {
    await clearDraft()
    setShowRestoreDialog(false)
  }, [clearDraft])

  const handleFrontmatterChange = useCallback((fm: Frontmatter) => {
    setFrontMatter(fm)
  }, [])

  const save = async () => {
    const { ok, filteredPending } = await commitPost({
      frontMatter,
      bodyMarkdown,
      finalMarkdown,
      pendingImages,
      sourceLocale,
      targetLocales,
    })
    setPendingImages(filteredPending)
    // 커밋 성공 시 임시 저장 데이터 삭제
    if (ok) {
      await clearDraft()
    }
  }

  const handleAddPendingImage = useCallback(
    (path: string, file: File, objectURL: string) => {
      setPendingImages((prev) => {
        const prevEntry = prev[path]
        // 이전 objectURL이 있고 새로운 것과 다르면 해제
        if (prevEntry && prevEntry.objectURL !== objectURL) {
          URL.revokeObjectURL(prevEntry.objectURL)
        }
        return { ...prev, [path]: { file, objectURL } }
      })
    },
    [],
  )

  // 새 탭에서 미리보기 열기
  const { isOpeningPreview, openPreviewNewTab } = useOpenPreviewNewTab({
    frontMatter,
    bodyMarkdown,
    pendingImages,
  })

  // 슬러그 변경 시: 마크다운 내 이미지 경로와 pendingImages 키를 모두 새 슬러그로 갱신
  // - '/public/posts/{old}/...' -> '/public/posts/{next}/...'
  // - '/public/posts/.../...'   -> '/public/posts/{next}/...'
  useRemapImagesOnSlugChange({
    slug: frontMatter?.slug,
    markdown,
    setMarkdown,
    pendingImages,
    setPendingImages,
    setFrontMatter,
    editorRef,
  })

  return (
    <>
      {/* 임시 저장 복원 다이얼로그 */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>임시 저장된 글이 있습니다</AlertDialogTitle>
            <AlertDialogDescription>
              이전에 작성 중이던 글을 복원하시겠습니까?
              {lastSavedAt && (
                <span className="mt-2 block text-xs">
                  마지막 저장: {new Date(lastSavedAt).toLocaleString('ko-KR')}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDiscardDraft}>
              새로 시작
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreDraft}>
              <RotateCcw size={16} className="mr-2" />
              복원하기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* 자동 저장 상태 표시 */}
        {(isDraftSaving || lastSavedAt) && (
          <div className="text-muted-foreground text-right text-xs">
            {isDraftSaving ? (
              <span>자동 저장 중...</span>
            ) : lastSavedAt ? (
              <span>
                자동 저장됨 {new Date(lastSavedAt).toLocaleTimeString('ko-KR')}
              </span>
            ) : null}
          </div>
        )}
        <LanguageSelector
          className="border-border rounded-lg border p-4"
          sourceLocale={sourceLocale}
          onSourceChange={setSourceLocale}
          targetLocales={targetLocales}
          onTargetsChange={(next) => setTargetLocales(next)}
        />
        <FrontmatterForm
          value={frontMatter}
          onChange={handleFrontmatterChange}
          onValidityChange={setIsFrontmatterValid}
          existingSlugs={existingSlugs}
          suggestionTags={existingTags}
          thumbnailChoices={thumbnailChoices}
        />
        <TiptapEditor
          editorRef={editorRef}
          value={markdown}
          fieldChange={setMarkdown}
          slug={frontMatter?.slug}
          pendingImages={pendingImages}
          onAddPendingImage={handleAddPendingImage}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? t('preview.close') : t('preview.inline')}
          </Button>
          <Button
            variant="outline"
            onClick={openPreviewNewTab}
            disabled={
              !frontMatter ||
              bodyMarkdown.trim().length === 0 ||
              isOpeningPreview
            }
            className="flex items-center gap-2"
          >
            {isOpeningPreview ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <ExternalLink size={16} />
            )}
            {t('preview.newTab')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={
                  !isFrontmatterValid ||
                  bodyMarkdown.trim().length === 0 ||
                  isSaving
                }
              >
                {isSaving ? (
                  <>
                    <Loader2 className="animate-spin" /> {t('actions.saving')}
                  </>
                ) : (
                  t('actions.save')
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>게시글 저장</AlertDialogTitle>
                <AlertDialogDescription>
                  게시글을 GitHub에 커밋합니다. 계속하시겠습니까?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={save}>저장</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">{t('actions.logout')}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>로그아웃</AlertDialogTitle>
                <AlertDialogDescription>
                  로그아웃하시겠습니까? 저장하지 않은 내용은 사라집니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={() => signOut()}>
                  로그아웃
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {showPreview && (
          <div className="border-border rounded-lg border">
            <Tabs defaultValue="rendered" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                <TabsTrigger
                  value="rendered"
                  className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
                >
                  <FileText size={16} />
                  결과 미리보기
                </TabsTrigger>
                <TabsTrigger
                  value="mdx"
                  className="data-[state=active]:border-primary flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:bg-transparent"
                >
                  <Code size={16} />
                  MDX 미리보기
                </TabsTrigger>
              </TabsList>
              <TabsContent value="rendered" className="p-4">
                <MdxClientRenderer
                  content={bodyMarkdown}
                  pendingImages={pendingImages}
                />
              </TabsContent>
              <TabsContent value="mdx" className="p-4">
                <pre className="bg-muted overflow-auto rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {finalMarkdown || '(내용 없음)'}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </>
  )
}
