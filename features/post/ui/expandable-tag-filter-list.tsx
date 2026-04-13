'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { POST_TAG_FILTER } from '@/features/post/config/constants'
import {
  makeToggleHref,
  selectVisibleTags,
} from '@/features/post/lib/tag-utils'
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
  TOGGLE_BUTTON_WRAPPER_CLASS_NAME: 'flex w-full justify-center',
  WRAPPER_CLASS_NAME: 'flex flex-col items-start gap-3',
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
  const shouldShowToggleButton =
    tags.length > POST_TAG_FILTER.MAXIMUM_COLLAPSED_TAG_COUNT
  const visibleTags = isExpanded
    ? tags
    : selectVisibleTags({
        tags,
        selectedTags,
        maximumCollapsedTagCount: POST_TAG_FILTER.MAXIMUM_COLLAPSED_TAG_COUNT,
      })

  return (
    <div
      className={cn(
        EXPANDABLE_TAG_FILTER_LIST_STYLE.WRAPPER_CLASS_NAME,
        className,
      )}
    >
      <div id={tagListId}>
        <TagList
          tags={visibleTags}
          counts={counts}
          selectedTags={selectedTags}
          hrefBuilder={hrefBuilder}
        />
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
