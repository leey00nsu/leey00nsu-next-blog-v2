import { describe, expect, it } from 'vitest'
import { toZoomImageSource } from '@/features/post/lib/to-zoom-image-source'

describe('toZoomImageSource', () => {
  it('문자열 이미지 경로를 그대로 반환한다', () => {
    expect(toZoomImageSource('/image.webp')).toBe('/image.webp')
  })

  it('정적 이미지 메타데이터에서 원본 경로를 반환한다', () => {
    expect(
      toZoomImageSource({
        src: '/_next/static/media/image.webp',
        height: 600,
        width: 800,
      }),
    ).toBe('/_next/static/media/image.webp')
  })
})
