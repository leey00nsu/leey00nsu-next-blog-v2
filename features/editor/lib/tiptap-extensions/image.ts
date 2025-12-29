/**
 * 커스텀 이미지 확장
 *
 * 기본 Image 확장을 확장하여 다음 기능을 추가합니다:
 * - src, alt, width, height 속성
 * - 업로드 핸들러 연동을 위한 커맨드
 * - NodeView를 통한 pendingImages 미리보기
 *
 * _Requirements: 5.1, 5.2, 5.3, 5.5_
 */

import Image from '@tiptap/extension-image'
import type { CommandProps } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { ImageNodeView } from '../../ui/image-node-view'

/**
 * 이미지 속성 인터페이스
 */
export interface ImageAttributes {
  src: string
  alt?: string
  title?: string
  width?: number | null
  height?: number | null
}

/**
 * 커스텀 이미지 확장
 *
 * Image 확장을 확장하여 width, height 속성을 추가합니다.
 */
export const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: '',
        parseHTML: (element) => element.getAttribute('src'),
        renderHTML: (attributes) => ({
          src: attributes.src,
        }),
      },
      alt: {
        default: '',
        parseHTML: (element) => element.getAttribute('alt'),
        renderHTML: (attributes) => ({
          alt: attributes.alt || '',
        }),
      },
      title: {
        default: '',
        parseHTML: (element) => element.getAttribute('title'),
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {}
          }
          return {
            title: attributes.title,
          }
        },
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('width')
          return width ? Number.parseInt(width, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.width) {
            return {}
          }
          return {
            width: attributes.width,
          }
        },
      },
      height: {
        default: null,
        parseHTML: (element) => {
          const height = element.getAttribute('height')
          return height ? Number.parseInt(height, 10) : null
        },
        renderHTML: (attributes) => {
          if (!attributes.height) {
            return {}
          }
          return {
            height: attributes.height,
          }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      /**
       * 이미지를 삽입합니다.
       */
      setImage:
        (options: ImageAttributes) =>
        ({ commands }: CommandProps) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
      /**
       * 현재 선택된 이미지의 속성을 업데이트합니다.
       */
      updateImage:
        (options: Partial<ImageAttributes>) =>
        ({ commands }: CommandProps) => {
          return commands.updateAttributes(this.name, options)
        },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
}).configure({
  inline: false,
  allowBase64: true,
  HTMLAttributes: {
    class: 'rounded-lg max-w-full mx-auto',
  },
})
