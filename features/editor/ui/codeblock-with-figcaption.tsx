'use client'

import { CodeBlockEditorProps, CodeMirrorEditor } from '@mdxeditor/editor'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'
import { CodeBlockTitleInput } from '@/features/editor/ui/codeblock-title-input'

function extractCaption(meta: string, language: string) {
  const titleMatch = meta?.match(/(?:^|\s)title=\"([^\"]+)\"/)
  if (titleMatch?.[1]) return titleMatch[1]
  const filenameMatch = meta?.match(/(?:^|\s)filename=\"([^\"]+)\"/)
  if (filenameMatch?.[1]) return filenameMatch[1]
  if (meta) return meta
  return language
}

export function CodeBlockWithFigcaption(props: CodeBlockEditorProps) {
  return (
    <figure
      data-rehype-pretty-code-figure
      className="not-prose my-4 overflow-hidden rounded-lg border border-border"
    >
      <CustomFigcaption data-rehype-pretty-code-title>
        <CodeBlockTitleInput />
      </CustomFigcaption>
      {/* Render the default CodeMirror editor for code editing */}
      <CodeMirrorEditor {...props} />
    </figure>
  )
}
