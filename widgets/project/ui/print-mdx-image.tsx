import type { ImgHTMLAttributes } from 'react'
import { removePublic } from '@/shared/lib/remove-public'
import { cn } from '@/shared/lib/utils'

interface PrintMdxImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src?: string
}

export function PrintMdxImage({
  src = '',
  alt = '',
  className,
  ...props
}: PrintMdxImageProps) {
  const normalizedSource = removePublic(src)

  return (
    <span className="border-border bg-card not-prose block w-full break-inside-avoid overflow-hidden rounded-lg border [page-break-inside:avoid]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...props}
        src={normalizedSource}
        alt={alt}
        className={cn(
          'block h-auto max-h-[600px] w-full object-contain',
          className,
        )}
        loading="eager"
        decoding="sync"
      />
    </span>
  )
}
