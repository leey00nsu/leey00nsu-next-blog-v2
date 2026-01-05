'use client'

/**
 * ImageNodeView 컴포넌트
 *
 * Tiptap NodeView를 사용한 이미지 UI입니다.
 * pendingImages의 objectURL을 사용하여 미리보기를 표시합니다.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */

import { useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { getObjectURLForPath } from '@/features/editor/model/pending-images-store'

export function ImageNodeView({ node }: NodeViewProps) {
  const { src, alt, title, width, height } = node.attrs
  const [isDragging, setIsDragging] = useState(false)

  // 전역 스토어에서 objectURL 찾기
  const objectURL = getObjectURLForPath(src)
  const displaySrc = objectURL ?? src

  return (
    <NodeViewWrapper className="my-4">
      <figure className="max-w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt={alt || ''}
          title={title || undefined}
          width={width || undefined}
          height={height || undefined}
          className={`hover:ring-ring max-w-full cursor-pointer rounded-lg transition-all hover:ring-2 ${
            isDragging ? 'opacity-40' : ''
          }`}
          draggable="true"
          data-drag-handle
          onDragStart={() => setIsDragging(true)}
          onDragEnd={() => setIsDragging(false)}
          onClick={() => {
            // 커스텀 이벤트를 통해 에디터에 이미지 수정 요청
            const event = new CustomEvent('tiptap:edit-image', {
              detail: { ...node.attrs },
            })
            globalThis.dispatchEvent(event)
          }}
        />
        {title && (
          <figcaption className="text-muted-foreground mt-2 text-center text-sm">
            {title}
          </figcaption>
        )}
      </figure>
    </NodeViewWrapper>
  )
}
