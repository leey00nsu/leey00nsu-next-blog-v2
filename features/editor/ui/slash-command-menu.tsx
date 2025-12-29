'use client'

/**
 * SlashCommandMenu 컴포넌트
 *
 * 슬래시 커맨드 메뉴 UI입니다.
 * 키보드 네비게이션과 필터링을 지원합니다.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4_
 */

import {
    useState,
    useEffect,
    useCallback,
    forwardRef,
    useImperativeHandle,
    useRef,
    useLayoutEffect,
} from 'react'
import type { SlashCommandItem } from '@/features/editor/lib/tiptap-extensions/slash-command'

const MENU_MARGIN = 8

interface SlashCommandMenuProps {
    items: SlashCommandItem[]
    position: { top: number; left: number }
    onSelect: (item: SlashCommandItem) => void
    onClose: () => void
}

export interface SlashCommandMenuRef {
    onKeyDown: (event: KeyboardEvent) => boolean
}

export const SlashCommandMenu = forwardRef<
    SlashCommandMenuRef,
    SlashCommandMenuProps
>(function SlashCommandMenu({ items, position, onSelect, onClose }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [adjustedPosition, setAdjustedPosition] = useState(position)
    const menuRef = useRef<HTMLDivElement>(null)

    // 메뉴 위치 자동 조정 (화면 밖으로 나가지 않도록)
    useLayoutEffect(() => {
        if (!menuRef.current) {
            setAdjustedPosition(position)
            return
        }

        const menuRect = menuRef.current.getBoundingClientRect()
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth

        let newTop = position.top
        let newLeft = position.left

        // 하단이 화면을 벗어나면 위쪽으로 표시
        if (position.top + menuRect.height > viewportHeight - MENU_MARGIN) {
            newTop = position.top - menuRect.height - 24 // 커서 위쪽으로
        }

        // 우측이 화면을 벗어나면 왼쪽으로 조정
        if (position.left + menuRect.width > viewportWidth - MENU_MARGIN) {
            newLeft = viewportWidth - menuRect.width - MENU_MARGIN
        }

        // 좌측이 화면을 벗어나면 조정
        if (newLeft < MENU_MARGIN) {
            newLeft = MENU_MARGIN
        }

        // 상단이 화면을 벗어나면 조정
        if (newTop < MENU_MARGIN) {
            newTop = MENU_MARGIN
        }

        setAdjustedPosition({ top: newTop, left: newLeft })
    }, [position])

    // 선택 인덱스 범위 제한
    useEffect(() => {
        if (selectedIndex >= items.length) {
            setSelectedIndex(Math.max(0, items.length - 1))
        }
    }, [items.length, selectedIndex])

    // 키보드 이벤트 핸들러
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'ArrowDown') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev + 1) % items.length)
                return true
            }

            if (event.key === 'ArrowUp') {
                event.preventDefault()
                setSelectedIndex((prev) => (prev - 1 + items.length) % items.length)
                return true
            }

            if (event.key === 'Enter') {
                event.preventDefault()
                if (items[selectedIndex]) {
                    onSelect(items[selectedIndex])
                }
                return true
            }

            if (event.key === 'Escape') {
                event.preventDefault()
                onClose()
                return true
            }

            return false
        },
        [items, selectedIndex, onSelect, onClose],
    )

    // ref를 통해 키보드 핸들러 노출
    useImperativeHandle(
        ref,
        () => ({
            onKeyDown: handleKeyDown,
        }),
        [handleKeyDown],
    )

    // 항목 클릭 핸들러
    const handleItemClick = useCallback(
        (item: SlashCommandItem) => {
            onSelect(item)
        },
        [onSelect],
    )

    if (items.length === 0) {
        return (
            <div
                ref={menuRef}
                className="fixed z-50 rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
            >
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    결과 없음
                </p>
            </div>
        )
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
            style={{ top: adjustedPosition.top, left: adjustedPosition.left }}
        >
            <div className="p-1">
                {items.map((item, index) => {
                    const Icon = item.icon
                    const isSelected = index === selectedIndex

                    return (
                        <button
                            key={item.title}
                            type="button"
                            onClick={() => handleItemClick(item)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${isSelected
                                ? 'bg-gray-100 dark:bg-gray-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                }`}
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                                <Icon size={18} className="text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {item.title}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {item.description}
                                </p>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
})
