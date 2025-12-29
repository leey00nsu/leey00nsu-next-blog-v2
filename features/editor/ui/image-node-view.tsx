'use client'

/**
 * ImageNodeView 컴포넌트
 *
 * Tiptap NodeView를 사용한 이미지 UI입니다.
 * pendingImages의 objectURL을 사용하여 미리보기를 표시합니다.
 *
 * _Requirements: 5.1, 5.2, 5.3_
 */

import { NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { getObjectURLForPath } from '@/features/editor/model/pending-images-store'

export function ImageNodeView({ node }: NodeViewProps) {
    const { src, alt, title, width, height } = node.attrs

    // 전역 스토어에서 objectURL 찾기
    const objectURL = getObjectURLForPath(src)
    const displaySrc = objectURL ?? src

    return (
        <NodeViewWrapper className="my-4">
            <figure className="mx-auto max-w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={displaySrc}
                    alt={alt || ''}
                    title={title || undefined}
                    width={width || undefined}
                    height={height || undefined}
                    className="mx-auto max-w-full rounded-lg"
                    draggable={false}
                />
                {title && (
                    <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                        {title}
                    </figcaption>
                )}
            </figure>
        </NodeViewWrapper>
    )
}
