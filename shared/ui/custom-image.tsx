'use client'

import { gifImageLoader } from '@/shared/lib/gif-image-loader'
import { cn } from '@/shared/lib/utils'
import Image, { ImageProps } from 'next/image'
import { useEffect, useMemo, useState } from 'react'

const MAX_HEIGHT = 600

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
  ...props
}: CustomImageProps) {
  const [isMounted, setIsMounted] = useState(false)

  let numberWidth = Number(width)
  let numberHeight = Number(height)

  // 이미지의 높이가 최대를 넘어가면 이미지의 비율을 유지하며 크기를 변경한다.
  if (numberHeight && numberHeight > MAX_HEIGHT) {
    const ratio = MAX_HEIGHT / numberHeight
    numberWidth = Math.round(numberWidth * ratio)
    numberHeight = Math.round(numberHeight * ratio)
  }

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
    if (isSvg) {
      setIsMounted(true)
    }
  }, [isSvg, src])

  const aspectRatioStyle =
    Number.isFinite(numberWidth) &&
    Number.isFinite(numberHeight) &&
    numberWidth > 0 &&
    numberHeight > 0
      ? ({
          // width: numberWidth,
          // height: numberHeight,
          aspectRatio: `${numberWidth} / ${numberHeight}`,
        } as const)
      : undefined

  return (
    <span
      className={cn('relative block h-full w-full overflow-hidden', className)}
      style={aspectRatioStyle}
    >
      {/* blur image */}
      {base64 ? (
        <Image
          {...props}
          key={base64}
          alt={alt}
          width={numberWidth}
          height={numberHeight}
          className={cn(
            'absolute inset-0 !m-0 h-full w-full object-cover opacity-100',
            isMounted && 'opacity-0 transition-opacity',
          )}
          src={base64}
          priority
        />
      ) : null}

      <Image
        {...props}
        key={src as string}
        alt={alt}
        width={numberWidth}
        height={numberHeight}
        src={src}
        loader={isGif ? gifImageLoader : undefined}
        onLoad={() => setIsMounted(true)}
        className={cn(
          'absolute inset-0 !m-0 h-full w-full object-cover',
          isMounted ? 'opacity-100 transition-opacity' : 'opacity-0',
          className,
        )}
      />
    </span>
  )
}
