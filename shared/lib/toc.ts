import GithubSlugger from 'github-slugger'

export interface TocHeading {
  text: string
  slug: string
  depth: number
}

export function getTableOfContents(content: string): TocHeading[] {
  const headings: TocHeading[] = []
  const slugger = new GithubSlugger()

  // 이 정규식은 모든 ## 또는 ### 로 시작하는 줄을 찾아냅니다.
  const headingLines = content.match(/^#{2,3}\s.+/gm) || []

  for (const line of headingLines) {
    const text = line.replace(/^#{2,3}\s/, '').trim()
    const depth = line.startsWith('###') ? 3 : 2

    headings.push({
      text,
      slug: slugger.slug(text),
      depth,
    })
  }

  return headings
}
