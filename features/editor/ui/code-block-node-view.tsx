'use client'

/**
 * CodeBlockNodeView 컴포넌트
 *
 * Tiptap NodeView를 사용한 코드블록 UI입니다.
 * 언어 선택 드롭다운과 제목 입력 필드를 제공합니다.
 *
 * _Requirements: 4.1, 4.2, 4.3_
 */

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { useCallback, useState } from 'react'
import { SUPPORTED_LANGUAGES } from '@/features/editor/lib/tiptap-extensions/code-block'

export function CodeBlockNodeView({
    node,
    updateAttributes,
}: NodeViewProps) {
    const { language, title } = node.attrs
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleValue, setTitleValue] = useState(title ?? '')

    const handleLanguageChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            updateAttributes({ language: event.target.value })
        },
        [updateAttributes],
    )

    const handleTitleBlur = useCallback(() => {
        setIsEditingTitle(false)
        updateAttributes({ title: titleValue })
    }, [titleValue, updateAttributes])

    const handleTitleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                event.preventDefault()
                setIsEditingTitle(false)
                updateAttributes({ title: titleValue })
            }
            if (event.key === 'Escape') {
                setIsEditingTitle(false)
                setTitleValue(title || '')
            }
        },
        [titleValue, title, updateAttributes],
    )

    return (
        <NodeViewWrapper className="not-prose my-4 overflow-hidden rounded-lg bg-gray-900 dark:bg-gray-950">
            {/* 헤더: 언어 선택 + 제목 */}
            <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
                {/* 언어 선택 드롭다운 */}
                <select
                    value={language || ''}
                    onChange={handleLanguageChange}
                    contentEditable={false}
                    className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                    {SUPPORTED_LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                            {lang.label}
                        </option>
                    ))}
                </select>

                {/* 제목 입력 필드 */}
                {isEditingTitle ? (
                    <input
                        type="text"
                        value={titleValue}
                        onChange={(e) => setTitleValue(e.target.value)}
                        onBlur={handleTitleBlur}
                        onKeyDown={handleTitleKeyDown}
                        placeholder="파일명 또는 제목"
                        contentEditable={false}
                        className="flex-1 rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                    />
                ) : (
                    <button
                        type="button"
                        onClick={() => setIsEditingTitle(true)}
                        contentEditable={false}
                        className="flex-1 rounded px-2 py-1 text-left text-xs text-gray-400 hover:bg-gray-800"
                    >
                        {title || '제목 추가...'}
                    </button>
                )}
            </div>

            {/* 코드 내용 */}
            <pre className="overflow-x-auto p-4 text-sm font-mono text-gray-100">
                <NodeViewContent />
            </pre>
        </NodeViewWrapper>
    )
}
