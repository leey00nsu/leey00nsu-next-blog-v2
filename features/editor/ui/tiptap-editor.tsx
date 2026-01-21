'use client'

/**
 * TiptapEditor 메인 컴포넌트
 *
 * Tiptap 기반 Notion 스타일 에디터입니다.
 * 기존 Editor 컴포넌트와 동일한 Props 인터페이스를 제공합니다.
 *
 * _Requirements: 8.1, 8.4, 9.1, 9.2_
 */

import {
  useEditor,
  EditorContent,
  type Editor,
  type Extensions,
} from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
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
import { AIResultBlock } from '@/features/editor/ui/ai-result-block'
import {
  INITIAL_AI_STATE,
  type AIResultState,
} from '@/features/editor/model/ai-result-state'
import { buildUniquePath } from '@/features/editor/lib/image-utils'
import { toast } from 'sonner'
import { DragHandle } from '@tiptap/extension-drag-handle-react'
import {
  useFloating,
  offset,
  flip,
  shift,
  autoUpdate,
} from '@floating-ui/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '@/shared/ui/dropdown-menu'
import {
  GripVertical,
  Trash2,
  Pilcrow,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  RefreshCw,
} from 'lucide-react'

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
  const [slashCommandItems, setSlashCommandItems] = useState<
    SlashCommandItem[]
  >([])
  const [slashCommandPosition, setSlashCommandPosition] = useState({
    top: 0,
    left: 0,
  })
  const slashCommandRef = useRef<{
    onKeyDown: (event: KeyboardEvent) => boolean
  } | null>(null)

  // 버블 메뉴 상태
  const [bubbleMenuOpen, setBubbleMenuOpen] = useState(false)
  // 선택 영역 위치 저장 (스크롤 시 재계산용)
  const selectionFromRef = useRef<number | null>(null)

  // 버블 메뉴 Floating UI - 가상 요소를 참조로 사용
  const bubbleMenuReference = useRef<{
    getBoundingClientRect: () => DOMRect
  } | null>(null)
  const {
    refs: bubbleRefs,
    floatingStyles: bubbleFloatingStyles,
    update: updateBubblePosition,
  } = useFloating({
    open: bubbleMenuOpen,
    placement: 'top-start',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['bottom-start', 'top-end', 'bottom-end'] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })
  // ESLint 우회: setFloating을 안정적인 콜백으로 감싸기
  const setBubbleFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      bubbleRefs.setFloating(node)
    },
    [bubbleRefs],
  )

  // 이미지 다이얼로그 상태
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [editingImage, setEditingImage] = useState<{
    src: string
    alt: string
    title?: string
    width?: number
    height?: number
  } | null>(null)

  // 드래그 핸들 컨텍스트 메뉴 상태
  const [dragHandleMenuOpen, setDragHandleMenuOpen] = useState(false)
  const [dragHandleMenuPosition, setDragHandleMenuPosition] = useState({
    top: 0,
    left: 0,
  })
  // 현재 호버된 노드의 위치 (공식 DragHandle의 onNodeChange에서 연동)
  const [hoveredNodePos, setHoveredNodePos] = useState<number | null>(null)

  // AI 결과 블록 상태 (TiptapEditor에서 관리하여 버블 메뉴가 닫혀도 유지)
  const [aiState, setAIState] = useState<AIResultState>(INITIAL_AI_STATE)

  // AI 결과 블록 Floating UI
  const aiResultReference = useRef<{
    getBoundingClientRect: () => DOMRect
  } | null>(null)
  const {
    refs: aiResultRefs,
    floatingStyles: aiResultFloatingStyles,
    update: updateAIResultPosition,
  } = useFloating({
    open: aiState.isVisible,
    placement: 'bottom-start',
    middleware: [
      offset(8),
      flip({ fallbackPlacements: ['top-start', 'bottom-end', 'top-end'] }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: autoUpdate,
  })
  // ESLint 우회: setFloating을 안정적인 콜백으로 감싸기
  const setAIResultFloatingRef = useCallback(
    (node: HTMLDivElement | null) => {
      aiResultRefs.setFloating(node)
    },
    [aiResultRefs],
  )

  // 이미지 다이얼로그 열기 이벤트 리스너
  useEffect(() => {
    const handleOpenImageDialog = () => {
      setEditingImage(null) // 새 이미지 삽입 모드
      setImageDialogOpen(true)
    }

    const handleEditImage = (event: Event) => {
      const customEvent = event as CustomEvent
      setEditingImage(customEvent.detail) // 이미지 수정 모드
      setImageDialogOpen(true)
    }

    globalThis.addEventListener(
      'tiptap:open-image-dialog',
      handleOpenImageDialog,
    )
    globalThis.addEventListener('tiptap:edit-image', handleEditImage)

    return () => {
      globalThis.removeEventListener(
        'tiptap:open-image-dialog',
        handleOpenImageDialog,
      )
      globalThis.removeEventListener('tiptap:edit-image', handleEditImage)
    }
  }, [])

  // 슬래시 커맨드 확장 생성 (한 번만 생성)

  const slashCommandExtension = useMemo(
    () =>
      createSlashCommandExtension({
        render: () => {
          let component: {
            onKeyDown: (event: KeyboardEvent) => boolean
          } | null = null

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
          class:
            'prose prose-lg dark:prose-invert mx-auto w-full min-h-[500px] p-6 focus:outline-none',
        },
        handleDrop: (view, event, _slice, moved) => {
          if (
            !moved &&
            event.dataTransfer &&
            event.dataTransfer.files &&
            event.dataTransfer.files.length > 0
          ) {
            const file = event.dataTransfer.files[0]
            if (file.type.startsWith('image/')) {
              // 외부 컴포넌트(이미지 업로드 로직)를 여기서 호출하기 어려우므로
              // 임시로 이벤트를 막고, 아래에서 handleImageUpload를 호출할 수 있는 방법이 필요함.
              // 하지만 useEditor 내부에서는 handleImageUpload에 직접 접근이 가능함 (closure).

              event.preventDefault()

              // 비동기 처리
              void (async () => {
                try {
                  const src = await handleImageUpload(file)
                  const { schema } = view.state
                  const coordinates = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY,
                  })

                  if (coordinates) {
                    const node = schema.nodes.image.create({
                      src,
                      alt: file.name,
                    })
                    const transaction = view.state.tr.insert(
                      coordinates.pos,
                      node,
                    )
                    view.dispatch(transaction)
                  }
                } catch (error) {
                  console.error('드래그 앤 드롭 이미지 업로드 실패:', error)
                }
              })()

              return true
            }
          }
          return false
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
          selectionFromRef.current = from
          // Floating UI 가상 참조 요소 설정
          bubbleRefs.setReference({
            getBoundingClientRect: () => {
              const coords = view.coordsAtPos(from)
              return new DOMRect(
                coords.left,
                coords.top,
                0,
                coords.bottom - coords.top,
              )
            },
          })
          setBubbleMenuOpen(true)
        } else {
          selectionFromRef.current = null
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

  // 스크롤 시 Floating UI 가상 참조 요소 업데이트
  useEffect(() => {
    if (!editor) return
    const shouldListen = bubbleMenuOpen || aiState.isVisible
    if (!shouldListen) return

    const updatePosition = () => {
      // 버블 메뉴 가상 참조 요소 업데이트
      if (bubbleMenuOpen && selectionFromRef.current !== null) {
        const { view } = editor
        bubbleRefs.setReference({
          getBoundingClientRect: () => {
            const coords = view.coordsAtPos(selectionFromRef.current!)
            return new DOMRect(
              coords.left,
              coords.top,
              0,
              coords.bottom - coords.top,
            )
          },
        })
        updateBubblePosition()
      }

      // AI 결과 블록 가상 참조 요소 업데이트
      if (aiState.isVisible && aiState.originalTo > 0) {
        const { view } = editor
        aiResultRefs.setReference({
          getBoundingClientRect: () => {
            const coordsEnd = view.coordsAtPos(aiState.originalTo)
            const coordsStart = view.coordsAtPos(aiState.originalFrom)
            return new DOMRect(coordsStart.left, coordsEnd.bottom, 0, 0)
          },
        })
        updateAIResultPosition()
      }
    }

    globalThis.addEventListener('scroll', updatePosition, true)
    return () => {
      globalThis.removeEventListener('scroll', updatePosition, true)
    }
  }, [
    bubbleMenuOpen,
    editor,
    aiState.isVisible,
    aiState.originalTo,
    aiState.originalFrom,
    bubbleRefs,
    aiResultRefs,
    updateBubblePosition,
    updateAIResultPosition,
  ])

  // aiState가 visible일 때 Floating UI 가상 참조 요소 설정
  useEffect(() => {
    if (!editor || !aiState.isVisible || aiState.originalTo <= 0) return

    const { view } = editor
    aiResultRefs.setReference({
      getBoundingClientRect: () => {
        const coordsEnd = view.coordsAtPos(aiState.originalTo)
        const coordsStart = view.coordsAtPos(aiState.originalFrom)
        return new DOMRect(coordsStart.left, coordsEnd.bottom, 0, 0)
      },
    })
    updateAIResultPosition()
  }, [
    editor,
    aiState.isVisible,
    aiState.originalTo,
    aiState.originalFrom,
    aiResultRefs,
    updateAIResultPosition,
  ])

  // 컨텍스트 값
  const contextValue: TiptapEditorContextValue = {
    slug,
    editor,
    pendingImages,
  }

  // 이미지 삽입 핸들러
  const handleImageInsert = useCallback(
    (data: {
      src: string
      alt: string
      title?: string
      width?: number
      height?: number
    }) => {
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

  // 이미지 업데이트 핸들러
  const handleImageUpdate = useCallback(
    (data: {
      src: string
      alt: string
      title?: string
      width?: number
      height?: number
    }) => {
      if (!editor) return

      editor
        .chain()
        .focus()
        .updateImage({
          src: data.src,
          alt: data.alt,
          title: data.title,
          width: data.width,
          height: data.height,
        })
        .run()
    },
    [editor],
  )

  // 다이얼로그 제출 핸들러
  const handleImageSubmit = useCallback(
    (data: {
      src: string
      alt: string
      title?: string
      width?: number
      height?: number
    }) => {
      if (editingImage) {
        handleImageUpdate(data)
      } else {
        handleImageInsert(data)
      }
    },
    [editingImage, handleImageInsert, handleImageUpdate],
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

  // 블록 삭제 핸들러 (hoveredNodePos 기반)
  const handleDeleteBlock = useCallback(() => {
    if (!editor) return

    // hoveredNodePos가 없으면 fallback으로 현재 selection 삭제
    if (hoveredNodePos === null) {
      console.warn('hoveredNodePos is null, trying fallback')
      editor.chain().focus().selectParentNode().deleteSelection().run()
      setDragHandleMenuOpen(false)
      return
    }

    try {
      const node = editor.state.doc.nodeAt(hoveredNodePos)
      if (node) {
        editor
          .chain()
          .focus()
          .deleteRange({
            from: hoveredNodePos,
            to: hoveredNodePos + node.nodeSize,
          })
          .run()
      }
    } catch (error) {
      console.error('블록 삭제 오류:', error)
      editor.chain().focus().selectParentNode().deleteSelection().run()
    }

    setDragHandleMenuOpen(false)
  }, [editor, hoveredNodePos, setDragHandleMenuOpen])

  // 블록 타입 변환 핸들러
  const handleConvertBlock = useCallback(
    (
      type:
        | 'paragraph'
        | 'heading'
        | 'bulletList'
        | 'orderedList'
        | 'blockquote'
        | 'codeBlock',
      level?: number,
    ) => {
      if (!editor || hoveredNodePos === null) return

      try {
        // 해당 노드를 선택
        editor.chain().focus().setNodeSelection(hoveredNodePos).run()

        // 타입에 따라 변환
        switch (type) {
          case 'paragraph': {
            editor.chain().focus().setParagraph().run()
            break
          }
          case 'heading': {
            editor
              .chain()
              .focus()
              .setHeading({ level: (level || 1) as 1 | 2 | 3 | 4 | 5 | 6 })
              .run()
            break
          }
          case 'bulletList': {
            editor.chain().focus().toggleBulletList().run()
            break
          }
          case 'orderedList': {
            editor.chain().focus().toggleOrderedList().run()
            break
          }
          case 'blockquote': {
            editor.chain().focus().toggleBlockquote().run()
            break
          }
          case 'codeBlock': {
            editor.chain().focus().toggleCodeBlock().run()
            break
          }
        }
      } catch (error) {
        console.error('블록 변환 오류:', error)
      }

      setDragHandleMenuOpen(false)
    },
    [editor, hoveredNodePos, setDragHandleMenuOpen],
  )

  // 드래그 핸들 onNodeChange 콜백 (안정화)
  const handleNodeChange = useCallback(
    ({ node, pos }: { node: ProseMirrorNode | null; pos: number }) => {
      if (node) {
        setHoveredNodePos(pos)
      } else {
        setHoveredNodePos(null)
      }
    },
    [setHoveredNodePos],
  )

  return (
    <TiptapEditorContext.Provider value={contextValue}>
      <div className="tiptap-wrapper border-border bg-background relative rounded-lg border">
        {editor && (
          <>
            {bubbleMenuOpen && (
              <div
                ref={setBubbleFloatingRef}
                className="z-50 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                style={bubbleFloatingStyles}
              >
                <EditorBubbleMenu
                  editor={editor}
                  aiState={aiState}
                  onAIStateChange={setAIState}
                />
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
          onOpenChange={(open) => {
            setImageDialogOpen(open)
            if (!open) setEditingImage(null)
          }}
          onSubmit={handleImageSubmit}
          onUpload={handleImageUpload}
          initialValues={editingImage || undefined}
          pendingImages={pendingImages}
        />

        {/* 공식 DragHandle 컴포넌트 - 드래그 및 클릭 메뉴 */}
        {editor && (
          <DragHandle editor={editor} onNodeChange={handleNodeChange}>
            {/* 드래그 핸들 UI - 클릭으로 메뉴, 드래그로 이동 */}
            <button
              className="flex h-6 w-6 cursor-grab items-center justify-center rounded hover:bg-gray-100 active:cursor-grabbing dark:hover:bg-gray-800"
              onMouseDown={(e) => {
                // 드래그 시작 위치 저장
                const target = e.currentTarget as HTMLButtonElement
                target.dataset.startX = String(e.clientX)
                target.dataset.startY = String(e.clientY)
              }}
              onClick={(e) => {
                // 클릭과 드래그 구분: 이동 거리가 5px 미만이면 클릭
                const target = e.currentTarget as HTMLButtonElement
                const startX = Number(target.dataset.startX || 0)
                const startY = Number(target.dataset.startY || 0)
                const distance = Math.sqrt(
                  Math.pow(e.clientX - startX, 2) +
                    Math.pow(e.clientY - startY, 2),
                )
                if (distance < 5) {
                  // 핸들 버튼의 위치 저장
                  const rect = target.getBoundingClientRect()
                  setDragHandleMenuPosition({
                    top: rect.bottom,
                    left: rect.left,
                  })
                  setDragHandleMenuOpen(true)
                }
              }}
              title="클릭으로 메뉴, 드래그로 이동"
            >
              <GripVertical className="h-4 w-4 text-gray-400" />
            </button>
          </DragHandle>
        )}

        {/* 드래그 핸들 컨텍스트 메뉴 (고정 위치) */}
        <DropdownMenu
          open={dragHandleMenuOpen}
          onOpenChange={setDragHandleMenuOpen}
        >
          <DropdownMenuTrigger asChild>
            <button
              className="pointer-events-none fixed opacity-0"
              style={{
                top: dragHandleMenuPosition.top,
                left: dragHandleMenuPosition.left,
              }}
              aria-hidden
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={4}>
            {/* 블록 타입 변환 서브메뉴 */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <RefreshCw className="mr-2 h-4 w-4" />
                다음으로 변환
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('paragraph')}
                >
                  <Pilcrow className="mr-2 h-4 w-4" />
                  텍스트
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('heading', 1)}
                >
                  <Heading1 className="mr-2 h-4 w-4" />
                  제목 1
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('heading', 2)}
                >
                  <Heading2 className="mr-2 h-4 w-4" />
                  제목 2
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('heading', 3)}
                >
                  <Heading3 className="mr-2 h-4 w-4" />
                  제목 3
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('bulletList')}
                >
                  <List className="mr-2 h-4 w-4" />
                  글머리 기호 목록
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('orderedList')}
                >
                  <ListOrdered className="mr-2 h-4 w-4" />
                  번호 목록
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('blockquote')}
                >
                  <Quote className="mr-2 h-4 w-4" />
                  인용문
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleConvertBlock('codeBlock')}
                >
                  <Code className="mr-2 h-4 w-4" />
                  코드 블록
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />

            {/* 삭제 버튼 */}
            <DropdownMenuItem
              onClick={handleDeleteBlock}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI 결과 블록 (TiptapEditor에서 관리하여 버블 메뉴가 닫혀도 유지) */}
        {aiState.isVisible && (
          <div
            ref={setAIResultFloatingRef}
            className="z-[9999]"
            style={{
              ...aiResultFloatingStyles,
              maxWidth: '500px',
              minWidth: '300px',
            }}
          >
            <AIResultBlock
              isLoading={aiState.isLoading}
              result={aiState.result}
              error={aiState.error}
              onReplace={() => {
                if (!aiState.result || !editor) return
                const { doc } = editor.state
                const originalText = aiState.originalText
                let foundPos: { from: number; to: number } | null = null
                doc.descendants((node, pos) => {
                  if (foundPos) return false
                  if (node.isText && node.text) {
                    const index = node.text.indexOf(originalText)
                    if (index !== -1) {
                      foundPos = {
                        from: pos + index,
                        to: pos + index + originalText.length,
                      }
                      return false
                    }
                  }
                  return true
                })
                if (foundPos) {
                  const { from, to } = foundPos
                  editor
                    .chain()
                    .focus()
                    .deleteRange({ from, to })
                    .insertContentAt(from, aiState.result)
                    .run()
                  toast.success('텍스트가 교체되었습니다.')
                } else {
                  editor.chain().focus().insertContent(aiState.result).run()
                  toast.info(
                    '원본 텍스트를 찾지 못해 현재 위치에 삽입했습니다.',
                  )
                }
                setAIState(INITIAL_AI_STATE)
              }}
              onInsertBelow={() => {
                if (!aiState.result || !editor) return
                const { doc } = editor.state

                // 원본 텍스트가 포함된 블록의 끝 위치 찾기
                const originalText = aiState.originalText
                let blockEndPos: number | null = null

                doc.descendants((node, pos) => {
                  if (blockEndPos !== null) return false
                  // 블록 레벨 노드 확인 (paragraph, heading 등)
                  if (node.isBlock && node.textContent.includes(originalText)) {
                    blockEndPos = pos + node.nodeSize
                    return false
                  }
                  return true
                })

                // 새로운 paragraph로 삽입
                const newParagraph = {
                  type: 'paragraph',
                  content: [{ type: 'text', text: aiState.result }],
                }

                if (blockEndPos === null) {
                  // fallback: 현재 위치에 새 paragraph 삽입
                  editor.chain().focus().insertContent(newParagraph).run()
                  toast.info(
                    '원본 텍스트를 찾지 못해 현재 위치에 삽입했습니다.',
                  )
                } else {
                  editor
                    .chain()
                    .focus()
                    .insertContentAt(blockEndPos, newParagraph)
                    .run()
                  toast.success('텍스트가 새 블록으로 삽입되었습니다.')
                }
                setAIState(INITIAL_AI_STATE)
              }}
              onCancel={() => setAIState(INITIAL_AI_STATE)}
            />
          </div>
        )}
      </div>
    </TiptapEditorContext.Provider>
  )
}
