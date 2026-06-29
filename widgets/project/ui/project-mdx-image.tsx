import type { CustomImageProps } from '@/shared/ui/custom-image'
import { CustomImage } from '@/shared/ui/custom-image'
import { cn } from '@/shared/lib/utils'

export function ProjectMdxImage({
  className,
  imageClassName,
  ...props
}: CustomImageProps) {
  return (
    <span className="border-border bg-card not-prose my-6 block w-full overflow-hidden rounded-lg border">
      <CustomImage
        {...props}
        className={cn('w-full', className)}
        imageClassName={cn('object-contain', imageClassName)}
      />
    </span>
  )
}
