import { Badge, badgeVariants } from '@/shared/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

type BadgeVariant = VariantProps<typeof badgeVariants>['variant']

interface TagListProps {
  tags: string[]
  className?: string
  badgeVariant?: BadgeVariant
  activeVariant?: BadgeVariant
  hrefBuilder?: (tag: string) => string
  counts?: Record<string, number>
  selectedTags?: string[]
}

export function TagList({
  tags,
  className,
  badgeVariant = 'outline',
  activeVariant = 'default',
  hrefBuilder,
  counts,
  selectedTags = [],
}: TagListProps) {
  if (!tags || tags.length === 0) return null

  return (
    <div className={cn('flex flex-wrap gap-2', className)} aria-label="tags">
      {tags.map((tag) => {
        const key = `tag-${tag}`
        const label = counts && counts[tag] ? `#${tag} (${counts[tag]})` : `#${tag}`
        const selected = selectedTags.includes(tag)
        const variant = selected ? activeVariant : badgeVariant

        if (hrefBuilder) {
          return (
            <Badge key={key} variant={variant} aria-pressed={selected} asChild>
              <a href={hrefBuilder(tag)} aria-label={`tag: ${tag}`}>
                {label}
              </a>
            </Badge>
          )
        }

        return (
          <Badge key={key} variant={variant} aria-pressed={selected} aria-label={`tag: ${tag}`}>
            {label}
          </Badge>
        )
      })}
    </div>
  )
}

