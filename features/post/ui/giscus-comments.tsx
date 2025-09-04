'use client'

import Giscus, { Repo } from '@giscus/react'

export default function GiscusComments() {
  const repo = process.env.NEXT_PUBLIC_GISCUS_REPO
  const repoId = process.env.NEXT_PUBLIC_GISCUS_REPO_ID
  const category = process.env.NEXT_PUBLIC_GISCUS_CATEGORY
  const categoryId = process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID

  if (!repo || !repoId || !category || !categoryId) {
    return (
      <div>
        <p className="text-sm text-red-500">
          Giscus가 설정되지 않았습니다. NEXT_PUBLIC_GISCUS_REPO,
          NEXT_PUBLIC_GISCUS_REPO_ID, NEXT_PUBLIC_GISCUS_CATEGORY,
          NEXT_PUBLIC_GISCUS_CATEGORY_ID를 설정하세요.
        </p>
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
        theme="preferred_color_scheme"
        lang="ko"
        loading="lazy"
      />
    </div>
  )
}
