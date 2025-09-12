'use client'

import { useEffect, useMemo, useState } from 'react'
import { useCodeBlockEditorContext } from '@mdxeditor/editor'
import { getTitleFromMeta, setTitleInMeta } from '@/features/editor/lib/codeblock-meta'
import { useTranslations } from 'next-intl'

export function CodeBlockTitleInput() {
  const t = useTranslations('editor.codeblock')
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
      placeholder={t('titlePlaceholder')}
      className="mdxeditor-toolbar-input bg-background text-foreground h-8 rounded border border-gray-300 px-2 text-sm dark:border-gray-700"
      aria-label={t('titleAria')}
    />
  )
}
