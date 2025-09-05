'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { FrontmatterForm } from '@/features/studio/ui/frontmatter-form'
import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'
import { formatFrontmatter } from '@/entities/studio/lib/format-frontmatter'
import { Button } from '@/shared/ui/button'

const Editor = dynamic(() => import('@/features/editor/ui/editor'), {
  ssr: false,
})

export function Studio() {
  const [markdown, setMarkdown] = useState('')
  const [frontMatter, setFrontMatter] = useState<Frontmatter | undefined>()

  const finalMarkdown = () => {
    if (!frontMatter) return ''

    return `${formatFrontmatter(frontMatter)}${markdown}`
  }

  const save = () => {
    // 최종 마크다운 콘솔 출력
    console.log(finalMarkdown())
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <FrontmatterForm value={frontMatter} onChange={setFrontMatter} />
      <Editor value={markdown} fieldChange={setMarkdown} />
      <Button disabled={!frontMatter || !markdown} onClick={save}>
        저장
      </Button>
    </div>
  )
}
