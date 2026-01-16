'use client'

/**
 * BubbleMenu 컴포넌트
 *
 * 텍스트 선택 시 나타나는 플로팅 툴바입니다.
 * 굵게, 기울임, 밑줄, 취소선, 코드, 링크, AI 어시스턴트 버튼을 포함합니다.
 *
 * _Requirements: 3.1, 3.2, 3.3_
 */

import type { Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
} from 'lucide-react'
import { useCallback, useState } from 'react'
import { LinkDialog } from '@/features/editor/ui/link-dialog'
import { AIBubbleMenu } from '@/features/editor/ui/ai-bubble-menu'
import { Separator } from '@/shared/ui/separator'
import type { AIResultState } from '@/features/editor/model/ai-result-state'

interface EditorBubbleMenuProps {
  editor: Editor
  aiState: AIResultState
  onAIStateChange: (state: AIResultState) => void
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive: boolean
  icon: React.ReactNode
  title: string
}

function ToolbarButton({ onClick, isActive, icon, title }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded p-1.5 transition-colors ${
        isActive
          ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
    </button>
  )
}

export function EditorBubbleMenu({
  editor,
  aiState,
  onAIStateChange,
}: EditorBubbleMenuProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)

  const toggleBold = useCallback(() => {
    editor.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleUnderline = useCallback(() => {
    editor.chain().focus().toggleUnderline().run()
  }, [editor])

  const toggleStrike = useCallback(() => {
    editor.chain().focus().toggleStrike().run()
  }, [editor])

  const toggleCode = useCallback(() => {
    editor.chain().focus().toggleCode().run()
  }, [editor])

  const handleLinkClick = useCallback(() => {
    setLinkDialogOpen(true)
  }, [])

  const handleLinkSubmit = useCallback(
    (data: { href: string }) => {
      editor.chain().focus().setLink({ href: data.href }).run()
    },
    [editor],
  )

  const handleLinkRemove = useCallback(() => {
    editor.chain().focus().unsetLink().run()
  }, [editor])

  // 현재 링크 URL 가져오기
  const currentLinkUrl = editor.isActive('link')
    ? (editor.getAttributes('link').href as string) || ''
    : ''

  const iconSize = 16

  return (
    <>
      <ToolbarButton
        onClick={toggleBold}
        isActive={editor.isActive('bold')}
        icon={<Bold size={iconSize} />}
        title="굵게 (Ctrl+B)"
      />
      <ToolbarButton
        onClick={toggleItalic}
        isActive={editor.isActive('italic')}
        icon={<Italic size={iconSize} />}
        title="기울임 (Ctrl+I)"
      />
      <ToolbarButton
        onClick={toggleUnderline}
        isActive={editor.isActive('underline')}
        icon={<Underline size={iconSize} />}
        title="밑줄 (Ctrl+U)"
      />
      <ToolbarButton
        onClick={toggleStrike}
        isActive={editor.isActive('strike')}
        icon={<Strikethrough size={iconSize} />}
        title="취소선"
      />
      <ToolbarButton
        onClick={toggleCode}
        isActive={editor.isActive('code')}
        icon={<Code size={iconSize} />}
        title="인라인 코드"
      />
      <ToolbarButton
        onClick={handleLinkClick}
        isActive={editor.isActive('link')}
        icon={<Link size={iconSize} />}
        title="링크"
      />

      {/* AI 어시스턴트 구분선 및 메뉴 */}
      <Separator orientation="vertical" className="mx-1 h-6" />
      <AIBubbleMenu
        editor={editor}
        aiState={aiState}
        onAIStateChange={onAIStateChange}
      />

      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onSubmit={handleLinkSubmit}
        onRemove={handleLinkRemove}
        initialUrl={currentLinkUrl}
        isEditing={editor.isActive('link')}
      />
    </>
  )
}
