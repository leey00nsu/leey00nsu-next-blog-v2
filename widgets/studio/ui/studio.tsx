'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'

const Editor = dynamic(() => import('@/features/editor/ui/editor'), {
  ssr: false,
})

type StudioProps = {
  existingSlugs: string[]
  existingTags: string[]
}

export function Studio({ existingSlugs, existingTags }: StudioProps) {
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()

  const bodyMarkdown = useMemo(
    () => markdown.replace(/^---[\s\S]*?---\n?/, ''),
    [markdown],
  )
  const finalMarkdown = useMemo(() => {
    if (!frontMatter) return bodyMarkdown
    return `${formatFrontmatter(frontMatter)}${bodyMarkdown}`
  }, [frontMatter, bodyMarkdown])

  const save = () => {
    // 최종 마크다운 콘솔 출력
    console.log(finalMarkdown)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FrontmatterForm
        value={frontMatter}
        onChange={setFrontMatter}
        existingSlugs={existingSlugs}
        suggestionTags={existingTags}
      />
      <Editor value={markdown} fieldChange={setMarkdown} />
      <Button disabled={!frontMatter || !markdown} onClick={save}>
        저장
      </Button>
    </div>
  )
}
