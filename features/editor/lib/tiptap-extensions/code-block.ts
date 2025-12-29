/**
 * 커스텀 코드블록 확장
 *
 * 기본 CodeBlockLowlight를 확장하여 다음 기능을 추가합니다:
 * - 언어 선택 속성
 * - 제목(figcaption) 속성
 * - Tab 키 들여쓰기 처리
 * - NodeView를 통한 UI 제공
 *
 * _Requirements: 4.1, 4.2, 4.4_
 */

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { CodeBlockNodeView } from '../../ui/code-block-node-view'

const TAB_SIZE = 2
const TAB_CHARACTER = ' '.repeat(TAB_SIZE)

// lowlight 인스턴스 생성 (일반적인 언어들 포함)
const lowlight = createLowlight(common)

/**
 * 지원하는 프로그래밍 언어 목록
 */
export const SUPPORTED_LANGUAGES = [
  { value: '', label: '일반 텍스트' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'shell', label: 'Shell' },
  { value: 'dockerfile', label: 'Dockerfile' },
] as const

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]['value']

/**
 * 커스텀 코드블록 확장
 *
 * CodeBlockLowlight를 확장하여 title 속성과 Tab 키 처리를 추가합니다.
 */
export const CustomCodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: '',
        parseHTML: (element) => {
          const classNames = element.firstElementChild?.className || ''
          const match = classNames.match(/language-(\w+)/)
          return match?.[1] || ''
        },
        renderHTML: (attributes) => {
          if (!attributes.language) {
            return {}
          }
          return {
            class: `language-${attributes.language}`,
          }
        },
      },
      title: {
        default: '',
        parseHTML: (element) => {
          return element.dataset.title || ''
        },
        renderHTML: (attributes) => {
          if (!attributes.title) {
            return {}
          }
          return {
            'data-title': attributes.title,
          }
        },
      },
    }
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockNodeView)
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Tab 키: 들여쓰기 삽입
      Tab: () => {
        if (this.editor.isActive('codeBlock')) {
          return this.editor.commands.insertContent(TAB_CHARACTER)
        }
        return false
      },
      // Shift+Tab: 들여쓰기 제거
      'Shift-Tab': () => {
        if (this.editor.isActive('codeBlock')) {
          const { state } = this.editor
          const { selection } = state
          const { $from } = selection

          // 현재 줄의 시작 위치 찾기
          const lineStart = $from.start()
          const textBefore = state.doc.textBetween(lineStart, $from.pos)

          // 줄 시작이 공백으로 시작하면 제거
          if (textBefore.startsWith(TAB_CHARACTER)) {
            return this.editor
              .chain()
              .deleteRange({
                from: lineStart,
                to: lineStart + TAB_SIZE,
              })
              .run()
          }
          return true
        }
        return false
      },
    }
  },
}).configure({
  lowlight,
  defaultLanguage: '',
})
