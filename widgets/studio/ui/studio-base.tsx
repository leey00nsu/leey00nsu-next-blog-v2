'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { LanguageSelector } from '@/features/studio/ui/language-selector'
import { MdxClientRenderer } from '@/features/mdx/ui/mdx-client-renderer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Button } from '@/shared/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog'
import { Loader2, Eye, EyeOff, Code, FileText, RotateCcw } from 'lucide-react'
import type { UseStudioEditorReturn } from '@/features/studio/model/use-studio-editor'

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

export interface StudioBaseProps {
  /** useStudioEditor hook 반환값 */
  editor: UseStudioEditorReturn
  /** 상단 커스텀 콘텐츠 (안내 배너 등) */
  headerContent?: ReactNode
  /** 액션 버튼 영역 (저장, 로그아웃 등) */
  renderActions: (props: {
    isFrontmatterValid: boolean
    bodyMarkdown: string
    finalMarkdown: string
    frontMatter: UseStudioEditorReturn['frontMatter']
    pendingImages: UseStudioEditorReturn['pendingImages']
    sourceLocale: string
    targetLocales: string[]
    clearDraft: () => Promise<void>
  }) => ReactNode
}

/**
 * Studio/Playground 공통 UI 베이스 컴포넌트
 */
export function StudioBase({
  editor,
  headerContent,
  renderActions,
}: StudioBaseProps) {
  const {
    markdown,
    setMarkdown,
    frontMatter,
    pendingImages,
    isFrontmatterValid,
    showPreview,
    setShowPreview,
    showRestoreDialog,
    setShowRestoreDialog,
    editorRef,
    sourceLocale,
    setSourceLocale,
    targetLocales,
    setTargetLocales,
    bodyMarkdown,
    finalMarkdown,
    thumbnailChoices,
    isDraftSaving,
    lastSavedAt,
    handleFrontmatterChange,
    handleValidityChange,
    handleAddPendingImage,
    handleRestoreDraft,
    handleDiscardDraft,
    clearDraft,
    existingSlugs,
    existingTags,
  } = editor

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
        {/* 헤더 콘텐츠 (안내 배너 등) */}
        {headerContent}

        {/* 자동 저장 상태 */}
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

        {/* 언어 선택 */}
        <LanguageSelector
          className="border-border rounded-lg border p-4"
          sourceLocale={sourceLocale}
          onSourceChange={setSourceLocale}
          targetLocales={targetLocales}
          onTargetsChange={setTargetLocales}
        />

        {/* Frontmatter 폼 */}
        <FrontmatterForm
          value={frontMatter}
          onChange={handleFrontmatterChange}
          onValidityChange={handleValidityChange}
          existingSlugs={existingSlugs}
          suggestionTags={existingTags}
          thumbnailChoices={thumbnailChoices}
        />

        {/* 에디터 */}
        <TiptapEditor
          editorRef={editorRef}
          value={markdown}
          fieldChange={setMarkdown}
          slug={frontMatter?.slug}
          pendingImages={pendingImages}
          onAddPendingImage={handleAddPendingImage}
        />

        {/* 액션 버튼 영역 */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? '미리보기 닫기' : '미리보기'}
          </Button>

          {renderActions({
            isFrontmatterValid,
            bodyMarkdown,
            finalMarkdown,
            frontMatter,
            pendingImages,
            sourceLocale,
            targetLocales,
            clearDraft,
          })}
        </div>

        {/* 미리보기 */}
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
