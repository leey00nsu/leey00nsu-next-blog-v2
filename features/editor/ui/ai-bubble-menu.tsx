'use client'

/**
 * AIBubbleMenu 컴포넌트
 *
 * 텍스트 선택 시 AI 기능을 제공하는 드롭다운 메뉴입니다.
 * 개선하기, 요약하기, 더 길게, 다시 쓰기, 번역하기 기능을 포함합니다.
 *
 * Notion 스타일: AI 결과를 인라인 블록으로 표시하고 사용자가 액션을 선택합니다.
 * 상태는 TiptapEditor에서 관리하여 버블 메뉴가 닫혀도 AI 결과 블록이 유지됩니다.
 */

import type { Editor } from '@tiptap/react'
import { useCallback, useRef } from 'react'
import {
  Sparkles,
  FileText,
  Expand,
  RefreshCw,
  Languages,
  Loader2,
  ImagePlus,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/shared/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  AI_TEXT_ACTIONS,
  AI_ACTION_MENU_ITEMS,
  type AITextAction,
} from '@/features/editor/config/constants'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'
import type { AIResultState } from '@/features/editor/model/ai-result-state'

interface AIBubbleMenuProps {
  editor: Editor
  aiState: AIResultState
  onAIStateChange: (state: AIResultState) => void
}

const ICON_MAP = {
  Sparkles,
  FileText,
  Expand,
  RefreshCw,
  Languages,
  ImagePlus,
} as const

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: '한국어',
  en: 'English',
}

