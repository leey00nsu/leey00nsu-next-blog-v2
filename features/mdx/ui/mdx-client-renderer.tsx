'use client'

/**
 * 클라이언트용 MDX 렌더러
 *
 * 클라이언트 컴포넌트에서 MDX를 렌더링합니다.
 * next-mdx-remote의 serialize + MDXRemote 조합을 사용합니다.
 */

import { MDXRemote, type MDXRemoteSerializeResult } from 'next-mdx-remote'
import { serialize } from 'next-mdx-remote/serialize'
import { useEffect, useState } from 'react'
import remarkGfm from 'remark-gfm'
import rehypePrettyCode from 'rehype-pretty-code'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'
import { Loader2 } from 'lucide-react'
import type { PendingImageMap } from '@/features/editor/model/types'

interface MdxClientRendererProps {
    content: string
    pendingImages?: PendingImageMap
}

export function MdxClientRenderer({ content, pendingImages = {} }: MdxClientRendererProps) {
    const [mdxSource, setMdxSource] = useState<MDXRemoteSerializeResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!content.trim()) {
            setMdxSource(null)
            return
        }

        let cancelled = false
        setIsLoading(true)
        setError(null)

        serialize(content, {
            mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [
                    [
                        rehypePrettyCode,
                        {
                            theme: 'github-dark',
                            keepBackground: true,
                        },
                    ],
                ],
            },
        })
            .then((result) => {
                if (!cancelled) {
                    setMdxSource(result)
                    setIsLoading(false)
                }
            })
            .catch((error_) => {
                if (!cancelled) {
                    setError(error_ instanceof Error ? error_.message : 'MDX 파싱 오류')
                    setIsLoading(false)
                }
            })

        return () => {
            cancelled = true
        }
    }, [content])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">렌더링 중...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    MDX 파싱 오류
                </p>
                <pre className="mt-2 text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {error}
                </pre>
            </div>
        )
    }

    if (!mdxSource) {
        return (
            <p className="text-sm text-muted-foreground">(내용 없음)</p>
        )
    }

    return (
        <article className="prose prose-lg dark:prose-invert max-w-none">
            <MDXRemote
                {...mdxSource}
                components={{
                    figcaption: CustomFigcaption,
                    // eslint-disable-next-line @next/next/no-img-element
                    img: (props) => {
                        // pending 이미지인 경우 objectURL로 변환
                        const src = props.src || ''
                        const displaySrc = pendingImages[src]?.objectURL ?? src
                        return <img {...props} src={displaySrc} alt={props.alt || ''} className="rounded-lg" />
                    },
                }}
            />
        </article>
    )
}
