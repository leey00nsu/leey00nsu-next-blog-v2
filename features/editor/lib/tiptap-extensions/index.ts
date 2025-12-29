/**
 * Tiptap 확장 구성
 *
 * 기본 확장과 커스텀 확장을 조합하여 에디터에 필요한 모든 기능을 제공합니다.
 */

import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import type { Extensions } from '@tiptap/react'

const PLACEHOLDER_TEXT = "'/'를 입력하여 블록 추가..."

// lowlight 인스턴스 생성 (일반적인 언어들 포함)
const lowlight = createLowlight(common)

/**
 * 기본 Tiptap 확장 구성
 *
 * StarterKit에서 codeBlock을 비활성화하고 CodeBlockLowlight로 대체합니다.
 * Tiptap v3에서 StarterKit에 Link와 Underline이 포함되었으므로
 * 커스텀 설정을 위해 비활성화하고 별도로 추가합니다.
 */
export function createTiptapExtensions(): Extensions {
  return [
    // 기본 확장 (제목, 문단, 굵게, 기울임, 취소선, 목록, 인용문, 코드, 구분선 등)
    StarterKit.configure({
      codeBlock: false, // CodeBlockLowlight로 대체
      // Tiptap v3: Link와 Underline이 StarterKit에 포함됨
      // 커스텀 설정을 위해 비활성화하고 별도로 추가
      link: false,
      underline: false,
    }),

    // 텍스트 서식 확장
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        class: 'text-blue-600 dark:text-blue-400 underline',
      },
    }),

    // 코드블록 (구문 강조 지원)
    CodeBlockLowlight.configure({
      lowlight,
      defaultLanguage: 'plaintext',
    }),

    // 이미지
    Image.configure({
      HTMLAttributes: {
        class: 'rounded-lg max-w-full',
      },
    }),

    // 테이블
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

    // 플레이스홀더
    Placeholder.configure({
      placeholder: PLACEHOLDER_TEXT,
    }),
  ]
}
