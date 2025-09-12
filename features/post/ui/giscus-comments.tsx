'use client'

import Giscus, { Repo, Theme } from '@giscus/react'
import { useTheme } from 'next-themes'
import { useLocale, useTranslations } from 'next-intl'

export function GiscusComments() {
  const { resolvedTheme } = useTheme()
  const locale = useLocale()
  const t = useTranslations('post.giscus')

  const giscussTheme = resolvedTheme === 'dark' ? 'dark' : ('light' as Theme)

  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID

  if (!repo || !repoId || !category || !categoryId) {
    return (
      <div>
        <p className="text-sm text-red-500">{t('notConfigured')}</p>
      </div>
    )
  }

  return (
    <div>
      <Giscus
        id="comments"
        repo={repo as Repo}
        repoId={repoId}
        category={category}
        categoryId={categoryId}
        mapping="pathname"
        strict="1"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        lang={locale as 'ko' | 'en'}
        theme={giscussTheme}
      />
    </div>
  )
}
