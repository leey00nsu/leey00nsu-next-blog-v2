'use client'

/**
 * TiptapEditor 메인 컴포넌트
 *
 * Tiptap 기반 Notion 스타일 에디터입니다.
 * 기존 Editor 컴포넌트와 동일한 Props 인터페이스를 제공합니다.
 *
 * _Requirements: 8.1, 8.4, 9.1, 9.2_
 */

import { useEditor, EditorContent, type Editor, type Extensions } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import {
    createContext,
    useContext,
    useCallback,
    useState,
    useRef,
    useMemo,
    type Ref,
    useImperativeHandle,
    useEffect,
} from 'react'
import '@/features/editor/ui/tiptap-editor.css'
import type { PendingImageMap } from '@/features/editor/model/types'
import { setPendingImagesStore } from '@/features/editor/model/pending-images-store'
import { parseFromMdx } from '@/features/editor/lib/mdx-parser'
import { serializeToMdx } from '@/features/editor/lib/mdx-serializer'
import { CustomCodeBlock } from '@/features/editor/lib/tiptap-extensions/code-block'
import { CustomImage } from '@/features/editor/lib/tiptap-extensions/image'
import {
    createSlashCommandExtension,
    type SlashCommandItem,
} from '@/features/editor/lib/tiptap-extensions/slash-command'
import { EditorBubbleMenu } from '@/features/editor/ui/bubble-menu'
import { SlashCommandMenu } from '@/features/editor/ui/slash-command-menu'
import { ImageDialog } from '@/features/editor/ui/image-dialog'
import { buildUniquePath } from '@/features/editor/lib/image-utils'

const PLACEHOLDER_TEXT = "'/'를 입력하여 블록 추가..."

/**
 * 기본 확장 목록 (슬래시 커맨드 제외)
 * 모듈 레벨에서 한 번만 생성하여 중복 경고 방지
 *
 * Note: Tiptap v3에서 StarterKit에 Link와 Underline이 포함되었으므로
 * 커스텀 설정을 위해 StarterKit에서 비활성화하고 별도로 추가합니다.
 */
const BASE_EXTENSIONS: Extensions = [
    StarterKit.configure({
        codeBlock: false,
        // Tiptap v3: Link와 Underline이 StarterKit에 포함됨
        // 커스텀 설정을 위해 비활성화하고 별도로 추가
        link: false,
        underline: false,
    }),
    Underline,
    Link.configure({
        openOnClick: false,
        HTMLAttributes: {
            class: 'text-blue-600 dark:text-blue-400 underline',
        },
    }),
    CustomCodeBlock,
    CustomImage,
    Table.configure({
        resizable: true,
        HTMLAttributes: {
            class: 'border-collapse table-auto w-full',
        },
    }),
    TableRow,
    TableCell.configure({
        HTMLAttributes: {
            class: 'border border-gray-300 dark:border-gray-600 p-2',
        },
    }),
    TableHeader.configure({
        HTMLAttributes: {
            class:
                'border border-gray-300 dark:border-gray-600 p-2 bg-gray-100 dark:bg-gray-800 font-semibold',
        },
    }),
    Placeholder.configure({
        placeholder: PLACEHOLDER_TEXT,
    }),
]

/**
 * TiptapEditor 메서드 인터페이스
 * MDXEditorMethods와 호환되는 인터페이스를 제공합니다.
 */
export interface TiptapEditorMethods {
    /** 에디터 내용을 MDX 문자열로 설정합니다 */
    setMarkdown: (markdown: string) => void
    /** 에디터 내용을 MDX 문자열로 반환합니다 */
    getMarkdown: () => string
    /** Tiptap Editor 인스턴스에 접근합니다 */
    getEditor: () => Editor | null
}

/**
 * 에디터 컨텍스트 값
 */
interface TiptapEditorContextValue {
    slug?: string
    editor: Editor | null
    pendingImages: PendingImageMap
}

const TiptapEditorContext = createContext<TiptapEditorContextValue | null>(null)

/**
 * TiptapEditor 컨텍스트 훅
 */
export function useTiptapEditorContext() {
    return useContext(TiptapEditorContext)
}

/**
 * TiptapEditor Props
 */
