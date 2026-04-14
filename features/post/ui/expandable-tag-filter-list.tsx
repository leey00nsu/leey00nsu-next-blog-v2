'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { makeToggleHref } from '@/features/post/lib/tag-utils'
import { useCollapsedTagFilter } from '@/features/post/model/use-collapsed-tag-filter'
import { TagList } from '@/features/post/ui/tag-list'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

interface ExpandableTagFilterListProps {
  basePath: string
  tags: string[]
  className?: string
  counts: Record<string, number>
  selectedTags: string[]
}

const EXPANDABLE_TAG_FILTER_LIST_STYLE = {
  COLLAPSED_OVERLAY_CLASS_NAME:
    'pointer-events-auto absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-transparent via-background/50 to-background',
  TOGGLE_BUTTON_WRAPPER_CLASS_NAME: 'flex w-full justify-center',
  VISIBLE_TAG_LIST_CLASS_NAME: 'w-full',
  VISIBLE_TAG_LIST_WRAPPER_CLASS_NAME: 'relative w-full',
  WRAPPER_CLASS_NAME: 'relative flex w-full flex-col gap-3',
  MEASUREMENT_CONTAINER_CLASS_NAME:
    'pointer-events-none invisible absolute inset-x-0 top-0 -z-10',
} as const

export function ExpandableTagFilterList({
  basePath,
  tags,
  className,
  counts,
  selectedTags,
}: ExpandableTagFilterListProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const tagListId = useId()
  const translate = useTranslations('blogList')
  const hrefBuilder = makeToggleHref(basePath, selectedTags)
  const {
    measurementContainerRef,
    shouldShowToggleButton,
    visibleTags,
  } = useCollapsedTagFilter({
      tags,
      selectedTags,
      isExpanded,
    })

  return (
    <div
      className={cn(
        EXPANDABLE_TAG_FILTER_LIST_STYLE.WRAPPER_CLASS_NAME,
        className,
      )}
    >
      <div
        ref={measurementContainerRef}
        aria-hidden="true"
        className={EXPANDABLE_TAG_FILTER_LIST_STYLE.MEASUREMENT_CONTAINER_CLASS_NAME}
      >
        <TagList
          tags={tags}
          counts={counts}
          selectedTags={selectedTags}
          hrefBuilder={hrefBuilder}
          className={EXPANDABLE_TAG_FILTER_LIST_STYLE.VISIBLE_TAG_LIST_CLASS_NAME}
        />
      </div>

      <div
        id={tagListId}
        className={
          EXPANDABLE_TAG_FILTER_LIST_STYLE.VISIBLE_TAG_LIST_WRAPPER_CLASS_NAME
        }
      >
        <TagList
          tags={visibleTags}
          counts={counts}
          selectedTags={selectedTags}
          hrefBuilder={hrefBuilder}
          className={EXPANDABLE_TAG_FILTER_LIST_STYLE.VISIBLE_TAG_LIST_CLASS_NAME}
        />
        {shouldShowToggleButton && !isExpanded ? (
          <div
            aria-hidden="true"
            data-testid="collapsed-tag-filter-overlay"
            className={EXPANDABLE_TAG_FILTER_LIST_STYLE.COLLAPSED_OVERLAY_CLASS_NAME}
          />
        ) : null}
      </div>

      {shouldShowToggleButton ? (
        <div
          className={
            EXPANDABLE_TAG_FILTER_LIST_STYLE.TOGGLE_BUTTON_WRAPPER_CLASS_NAME
          }
        >
          <Button
            variant="secondary"
            type="button"
            aria-controls={tagListId}
            aria-expanded={isExpanded}
            onClick={() =>
              setIsExpanded((previousExpandedState) => !previousExpandedState)
            }
          >
            {isExpanded
              ? translate('tagFilter.showLess')
              : translate('tagFilter.showMore')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
