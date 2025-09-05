'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCodeBlockEditorContext } from '@mdxeditor/editor'

function getTitleFromMeta(meta: string) {
  const m = meta?.match(/(?:^|\s)title=\"([^\"]*)\"/)
  return m?.[1] ?? ''
}

function setTitleInMeta(meta: string, title: string) {
  const hasTitle = /(?:^|\s)title=\"([^\"]*)\"/.test(meta)
  if (hasTitle) {
    return meta.replace(/(?:^|\s)title=\"([^\"]*)\"/, (m) =>
      m.replace(/title=\"([^\"]*)\"/, `title="${title}"`),
    )
  }
  const trimmed = meta?.trim()
  const prefix = trimmed ? trimmed + ' ' : ''
  return `${prefix}title="${title}"`
}

export function CodeBlockTitleInput() {
  const { lexicalNode, setMeta } = useCodeBlockEditorContext()
  const initialMeta = useMemo(() => lexicalNode.getMeta(), [lexicalNode])
  const initialTitle = useMemo(
    () => getTitleFromMeta(initialMeta),
    [initialMeta],
  )
  const [title, setTitle] = useState(initialTitle)

  // keep input in sync when focus switches to another block
  useEffect(() => {
    setTitle(initialTitle)
  }, [initialTitle])

  return (
    <input
      type="text"
      value={title}
      onChange={(e) => {
        const value = e.target.value
        setTitle(value)
        const currentMeta = lexicalNode.getMeta()
        setMeta(setTitleInMeta(currentMeta, value))
      }}
      placeholder="제목(title) 입력"
      className="mdxeditor-toolbar-input bg-background text-foreground h-8 rounded border border-gray-300 px-2 text-sm dark:border-gray-700"
      aria-label="코드블럭 제목 입력"
    />
  )
}
