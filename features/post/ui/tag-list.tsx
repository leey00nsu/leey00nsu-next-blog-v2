import { Badge, badgeVariants } from '@/shared/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

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
    <ul
      className={cn('m-0 flex list-none flex-wrap gap-2 p-0', className)}
      aria-label="tag list"
    >
      {tags.map((tag) => {
        const key = `tag-${tag}`
        const label =
          counts && counts[tag] ? `#${tag} (${counts[tag]})` : `#${tag}`
        const selected = selectedTags.includes(tag)
        const variant = selected ? activeVariant : badgeVariant
        const ariaLabel = `tag: ${tag}`

        if (hrefBuilder) {
          return (
            <li key={key} className="list-none">
              <Badge variant={variant} asChild>
                <a
                  href={hrefBuilder(tag)}
                  aria-label={ariaLabel}
                  aria-current={selected ? 'page' : undefined}
                >
                  {label}
                </a>
              </Badge>
            </li>
          )
        }

        return (
          <li key={key} className="list-none">
            <Badge
              variant={variant}
              aria-label={ariaLabel}
              data-selected={selected || undefined}
            >
              {label}
            </Badge>
          </li>
        )
      })}
    </ul>
  )
}
