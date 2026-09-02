'use client'

import Zoom from 'react-medium-image-zoom'
import { useTranslations } from 'next-intl'
import { POST_IMAGE_ZOOM } from '@/features/post/config/constants'
import { toZoomImageSource } from '@/features/post/lib/to-zoom-image-source'
import { CustomImage, type CustomImageProps } from '@/shared/ui/custom-image'

export function ZoomablePostImage(props: CustomImageProps) {
  const translations = useTranslations('post.imageZoom')
  const zoomImageSource = toZoomImageSource(props.src)

  return (
    <span className="post-zoomable-image block w-full">
      <Zoom
        a11yNameButtonZoom={translations('expand')}
        a11yNameButtonUnzoom={translations('collapse')}
        classDialog={POST_IMAGE_ZOOM.DIALOG_CLASS_NAME}
        wrapElement="span"
        zoomImg={{ src: zoomImageSource }}
        zoomMargin={POST_IMAGE_ZOOM.VIEWPORT_MARGIN_PX}
      >
        <CustomImage {...props} />
      </Zoom>
    </span>
  )
}
