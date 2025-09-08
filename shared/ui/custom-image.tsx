'use client'

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
      ? ({ aspectRatio: `${numberWidth} / ${numberHeight}` } as const)
      : undefined

  return (
    <span
      className={cn('relative inline-block', className)}
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
            'absolute inset-0 -z-10 m-0 opacity-100 blur-md dark:blur-none',
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
        onLoad={() => setIsMounted(true)}
        className={cn(
          'm-0 block',
          isMounted ? 'opacity-100 transition-opacity' : 'opacity-0',
          className,
        )}
      />
    </span>
  )
}
