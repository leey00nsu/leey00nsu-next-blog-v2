'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { POST_TAG_FILTER } from '@/features/post/config/constants'
import {
  hasOverflowingTagRows,
  selectVisibleTagsByRow,
} from '@/features/post/lib/tag-utils'

interface UseCollapsedTagFilterParams {
  tags: string[]
  selectedTags: string[]
  isExpanded: boolean
}

interface UseCollapsedTagFilterResult {
  isDesktopViewport: boolean
  measurementContainerRef: ReturnType<typeof useRef<HTMLDivElement | null>>
  shouldShowToggleButton: boolean
  visibleTags: string[]
}

function getIsDesktopViewport(): boolean {
  if (globalThis.window === undefined) {
    return false
  }

  return globalThis.matchMedia(POST_TAG_FILTER.DESKTOP_MEDIA_QUERY).matches
}

function getMaximumCollapsedRowCount(): number {
  return getIsDesktopViewport()
    ? POST_TAG_FILTER.COLLAPSED_ROW_COUNT.DESKTOP
    : POST_TAG_FILTER.COLLAPSED_ROW_COUNT.MOBILE
}

function isSameTagRowIndexes(
  previousTagRowIndexes: number[],
  nextTagRowIndexes: number[],
): boolean {
  if (previousTagRowIndexes.length !== nextTagRowIndexes.length) {
    return false
  }

  return previousTagRowIndexes.every((previousTagRowIndex, index) => {
    return previousTagRowIndex === nextTagRowIndexes[index]
  })
}

function collectTagRowIndexes(
  measurementContainerElement: HTMLDivElement | null,
): number[] {
  if (!measurementContainerElement) {
    return []
  }

  const tagItemElements = [...measurementContainerElement.querySelectorAll('li')]

  const uniqueRowOffsets: number[] = []

  return tagItemElements.map((tagItemElement) => {
    const matchingRowIndex = uniqueRowOffsets.findIndex((uniqueRowOffset) => {
      return (
        Math.abs(tagItemElement.offsetTop - uniqueRowOffset) <=
        POST_TAG_FILTER.ROW_OFFSET_TOLERANCE_PX
      )
    })

    if (matchingRowIndex !== -1) {
      return matchingRowIndex
    }

    uniqueRowOffsets.push(tagItemElement.offsetTop)
    return uniqueRowOffsets.length - 1
  })
}

export function useCollapsedTagFilter({
  tags,
  selectedTags,
  isExpanded,
}: UseCollapsedTagFilterParams): UseCollapsedTagFilterResult {
  const measurementContainerRef = useRef<HTMLDivElement>(null)
  const [isDesktopViewport, setIsDesktopViewport] = useState(false)
  const [tagRowIndexes, setTagRowIndexes] = useState<number[]>([])
  const [maximumCollapsedRowCount, setMaximumCollapsedRowCount] = useState(
    POST_TAG_FILTER.COLLAPSED_ROW_COUNT.MOBILE,
  )

  useLayoutEffect(() => {
    const mediaQueryList = globalThis.matchMedia(
      POST_TAG_FILTER.DESKTOP_MEDIA_QUERY,
    )

    function measureTagRows() {
      const nextIsDesktopViewport = getIsDesktopViewport()
      const nextMaximumCollapsedRowCount = getMaximumCollapsedRowCount()
      const nextTagRowIndexes = collectTagRowIndexes(measurementContainerRef.current)

      setIsDesktopViewport((previousIsDesktopViewport) => {
        return previousIsDesktopViewport === nextIsDesktopViewport
          ? previousIsDesktopViewport
          : nextIsDesktopViewport
      })

      setMaximumCollapsedRowCount((previousMaximumCollapsedRowCount) => {
        return previousMaximumCollapsedRowCount === nextMaximumCollapsedRowCount
          ? previousMaximumCollapsedRowCount
          : nextMaximumCollapsedRowCount
      })

      setTagRowIndexes((previousTagRowIndexes) => {
        return isSameTagRowIndexes(previousTagRowIndexes, nextTagRowIndexes)
          ? previousTagRowIndexes
          : nextTagRowIndexes
      })
    }

    measureTagRows()

    const resizeObserver = new globalThis.ResizeObserver(() => {
      measureTagRows()
    })

    if (measurementContainerRef.current) {
      resizeObserver.observe(measurementContainerRef.current)
    }

    mediaQueryList.addEventListener('change', measureTagRows)

    return () => {
      resizeObserver.disconnect()
      mediaQueryList.removeEventListener('change', measureTagRows)
    }
  }, [tags])

  const visibleTags = isExpanded
    ? tags
    : selectVisibleTagsByRow({
        tags,
        tagRowIndexes,
        selectedTags,
        maximumCollapsedRowCount,
      })

  const shouldShowToggleButton = hasOverflowingTagRows({
    tagRowIndexes,
    maximumCollapsedRowCount,
  })

  return {
    isDesktopViewport,
    measurementContainerRef,
    shouldShowToggleButton,
    visibleTags,
  }
}
