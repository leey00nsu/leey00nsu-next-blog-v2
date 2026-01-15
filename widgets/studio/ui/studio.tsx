'use client'

import { signOut } from 'next-auth/react'
import { useCommitPost } from '@/features/studio/model/use-commit-post'
import { useStudioEditor } from '@/features/studio/model/use-studio-editor'
import { useOpenPreviewNewTab } from '@/features/studio/model/use-open-preview-new-tab'
import { StudioBase } from '@/widgets/studio/ui/studio-base'
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
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { Loader2, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'

export interface StudioProps {
  existingSlugs: string[]
  existingTags: string[]
}

export function Studio({ existingSlugs, existingTags }: StudioProps) {
  const t = useTranslations('studio')
  const editor = useStudioEditor({ existingSlugs, existingTags })
  const { isSaving, commitPost } = useCommitPost()

  const {
    frontMatter,
    bodyMarkdown,
    finalMarkdown,
    pendingImages,
    sourceLocale,
    targetLocales,
    clearDraft,
  } = editor

  // 새 탭에서 미리보기 열기
  const { isOpeningPreview, openPreviewNewTab } = useOpenPreviewNewTab({
    frontMatter,
    bodyMarkdown,
    pendingImages,
  })

  const handleSave = async () => {
    const { ok, filteredPending } = await commitPost({
      frontMatter,
      bodyMarkdown,
      finalMarkdown,
      pendingImages,
      sourceLocale,
      targetLocales,
    })
    editor.setPendingImages(filteredPending)
    if (ok) {
      await clearDraft()
    }
  }

  return (
    <StudioBase
      editor={editor}
      renderActions={({ isFrontmatterValid, bodyMarkdown }) => (
        <>
          {/* 새 탭 미리보기 */}
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

          {/* 저장 버튼 */}
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
                <AlertDialogAction onClick={handleSave}>저장</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* 로그아웃 */}
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
        </>
      )}
    />
  )
}
