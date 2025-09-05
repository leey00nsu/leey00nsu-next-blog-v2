import { Frontmatter } from '@/entities/studio/model/frontmatter-schema'

export const formatFrontmatter = (fm: Frontmatter) => {
  const lines = [
    '---',
    `slug: ${fm.slug}`,
    `title: ${fm.title}`,
    'tags:',
    ...fm.tags.map((t) => `  - ${t}`),
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