interface TiptapEditorProps {
    value: string
    editorRef?: Ref<TiptapEditorMethods | null>
    fieldChange: (value: string) => void
    slug?: string
    pendingImages?: PendingImageMap
    onAddPendingImage?: (path: string, file: File, objectURL: string) => void
}


/**
 * TiptapEditor 컴포넌트
 */
export function TiptapEditor({
    value,
    editorRef,
    fieldChange,
    slug,
    pendingImages = {},
    onAddPendingImage,
}: TiptapEditorProps) {
    const [slashCommandOpen, setSlashCommandOpen] = useState(false)
    const [slashCommandItems, setSlashCommandItems] = useState<SlashCommandItem[]>(
        [],
    )
    const [slashCommandPosition, setSlashCommandPosition] = useState({
        top: 0,
        left: 0,
    })
    const slashCommandRef = useRef<{
        onKeyDown: (event: KeyboardEvent) => boolean
    } | null>(null)

    // 버블 메뉴 상태
    const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false)
    const [bubbleMenuPosition, setBubbleMenuPosition] = useState({
        top: 0,
        left: 0,
    })

    // 이미지 다이얼로그 상태
    const [imageDialogOpen, setImageDialogOpen] = useState(false)

    // 이미지 다이얼로그 열기 이벤트 리스너
    useEffect(() => {
        const handleOpenImageDialog = () => {
            setImageDialogOpen(true)
        }

        globalThis.addEventListener('tiptap:open-image-dialog', handleOpenImageDialog)
        return () => {
            globalThis.removeEventListener('tiptap:open-image-dialog', handleOpenImageDialog)
        }
    }, [])

    // 슬래시 커맨드 확장 생성 (한 번만 생성)
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const slashCommandExtension = useMemo(
        () =>
            createSlashCommandExtension({
                render: () => {
                    let component: { onKeyDown: (event: KeyboardEvent) => boolean } | null =
                        null

                    return {
                        onStart: (props) => {
                            setSlashCommandOpen(true)
                            setSlashCommandItems(props.items)

                            const { view } = props.editor
                            const { from } = view.state.selection
                            const coords = view.coordsAtPos(from)
                            setSlashCommandPosition({
                                top: coords.bottom + 8,
                                left: coords.left,
                            })

                            component = {
                                onKeyDown: (event: KeyboardEvent) => {
                                    if (slashCommandRef.current) {
                                        return slashCommandRef.current.onKeyDown(event)
                                    }
                                    return false
                                },
                            }
                        },
                        onUpdate: (props) => {
                            setSlashCommandItems(props.items)

                            const { view } = props.editor
                            const { from } = view.state.selection
                            const coords = view.coordsAtPos(from)
                            setSlashCommandPosition({
                                top: coords.bottom + 8,
                                left: coords.left,
                            })
                        },
                        onKeyDown: (props) => {
                            if (props.event.key === 'Escape') {
                                setSlashCommandOpen(false)
                                return true
                            }
                            return component?.onKeyDown(props.event) ?? false
                        },
                        onExit: () => {
                            setSlashCommandOpen(false)
                            setSlashCommandItems([])
                        },
                    }
                },
            }),
        [],
    )

    // 전체 확장 목록 (기본 확장 + 슬래시 커맨드)
    const extensions = useMemo(
        () => [...BASE_EXTENSIONS, slashCommandExtension],
        [slashCommandExtension],
    )

    // Tiptap 에디터 초기화
    const editor = useEditor(
        {
            immediatelyRender: false,
            extensions,
            content: parseFromMdx(value),
            editorProps: {
                attributes: {
                    class: 'prose prose-lg dark:prose-invert mx-auto w-full min-h-[500px] p-6 focus:outline-none',
                },
            },
            onUpdate: ({ editor: ed }) => {
                const mdx = serializeToMdx(ed.getJSON())
                fieldChange(mdx)
            },
            onSelectionUpdate: ({ editor: ed }) => {
                const { from, to } = ed.state.selection
                const hasSelection = from !== to && !ed.state.selection.empty

                if (hasSelection) {
                    const { view } = ed
                    const coords = view.coordsAtPos(from)
                    setBubbleMenuPosition({
                        top: coords.top - 50,
                        left: coords.left,
                    })
                    setBubbleMenuOpen(true)
                } else {
                    setBubbleMenuOpen(false)
                }
            },
        },
        [], // 빈 의존성 배열로 에디터 재생성 방지
    )

    // editorRef 연결 - TiptapEditorMethods 인터페이스 구현
    useImperativeHandle(
        editorRef,
        () => ({
            setMarkdown: (markdown: string) => {
                if (editor) {
                    const content = parseFromMdx(markdown)
                    editor.commands.setContent(content)
                }
            },
            getMarkdown: () => {
                if (editor) {
                    return serializeToMdx(editor.getJSON())
                }
                return ''
            },
            getEditor: () => editor,
        }),
        [editor],
    )

    // pendingImages를 전역 스토어에 동기화
    useEffect(() => {
        setPendingImagesStore(pendingImages)
    }, [pendingImages])

    // pendingImages 변경 시 에디터 뷰 강제 업데이트
    useEffect(() => {
        if (editor && Object.keys(pendingImages).length > 0) {
            // 에디터 뷰를 강제로 업데이트하여 이미지가 다시 렌더링되도록 함
            const tr = editor.state.tr.setMeta('pendingImagesUpdated', true)
            editor.view.dispatch(tr)
        }
    }, [editor, pendingImages])

    // 컨텍스트 값
    const contextValue: TiptapEditorContextValue = {
        slug,
        editor,
        pendingImages,
    }

    // 이미지 삽입 핸들러
    const handleImageInsert = useCallback(
        (data: { src: string; alt: string; title?: string; width?: number; height?: number }) => {
            if (!editor) return

            editor
                .chain()
                .focus()
                .setImage({
                    src: data.src,
                    alt: data.alt,
                    title: data.title,
                })
                .run()
        },
        [editor],
    )

    // 이미지 업로드 핸들러 - 실제 경로를 반환하고 pendingImages에 등록
    const handleImageUpload = useCallback(
        async (file: File): Promise<string> => {
            // buildUniquePath를 사용하여 고유한 경로 생성 (파일명 정제 + 중복 방지)
            const imagePath = buildUniquePath(slug, file.name, pendingImages)

            // objectURL을 한 번만 생성하여 전역 스토어와 pendingImages에 동일하게 사용
            const objectURL = URL.createObjectURL(file)

            // 전역 스토어에 즉시 추가 (이미지 삽입 전에 미리 등록)
            setPendingImagesStore({
                ...pendingImages,
                [imagePath]: { file, objectURL },
            })

            // 동일한 objectURL을 전달하여 중복 생성 방지
            onAddPendingImage?.(imagePath, file, objectURL)

            // 실제 경로 반환 (MDX에 저장될 경로)
            return imagePath
        },
        [slug, pendingImages, onAddPendingImage],
    )

    // 슬래시 커맨드 항목 선택 핸들러
    const handleSlashCommandSelect = useCallback(
        (item: SlashCommandItem) => {
            if (!editor) return

            const { state } = editor
            const { from } = state.selection

            let deleteFrom = from
            const textBefore = state.doc.textBetween(Math.max(0, from - 20), from)
            const slashIndex = textBefore.lastIndexOf('/')
            if (slashIndex !== -1) {
                deleteFrom = from - (textBefore.length - slashIndex)
            }

            item.command({
                editor,
                range: { from: deleteFrom, to: from },
            })

            setSlashCommandOpen(false)
        },
        [editor],
    )

    return (
        <TiptapEditorContext.Provider value={contextValue}>
            <div className="relative rounded-lg border border-border bg-background">
                {editor && (
                    <>
                        {bubbleMenuOpen && (
                            <div
                                className="fixed z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                                style={{
                                    top: bubbleMenuPosition.top,
                                    left: bubbleMenuPosition.left,
                                }}
                            >
                                <EditorBubbleMenu editor={editor} />
                            </div>
                        )}

                        {slashCommandOpen && (
                            <SlashCommandMenu
                                ref={slashCommandRef}
                                items={slashCommandItems}
                                position={slashCommandPosition}
                                onSelect={handleSlashCommandSelect}
                                onClose={() => setSlashCommandOpen(false)}
                            />
                        )}
                    </>
                )}

                <EditorContent editor={editor} />

                <ImageDialog
                    open={imageDialogOpen}
                    onOpenChange={setImageDialogOpen}
                    onSubmit={handleImageInsert}
                    onUpload={handleImageUpload}
                />
            </div>
        </TiptapEditorContext.Provider>
    )
}
