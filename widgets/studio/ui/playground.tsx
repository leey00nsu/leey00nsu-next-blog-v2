'use client'

import { useState } from 'react'
import { useSaveLocal } from '@/features/studio/model/use-save-local'
import { useStudioEditor } from '@/features/studio/model/use-studio-editor'
import { StudioBase } from '@/widgets/studio/ui/studio-base'
import { Button } from '@/shared/ui/button'
import { Checkbox } from '@/shared/ui/checkbox'
import { Label } from '@/shared/ui/label'
import { Loader2, Save } from 'lucide-react'

export interface PlaygroundProps {
  existingSlugs?: string[]
  existingTags?: string[]
}

export function Playground({
  existingSlugs = [],
  existingTags = [],
}: PlaygroundProps) {
  const editor = useStudioEditor({ existingSlugs, existingTags })
  const { isSaving, saveLocal } = useSaveLocal()
  const [enableTranslation, setEnableTranslation] = useState(false)

  const {
    frontMatter,
    bodyMarkdown,
    finalMarkdown,
    pendingImages,
    sourceLocale,
    targetLocales,
    clearDraft,
  } = editor

  const handleSaveLocal = async () => {
    const { ok, filteredPending } = await saveLocal({
      frontMatter,
      bodyMarkdown,
      finalMarkdown,
      pendingImages,
      sourceLocale,
      enableTranslation,
      targetLocales: targetLocales.filter((l) => l !== sourceLocale),
    })
    editor.setPendingImages(filteredPending)
    if (ok) {
      await clearDraft()
    }
  }

  return (
    <StudioBase
      editor={editor}
      headerContent={
        <div className="rounded-lg border border-amber-300 bg-amber-100 p-4 dark:border-amber-700 dark:bg-amber-900/30">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            🎮 Playground 모드 - 로컬에 저장하여 게시글을 미리 확인할 수
            있습니다. (개발 환경 전용)
          </p>
        </div>
      }
      renderActions={({ isFrontmatterValid, bodyMarkdown }) => (
        <>
          {/* 번역 옵션 */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="enableTranslation"
              checked={enableTranslation}
              onCheckedChange={(checked) =>
                setEnableTranslation(checked === true)
              }
            />
            <Label
              htmlFor="enableTranslation"
              className="cursor-pointer text-sm"
            >
              저장 시 번역 포함
            </Label>
          </div>

          {/* 로컬 저장 버튼 */}
          <Button
            disabled={
              !isFrontmatterValid ||
              bodyMarkdown.trim().length === 0 ||
              isSaving
            }
            onClick={handleSaveLocal}
            className="flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                {enableTranslation ? '저장 및 번역 중...' : '저장 중...'}
              </>
            ) : (
              <>
                <Save size={16} />
                {enableTranslation ? '로컬에 저장 (번역 포함)' : '로컬에 저장'}
              </>
            )}
          </Button>
        </>
      )}
    />
  )
}
