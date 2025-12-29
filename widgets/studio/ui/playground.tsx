'use client'

import dynamic from 'next/dynamic'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { TiptapEditorMethods } from '@/features/editor/ui/tiptap-editor'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'
import type { PendingImageMap } from '@/features/editor/model/types'
import { collectUsedImageSrcs } from '@/features/editor/lib/image-utils'
import { Loader2, Eye, EyeOff, Code, FileText, Save } from 'lucide-react'
import { useRemapImagesOnSlugChange } from '@/features/studio/model/use-remap-images-on-slug-change'
import { useSaveLocal } from '@/features/studio/model/use-save-local'
import { FRONTMATTER_BLOCK_REGEX } from '@/shared/config/constants'
import { useLocale } from 'next-intl'
import { LOCALES } from '@/shared/config/constants'
import { LanguageSelector } from '@/features/studio/ui/language-selector'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { MdxClientRenderer } from '@/features/mdx/ui/mdx-client-renderer'

const TiptapEditor = dynamic(
    () => import('@/features/editor/ui/tiptap-editor').then((m) => m.TiptapEditor),
    {
        ssr: false,
        loading: () => (
            <div className="flex items-center justify-center">
                <Loader2 className="animate-spin" />
            </div>
        ),
    },
)

export interface PlaygroundProps {
    existingSlugs?: string[]
    existingTags?: string[]
}

export function Playground({
    existingSlugs = [],
    existingTags = [],
}: PlaygroundProps) {
    const currentLocale = useLocale()
    const [markdown, setMarkdown] = useState('')
    const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()
    const [pendingImages, setPendingImages] = useState<PendingImageMap>({})
    const [isFrontmatterValid, setIsFrontmatterValid] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const editorRef = useRef<TiptapEditorMethods | null>(null)
    const { isSaving, saveLocal } = useSaveLocal()

    // 언어 선택 상태
    const [sourceLocale, setSourceLocale] = useState<string>(currentLocale)
    const [targetLocales, setTargetLocales] = useState<string[]>([
        ...LOCALES.SUPPORTED,
    ])

    const bodyMarkdown = useMemo(
        () => markdown.replace(FRONTMATTER_BLOCK_REGEX, ''),
        [markdown],
    )
    const finalMarkdown = useMemo(() => {
        if (!frontMatter) return bodyMarkdown
        return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
    }, [frontMatter, bodyMarkdown])

    // 본문에서 사용 중인 pending 이미지들을 썸네일 후보로 표시
    const usedSrcs = useMemo(
        () => collectUsedImageSrcs(bodyMarkdown),
        [bodyMarkdown],
    )
    const thumbnailChoices = useMemo(
        () =>
            Object.entries(pendingImages)
                .filter(([path]) => usedSrcs.has(path))
                .map(([path, entry]) => ({ path, previewUrl: entry.objectURL })),
        [pendingImages, usedSrcs],
    )

    const handleFrontmatterChange = useCallback((fm: Frontmatter) => {
        setFrontMatter(fm)
    }, [])

    const handleValidityChange = useCallback((valid: boolean) => {
        setIsFrontmatterValid(valid)
    }, [])

    const handleAddPendingImage = useCallback((path: string, file: File, objectURL: string) => {
        setPendingImages((prev) => {
            const prevEntry = prev[path]
            // 이전 objectURL이 있고 새로운 것과 다르면 해제
            if (prevEntry && prevEntry.objectURL !== objectURL) {
                URL.revokeObjectURL(prevEntry.objectURL)
            }
            return { ...prev, [path]: { file, objectURL } }
        })
    }, [])

    const handleSaveLocal = async () => {
        const { filteredPending } = await saveLocal({
            frontMatter,
            bodyMarkdown,
            finalMarkdown,
            pendingImages,
            sourceLocale,
        })
        setPendingImages(filteredPending)
    }

    // 슬러그 변경 시: 마크다운 내 이미지 경로와 pendingImages 키를 모두 새 슬러그로 갱신
    useRemapImagesOnSlugChange({
        slug: frontMatter?.slug,
        markdown,
        setMarkdown,
        pendingImages,
        setPendingImages,
        setFrontMatter,
        editorRef,
    })

    return (
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <div className="bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 rounded-lg border p-4">
                <p className="text-amber-800 dark:text-amber-200 text-sm font-medium">
                    🎮 Playground 모드 - 로컬에 저장하여 게시글을 미리 확인할 수 있습니다. (개발 환경 전용)
                </p>
            </div>

            <LanguageSelector
                className="border-border rounded-lg border p-4"
                sourceLocale={sourceLocale}
                onSourceChange={setSourceLocale}
                targetLocales={targetLocales}
                onTargetsChange={(next) => setTargetLocales(next)}
            />
            <FrontmatterForm
                value={frontMatter}
                onChange={handleFrontmatterChange}
                onValidityChange={handleValidityChange}
                existingSlugs={existingSlugs}
                suggestionTags={existingTags}
                thumbnailChoices={thumbnailChoices}
            />
            <TiptapEditor
                editorRef={editorRef}
                value={markdown}
                fieldChange={setMarkdown}
                slug={frontMatter?.slug}
                pendingImages={pendingImages}
                onAddPendingImage={handleAddPendingImage}
            />

            <div className="flex gap-2">
                <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2"
                >
                    {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
                    {showPreview ? '미리보기 닫기' : '미리보기'}
                </Button>
                <Button
                    disabled={
                        !isFrontmatterValid || bodyMarkdown.trim().length === 0 || isSaving
                    }
                    onClick={handleSaveLocal}
                    className="flex items-center gap-2"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="animate-spin" size={16} /> 저장 중...
                        </>
                    ) : (
                        <>
                            <Save size={16} /> 로컬에 저장
                        </>
                    )}
                </Button>
            </div>

            {showPreview && (
                <div className="border-border rounded-lg border">
                    <Tabs defaultValue="rendered" className="w-full">
                        <TabsList className="w-full justify-start rounded-none border-b bg-transparent p-0">
                            <TabsTrigger
                                value="rendered"
                                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                            >
                                <FileText size={16} />
                                결과 미리보기
                            </TabsTrigger>
                            <TabsTrigger
                                value="mdx"
                                className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
                            >
                                <Code size={16} />
                                MDX 미리보기
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="rendered" className="p-4">
                            <MdxClientRenderer content={bodyMarkdown} pendingImages={pendingImages} />
                        </TabsContent>
                        <TabsContent value="mdx" className="p-4">
                            <pre className="bg-muted overflow-auto rounded-lg p-4 text-sm whitespace-pre-wrap">
                                {finalMarkdown || '(내용 없음)'}
                            </pre>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
    )
}
