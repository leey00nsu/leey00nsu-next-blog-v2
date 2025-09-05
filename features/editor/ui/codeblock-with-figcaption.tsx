'use client'

import { CodeBlockEditorProps, CodeMirrorEditor } from '@mdxeditor/editor'
import { CustomFigcaption } from '@/features/post/ui/custom-figcaption'
import { CodeBlockTitleInput } from '@/features/editor/ui/codeblock-title-input'

export function CodeBlockWithFigcaption(props: CodeBlockEditorProps) {
  return (
    <figure
      data-rehype-pretty-code-figure
      className="not-prose my-4 overflow-hidden rounded-lg"
    >
      <CustomFigcaption data-rehype-pretty-code-title>
        <CodeBlockTitleInput />
      </CustomFigcaption>
      {/* Render the default CodeMirror editor for code editing */}
      <CodeMirrorEditor {...props} />
    </figure>
  )
}
