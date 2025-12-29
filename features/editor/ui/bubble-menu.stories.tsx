/**
 * BubbleMenu 스토리
 *
 * 텍스트 선택 시 나타나는 플로팅 툴바 컴포넌트의 Storybook 스토리입니다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { EditorBubbleMenu } from './bubble-menu'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'

const meta: Meta<typeof EditorBubbleMenu> = {
    title: 'features/editor/BubbleMenu',
    component: EditorBubbleMenu,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof EditorBubbleMenu>

function BubbleMenuDemo() {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content: '<p>텍스트를 선택하면 버블 메뉴가 나타납니다. <strong>굵은 텍스트</strong>와 <em>기울임 텍스트</em>를 선택해보세요.</p>',
    })

    if (!editor) {
        return <div>로딩 중...</div>
    }

    return (
        <div className="space-y-4">
            <div className="rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                <EditorBubbleMenu editor={editor} />
            </div>
            <div className="rounded border p-4">
                <EditorContent editor={editor} />
            </div>
            <p className="text-sm text-gray-500">
                위의 버블 메뉴는 실제로는 텍스트 선택 시에만 나타납니다.
            </p>
        </div>
    )
}

export const Default: Story = {
    render: () => <BubbleMenuDemo />,
}

function BubbleMenuButtonsOnly() {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Link.configure({ openOnClick: false }),
        ],
        content: '<p>테스트</p>',
    })

    if (!editor) {
        return <div>로딩 중...</div>
    }

    return (
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900">
            <EditorBubbleMenu editor={editor} />
        </div>
    )
}

export const ButtonsOnly: Story = {
    render: () => <BubbleMenuButtonsOnly />,
}
