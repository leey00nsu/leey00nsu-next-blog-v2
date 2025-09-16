'use client'

import { cn } from '@/shared/lib/utils'
import Image, { ImageProps } from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { IMAGE } from '@/shared/config/constants'
import { gifImageLoader } from '@/shared/lib/gif-image-loader'
import { buildDefaultSizes } from '@/shared/ui/custom-image/lib/build-default-sizes'

export interface CustomImageProps extends ImageProps {
  base64?: string
}

export function CustomImage({
  alt,
  src,
  width,
  height,
  base64,
  className,
  loading: loadingProp,
  priority,
  sizes,
  onLoad: onLoadProp,
  ...props
}: CustomImageProps) {
  const [isMounted, setIsMounted] = useState(false)

  let numberWidth = Number(width)
  let numberHeight = Number(height)

  const hasWidth = Number.isFinite(numberWidth) && numberWidth > 0
  const hasHeight = Number.isFinite(numberHeight) && numberHeight > 0

  if (hasHeight && numberHeight > IMAGE.MAX_RENDER_HEIGHT) {
    const heightRatio = IMAGE.MAX_RENDER_HEIGHT / numberHeight
    if (hasWidth) {
      numberWidth *= heightRatio
    }
    numberHeight = IMAGE.MAX_RENDER_HEIGHT
  }

  if (hasWidth && numberWidth > IMAGE.MAX_RENDER_WIDTH) {
    const widthRatio = IMAGE.MAX_RENDER_WIDTH / numberWidth
    if (hasHeight) {
      numberHeight *= widthRatio
    }
    numberWidth = IMAGE.MAX_RENDER_WIDTH
  }

  const normalizedWidth = hasWidth ? Math.round(numberWidth) : undefined
  const normalizedHeight = hasHeight ? Math.round(numberHeight) : undefined

  // svg 여부 판단 (querystring 제거 후 확장자 비교)
  const isSvg = useMemo(() => {
    if (!src) return false
    if (typeof src !== 'string') return false
    const beforeQuery = src.split('?')[0]
    return beforeQuery.toLowerCase().endsWith('.svg')
  }, [src])

  const isGif = useMemo(() => {
    if (!src) return false
    if (typeof src !== 'string') return false
    const beforeQuery = src.split('?')[0]
    return beforeQuery.toLowerCase().endsWith('.gif')
  }, [src])

  // src 변경 시 초기화, svg는 즉시 표시
  useEffect(() => {
    setIsMounted(isSvg)
  }, [isSvg, src])

  const aspectRatioStyle =
    normalizedWidth && normalizedHeight
      ? ({
          aspectRatio: `${normalizedWidth} / ${normalizedHeight}`,
        } as const)
      : undefined

  const resolvedSizes = sizes ?? buildDefaultSizes(normalizedWidth)
  const resolvedLoading = priority ? undefined : (loadingProp ?? 'lazy')

  const handleLoad: NonNullable<ImageProps['onLoad']> = (event) => {
    if (typeof onLoadProp === 'function') {
      onLoadProp(event)
    }
    setIsMounted(true)
  }

  return (
    <span
      className={cn('relative block w-full overflow-hidden', className)}
      style={{
        ...aspectRatioStyle,
        maxHeight: IMAGE.MAX_RENDER_HEIGHT,
      }}
    >
      {/* blur image */}
      {base64 ? (
        <Image
          key={base64}
          alt=""
          aria-hidden
          width={normalizedWidth}
          height={normalizedHeight}
          className={cn(
            'absolute inset-0 !m-0 h-full w-full object-contain opacity-100 blur-xs',
            isMounted && 'opacity-0 transition-opacity',
            className,
          )}
          src={base64}
          loading="eager"
          sizes={resolvedSizes}
        />
      ) : null}

      <Image
        {...props}
        key={String(src)}
        alt={alt}
        width={normalizedWidth}
        height={normalizedHeight}
        src={src}
        loader={isGif ? gifImageLoader : undefined}
        onLoad={handleLoad}
        className={cn(
          'absolute inset-0 !m-0 h-full w-full object-contain',
          isMounted ? 'opacity-100 transition-opacity' : 'opacity-0',
          className,
        )}
        loading={resolvedLoading}
        priority={priority}
        sizes={resolvedSizes}
      />
    </span>
  )
}
