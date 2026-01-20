'use client'

import { cn } from '@/shared/lib/utils'
import Image, { ImageProps } from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IMAGE } from '@/shared/config/constants'
import { buildDefaultSizes } from '@/shared/ui/custom-image/lib/build-default-sizes'

export interface CustomImageProps extends ImageProps {
  base64?: string
  isAnimated?: boolean
}

function isExternalUrl(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') return false
  return src.startsWith('http://') || src.startsWith('https://')
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
  isAnimated,
  ...props
}: CustomImageProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  // svg 여부 판단 (querystring 제거 후 확장자 비교)
  const isSvg = useMemo(() => {
    if (!src) return false
    if (typeof src !== 'string') return false
    const beforeQuery = src.split('?')[0]
    return beforeQuery.toLowerCase().endsWith('.svg')
  }, [src])

  // src 변경 시 초기화, svg는 즉시 표시
  useEffect(() => {
    setIsLoaded(isSvg)
  }, [isSvg, src])

  // 이미지가 이미 로드된 경우를 처리 (onLoad가 호출되지 않는 경우 대비)
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setIsLoaded(true)
    }
  })

  const handleLoad = useCallback<NonNullable<ImageProps['onLoad']>>(
    (event) => {
      if (typeof onLoadProp === 'function') {
        onLoadProp(event)
      }
      setIsLoaded(true)
    },
    [onLoadProp],
  )

  const handleError = useCallback(() => {
    setIsLoaded(true)
  }, [])

  // 계산된 값들
  let numberWidth = Number(width)
  let numberHeight = Number(height)

  const hasWidth = Number.isFinite(numberWidth) && numberWidth > 0
  const hasHeight = Number.isFinite(numberHeight) && numberHeight > 0

  // 외부 이미지이고 width/height가 없는 경우 일반 img 태그 사용
  const isExternal = isExternalUrl(src)
  const needsFallback = isExternal && (!hasWidth || !hasHeight)

  if (needsFallback) {
    return (
      <span className={cn('relative block w-full overflow-hidden', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={typeof src === 'string' ? src : ''}
          alt={alt}
          className={cn('h-auto max-w-full rounded-lg', className)}
          loading="lazy"
        />
      </span>
    )
  }

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

  const aspectRatioStyle =
    normalizedWidth && normalizedHeight
      ? ({
          aspectRatio: `${normalizedWidth} / ${normalizedHeight}`,
        } as const)
      : undefined

  const resolvedSizes = sizes ?? buildDefaultSizes(normalizedWidth)
  const resolvedLoading = priority ? undefined : (loadingProp ?? 'lazy')

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
            isLoaded && 'opacity-0 transition-opacity',
            className,
          )}
          src={base64}
          loading="eager"
          sizes={resolvedSizes}
        />
      ) : null}

      <Image
        {...props}
        ref={imgRef}
        key={String(src)}
        alt={alt}
        width={normalizedWidth}
        height={normalizedHeight}
        src={src}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'absolute inset-0 !m-0 h-full w-full object-contain',
          isLoaded ? 'opacity-100 transition-opacity' : 'opacity-0',
          className,
        )}
        loading={resolvedLoading}
        priority={priority}
        sizes={resolvedSizes}
        unoptimized={isAnimated || isExternal}
      />
    </span>
  )
}
