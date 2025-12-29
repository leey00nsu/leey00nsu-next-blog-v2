/**
 * CodeBlockView 스토리
 *
 * 코드블록 노드 뷰 컴포넌트의 Storybook 스토리입니다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { CodeBlockView, CodeBlockHeader } from './code-block-view'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useState } from 'react'

const meta: Meta<typeof CodeBlockView> = {
    title: 'features/editor/CodeBlockView',
    component: CodeBlockView,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
    decorators: [
        (Story) => (
            <div className="w-[500px] rounded-lg bg-gray-900 p-4">
                <Story />
            </div>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof CodeBlockView>

function CodeBlockViewDemo() {
    const [language, setLanguage] = useState('typescript')
    const [title, setTitle] = useState('example.ts')

    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>테스트</p>',
    })

    if (!editor) {
        return <div>로딩 중...</div>
    }

    return (
        <div className="space-y-4">
            <CodeBlockView
                editor={editor}
                language={language}
                title={title}
                onLanguageChange={setLanguage}
                onTitleChange={setTitle}
            />
            <pre className="rounded bg-gray-800 p-4 text-sm text-gray-100">
                <code>{`const greeting = "Hello, World!";
console.log(greeting);`}</code>
            </pre>
            <div className="text-xs text-gray-400">
                현재 언어: {language}, 제목: {title || '(없음)'}
            </div>
        </div>
    )
}

export const Default: Story = {
    render: () => <CodeBlockViewDemo />,
}

function CodeBlockViewWithoutTitle() {
    const [language, setLanguage] = useState('javascript')
    const [title, setTitle] = useState('')

    const editor = useEditor({
        extensions: [StarterKit],
        content: '<p>테스트</p>',
    })

    if (!editor) {
        return <div>로딩 중...</div>
    }

    return (
        <CodeBlockView
            editor={editor}
            language={language}
            title={title}
            onLanguageChange={setLanguage}
            onTitleChange={setTitle}
        />
    )
}

export const WithoutTitle: Story = {
    render: () => <CodeBlockViewWithoutTitle />,
}

export const HeaderOnly: Story = {
    render: () => (
        <div className="space-y-4">
            <CodeBlockHeader language="typescript" title="app.ts" />
            <CodeBlockHeader language="python" title="main.py" />
            <CodeBlockHeader language="css" title="" />
            <CodeBlockHeader language="" title="설정 파일" />
        </div>
    ),
}

export const DifferentLanguages: Story = {
    render: () => (
        <div className="space-y-4">
            <CodeBlockHeader language="typescript" title="TypeScript 예시" />
            <CodeBlockHeader language="python" title="Python 예시" />
            <CodeBlockHeader language="rust" title="Rust 예시" />
            <CodeBlockHeader language="go" title="Go 예시" />
        </div>
    ),
}
