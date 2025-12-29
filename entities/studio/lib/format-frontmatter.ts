import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'

export const formatFrontmatter = (fm: Frontmatter) => {
  // tags가 빈 배열이면 인라인 빈 배열로, 아니면 YAML 리스트로 출력
  const tagsLines =
    fm.tags.length === 0
      ? ['tags: []']
      : ['tags:', ...fm.tags.map((t) => `  - ${t}`)]

  const lines = [
    '---',
    `slug: ${fm.slug}`,
    `title: ${fm.title}`,
    ...tagsLines,
    `description: ${fm.description}`,
    `date: ${fm.date}`,
    `section: ${fm.section}`,
    `series: ${fm.series ?? ''}`,
    `thumbnail: ${fm.thumbnail ?? ''}`,
    `draft: ${fm.draft}`,
    `writer: ${fm.writer}`,
    '---',
    '',
  ]
  return lines.join('\n')
}
