'use client'

import { cn } from '@/shared/lib/utils'
import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

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

  return (
    <span className={cn('relative')}>
      {/* blur image */}
      <Image
        {...props}
        key={base64}
        alt={alt}
        width={numberWidth}
        height={numberHeight}
        className={cn(
          'absolute inset-0 -z-10 m-0 opacity-100 blur-md dark:blur-none',
          isMounted && 'opacity-0 transition-opacity',
          className,
        )}
        style={{
          aspectRatio: `${numberWidth} / ${numberHeight}`,
        }}
        onLoad={() => {
          if (props.unoptimized) return // svg 이미지는 블러를 초기화하지 않는다.
          setIsMounted(false)
        }}
        src={base64!}
        priority
      />

      <Image
        {...props}
        key={src as string}
        alt={alt}
        width={numberWidth}
        height={numberHeight}
        src={src}
        onLoad={() => setIsMounted(true)}
        className={cn(
          'm-0',
          isMounted ? 'opacity-100 transition-opacity' : 'opacity-0',
          className,
        )}
      />
    </span>
  )
}
