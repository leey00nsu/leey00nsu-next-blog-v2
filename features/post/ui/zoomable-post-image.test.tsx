import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { POST_IMAGE_ZOOM } from '@/features/post/config/constants'
import { ZoomablePostImage } from '@/features/post/ui/zoomable-post-image'

vi.mock('react-medium-image-zoom', () => ({
  default: ({
    a11yNameButtonZoom,
    a11yNameButtonUnzoom,
    children,
    classDialog,
    wrapElement,
    zoomImg,
    zoomMargin,
  }: {
    a11yNameButtonZoom: string
    a11yNameButtonUnzoom: string
    children: ReactNode
    classDialog: string
    wrapElement: string
    zoomImg: { src: string }
    zoomMargin: number
  }) => (
    <div
      data-collapse-label={a11yNameButtonUnzoom}
      data-dialog-class={classDialog}
      data-expand-label={a11yNameButtonZoom}
      data-testid="image-zoom"
      data-wrap-element={wrapElement}
      data-zoom-image-source={zoomImg.src}
      data-zoom-margin={zoomMargin}
    >
      {children}
    </div>
  ),
}))

vi.mock('@/shared/ui/custom-image', () => ({
  CustomImage: ({ alt }: { alt: string }) => (
    <span aria-label={alt} role="img" />
  ),
}))

describe('ZoomablePostImage', () => {
  it('접근성 문구와 확대 레이아웃 설정을 이미지 확대 컴포넌트에 전달한다', () => {
    render(
      <NextIntlClientProvider
        locale="ko"
        messages={{
          post: {
            imageZoom: {
              expand: '이미지 확대',
              collapse: '이미지 축소',
            },
          },
        }}
      >
        <ZoomablePostImage
          alt="테스트 이미지"
          height={600}
          src="/test.webp"
          width={800}
        />
      </NextIntlClientProvider>,
    )

    const imageZoom = screen.getByTestId('image-zoom')

    expect(imageZoom).toHaveAttribute('data-expand-label', '이미지 확대')
    expect(imageZoom).toHaveAttribute('data-collapse-label', '이미지 축소')
    expect(imageZoom).toHaveAttribute(
      'data-dialog-class',
      POST_IMAGE_ZOOM.DIALOG_CLASS_NAME,
    )
    expect(imageZoom).toHaveAttribute('data-wrap-element', 'span')
    expect(imageZoom).toHaveAttribute('data-zoom-image-source', '/test.webp')
    expect(imageZoom).toHaveAttribute(
      'data-zoom-margin',
      String(POST_IMAGE_ZOOM.VIEWPORT_MARGIN_PX),
    )
    expect(
      screen.getByRole('img', { name: '테스트 이미지' }),
    ).toBeInTheDocument()
  })
})