export function AIBubbleMenu({
  editor,
  aiState,
  onAIStateChange,
}: AIBubbleMenuProps) {
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleImageGeneration = useCallback(async () => {
    const { from, to } = editor.state.selection
    const selectedText = editor.state.doc.textBetween(from, to)

    if (!selectedText.trim()) {
      toast.error('이미지 프롬프트로 사용할 텍스트를 선택해주세요.')
      return
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    const { view } = editor
    const coordsEnd = view.coordsAtPos(to)
    const coordsStart = view.coordsAtPos(from)

    onAIStateChange({
      isVisible: true,
      isLoading: true,
      result: null,
      error: null,
      originalText: selectedText,
      originalFrom: from,
      originalTo: to,
      position: { top: coordsEnd.bottom + 8, left: coordsStart.left },
    })

    try {
      const response = await fetch('/api/editor/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: selectedText }),
        signal: abortControllerRef.current.signal,
      })

      const result = await response.json()

      if (!result.ok) {
        onAIStateChange({
          isVisible: true,
          isLoading: false,
          result: null,
          error: result.error || '이미지 생성 중 오류가 발생했습니다.',
          originalText: selectedText,
          originalFrom: from,
          originalTo: to,
          position: { top: coordsEnd.bottom + 8, left: coordsStart.left },
        })
        return
      }

      editor
        .chain()
        .focus()
        .setTextSelection(to)
        .insertContent({
          type: 'image',
          attrs: {
            src: result.imageUrl,
            alt: selectedText,
            title: selectedText,
          },
        })
        .run()

      onAIStateChange({
        isVisible: false,
        isLoading: false,
        result: null,
        error: null,
        originalText: '',
        originalFrom: 0,
        originalTo: 0,
        position: { top: 0, left: 0 },
      })

      toast.success('이미지가 생성되었습니다.')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      console.error('Image generation error:', error)
      onAIStateChange({
        isVisible: true,
        isLoading: false,
        result: null,
        error: '이미지 생성 중 오류가 발생했습니다.',
        originalText: selectedText,
        originalFrom: from,
        originalTo: to,
        position: { top: coordsEnd.bottom + 8, left: coordsStart.left },
      })
    }
  }, [editor, onAIStateChange])

  const handleAIAction = useCallback(
    async (action: AITextAction, targetLocale?: string) => {
      // 이미지 생성은 별도 핸들러로 처리
      if (action === AI_TEXT_ACTIONS.GENERATE_IMAGE) {
        await handleImageGeneration()
        return
      }

      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)

      if (!selectedText.trim()) {
        toast.error('텍스트를 선택해주세요.')
        return
      }

      // 이전 요청 중단
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      // 선택 영역 아래 위치 계산 (Y는 텍스트 아래, X는 텍스트 시작 위치)
      const { view } = editor
      const coordsEnd = view.coordsAtPos(to)
      const coordsStart = view.coordsAtPos(from)

      onAIStateChange({
        isVisible: true,
        isLoading: true,
        result: null,
        error: null,
        originalText: selectedText,
        originalFrom: from,
        originalTo: to,
        position: { top: coordsEnd.bottom + 8, left: coordsStart.left },
      })

      try {
        const response = await fetch('/api/editor/transform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: selectedText,
            action,
            targetLocale,
          }),
          signal: abortControllerRef.current.signal,
        })

        const result = await response.json()

        // 초기 상태 캡처 (위치 정보 유지)
        const currentPosition = {
          top: coordsEnd.bottom + 8,
          left: coordsStart.left,
        }

        if (!result.ok) {
          onAIStateChange({
            isVisible: true,
            isLoading: false,
            result: null,
            error: result.error || 'AI 처리 중 오류가 발생했습니다.',
            originalText: selectedText,
            originalFrom: from,
            originalTo: to,
            position: currentPosition,
          })
          return
        }

        onAIStateChange({
          isVisible: true,
          isLoading: false,
          result: result.text,
          error: null,
          originalText: selectedText,
          originalFrom: from,
          originalTo: to,
          position: currentPosition,
        })
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          return // 사용자가 취소함
        }
        console.error('AI action error:', error)
        const currentPosition = {
          top: coordsEnd.bottom + 8,
          left: coordsStart.left,
        }
        onAIStateChange({
          isVisible: true,
          isLoading: false,
          result: null,
          error: 'AI 처리 중 오류가 발생했습니다.',
          originalText: selectedText,
          originalFrom: from,
          originalTo: to,
          position: currentPosition,
        })
      }
    },
    [editor, onAIStateChange, handleImageGeneration],
  )

  const iconSize = 16
  const isLoading = aiState.isLoading

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={isLoading}
          title="AI 어시스턴트"
          className="rounded p-1.5 text-purple-600 transition-colors hover:bg-purple-100 disabled:opacity-50 dark:text-purple-400 dark:hover:bg-purple-900/30"
        >
          {isLoading ? (
            <Loader2 size={iconSize} className="animate-spin" />
          ) : (
            <Sparkles size={iconSize} />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8}>
        {AI_ACTION_MENU_ITEMS.filter(
          (item) =>
            item.action !== AI_TEXT_ACTIONS.TRANSLATE &&
            item.action !== AI_TEXT_ACTIONS.GENERATE_IMAGE,
        ).map((item) => {
          const IconComponent = ICON_MAP[item.icon as keyof typeof ICON_MAP]

          return (
            <DropdownMenuItem
              key={item.action}
              onClick={() => handleAIAction(item.action)}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <IconComponent size={iconSize} />
              <div className="flex flex-col">
                <span>{item.label}</span>
                <span className="text-xs text-gray-500">
                  {item.description}
                </span>
              </div>
            </DropdownMenuItem>
          )
        })}

        {/* 번역 서브메뉴 */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <Languages size={iconSize} />
            <div className="flex flex-col">
              <span>번역하기</span>
              <span className="text-xs text-gray-500">다른 언어로 번역</span>
            </div>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {(LOCALES.SUPPORTED as readonly SupportedLocale[]).map((locale) => (
              <DropdownMenuItem
                key={locale}
                onClick={() =>
                  handleAIAction(AI_TEXT_ACTIONS.TRANSLATE, locale)
                }
                disabled={isLoading}
              >
                {LOCALE_LABELS[locale]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* 이미지 생성 */}
        <DropdownMenuItem
          onClick={() => handleAIAction(AI_TEXT_ACTIONS.GENERATE_IMAGE)}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <ImagePlus size={iconSize} />
          <div className="flex flex-col">
            <span>이미지 생성</span>
            <span className="text-xs text-gray-500">텍스트로 이미지 생성</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
