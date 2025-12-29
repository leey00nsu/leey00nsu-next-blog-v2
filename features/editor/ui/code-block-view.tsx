'use client'

/**
 * CodeBlockView 컴포넌트
 *
 * 코드블록 노드 뷰입니다.
 * 언어 선택 드롭다운과 제목 입력 필드를 제공합니다.
 *
 * _Requirements: 4.1, 4.2, 4.3_
 */

import { useCallback, useState } from 'react'
import type { Editor } from '@tiptap/react'
import { SUPPORTED_LANGUAGES } from '@/features/editor/lib/tiptap-extensions/code-block'

interface CodeBlockViewProps {
    editor: Editor
    language: string
    title: string
    onLanguageChange: (language: string) => void
    onTitleChange: (title: string) => void
}

export function CodeBlockView({
    language,
    title,
    onLanguageChange,
    onTitleChange,
}: CodeBlockViewProps) {
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [titleValue, setTitleValue] = useState(title)

    const handleLanguageChange = useCallback(
        (event: React.ChangeEvent<HTMLSelectElement>) => {
            onLanguageChange(event.target.value)
        },
        [onLanguageChange],
    )

    const handleTitleBlur = useCallback(() => {
        setIsEditingTitle(false)
        onTitleChange(titleValue)
    }, [titleValue, onTitleChange])

    const handleTitleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
                setIsEditingTitle(false)
                onTitleChange(titleValue)
            }
            if (event.key === 'Escape') {
                setIsEditingTitle(false)
                setTitleValue(title)
            }
        },
        [titleValue, title, onTitleChange],
    )

    return (
        <div className="mb-2 flex items-center gap-2 border-b border-gray-700 pb-2">
            {/* 언어 선택 드롭다운 */}
            <select
                value={language}
                onChange={handleLanguageChange}
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
                    className="flex-1 rounded bg-gray-800 px-2 py-1 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="flex-1 rounded px-2 py-1 text-left text-xs text-gray-400 hover:bg-gray-800"
                >
                    {title || '제목 추가...'}
                </button>
            )}
        </div>
    )
}

/**
 * 코드블록 헤더 컴포넌트 (간단한 버전)
 */
interface CodeBlockHeaderProps {
    language: string
    title: string
}

export function CodeBlockHeader({ language, title }: CodeBlockHeaderProps) {
    const languageLabel =
        SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label || '일반 텍스트'

    return (
        <div className="flex items-center justify-between border-b border-gray-700 px-4 py-2">
            <span className="text-xs font-medium text-gray-400">{languageLabel}</span>
            {title && (
                <span className="text-xs text-gray-500">{title}</span>
            )}
        </div>
    )
}
