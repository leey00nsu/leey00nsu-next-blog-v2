/**
 * 슬래시 커맨드 확장
 *
 * `/` 입력 시 블록 삽입 메뉴를 표시합니다.
 * Notion 스타일의 슬래시 커맨드를 구현합니다.
 *
 * _Requirements: 2.1, 2.2, 2.3, 2.4_
 */

import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion'
import type { Editor, Range } from '@tiptap/core'
import type { LucideIcon } from 'lucide-react'
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  ImageIcon,
  Table,
  Minus,
} from 'lucide-react'

/**
 * 슬래시 커맨드 항목 인터페이스
 */
export interface SlashCommandItem {
  title: string
  description: string
  icon: LucideIcon
  command: (props: { editor: Editor; range: Range }) => void
  keywords: string[]
}

/**
 * 슬래시 커맨드 메뉴 항목 목록
 */
export const SLASH_COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: '제목 1',
    description: '큰 제목',
    icon: Heading1,
    keywords: ['heading', 'h1', '제목', '헤딩'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 1 }).run()
    },
  },
  {
    title: '제목 2',
    description: '중간 제목',
    icon: Heading2,
    keywords: ['heading', 'h2', '제목', '헤딩'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run()
    },
  },
  {
    title: '제목 3',
    description: '작은 제목',
    icon: Heading3,
    keywords: ['heading', 'h3', '제목', '헤딩'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run()
    },
  },
  {
    title: '글머리 기호',
    description: '순서 없는 목록',
    icon: List,
    keywords: ['bullet', 'list', 'ul', '목록', '리스트'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run()
    },
  },
  {
    title: '번호 매기기',
    description: '순서 있는 목록',
    icon: ListOrdered,
    keywords: ['numbered', 'list', 'ol', '번호', '목록', '리스트'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run()
    },
  },
  {
    title: '인용문',
    description: '인용 블록',
    icon: Quote,
    keywords: ['quote', 'blockquote', '인용', '인용문'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run()
    },
  },
  {
    title: '코드 블록',
    description: '코드 스니펫',
    icon: Code,
    keywords: ['code', 'codeblock', '코드', '코드블록'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run()
    },
  },
  {
    title: '이미지',
    description: '이미지 삽입',
    icon: ImageIcon,
    keywords: ['image', 'img', '이미지', '사진'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run()
      // 이미지 다이얼로그는 UI 컴포넌트에서 처리
      // 커스텀 이벤트를 발생시켜 다이얼로그를 열도록 함
      const event = new CustomEvent('tiptap:open-image-dialog')
      globalThis.dispatchEvent(event)
    },
  },
  {
    title: '테이블',
    description: '테이블 삽입',
    icon: Table,
    keywords: ['table', '테이블', '표'],
    command: ({ editor, range }) => {
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run()
    },
  },
  {
    title: '구분선',
    description: '수평 구분선',
    icon: Minus,
    keywords: ['divider', 'hr', 'horizontal', '구분선', '수평선'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run()
    },
  },
]


/**
 * 슬래시 커맨드 항목을 필터링합니다.
 *
 * @param items - 전체 항목 목록
 * @param query - 검색 쿼리
 * @returns 필터링된 항목 목록
 */
export function filterSlashCommandItems(
  items: SlashCommandItem[],
  query: string,
): SlashCommandItem[] {
  const normalizedQuery = query.toLowerCase().trim()

  if (!normalizedQuery) {
    return items
  }

  return items.filter((item) => {
    const titleMatch = item.title.toLowerCase().includes(normalizedQuery)
    const descriptionMatch = item.description
      .toLowerCase()
      .includes(normalizedQuery)
    const keywordMatch = item.keywords.some((keyword) =>
      keyword.toLowerCase().includes(normalizedQuery),
    )

    return titleMatch || descriptionMatch || keywordMatch
  })
}

/**
 * 슬래시 커맨드 Suggestion 옵션
 */
export interface SlashCommandSuggestionOptions {
  /**
   * 메뉴 렌더링 함수
   * React 컴포넌트에서 구현합니다.
   */
  render: SuggestionOptions<SlashCommandItem>['render']
}

/**
 * 슬래시 커맨드 확장을 생성합니다.
 *
 * @param options - Suggestion 옵션
 * @returns Tiptap Extension
 */
export function createSlashCommandExtension(
  options: SlashCommandSuggestionOptions,
) {
  return Extension.create({
    name: 'slashCommand',

    addOptions() {
      return {
        suggestion: {
          char: '/',
          command: ({
            editor,
            range,
            props,
          }: {
            editor: Editor
            range: Range
            props: SlashCommandItem
          }) => {
            props.command({ editor, range })
          },
          items: ({ query }: { query: string }) => {
            return filterSlashCommandItems(SLASH_COMMAND_ITEMS, query)
          },
          render: options.render,
        } satisfies Omit<SuggestionOptions<SlashCommandItem>, 'editor'>,
      }
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ]
    },
  })
}
