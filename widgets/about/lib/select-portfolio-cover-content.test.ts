import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { selectPortfolioCoverContent } from '@/widgets/about/lib/select-portfolio-cover-content'

const PORTFOLIO_COVER_CASES = [
  { locale: 'ko', name: '# 이윤수', introduction: '### 소개' },
  { locale: 'en', name: '# Yoonsu Lee', introduction: '### About' },
] as const

describe('selectPortfolioCoverContent', () => {
  it.each(PORTFOLIO_COVER_CASES)(
    '$locale 표지는 소개까지 포함하고 경력은 제외한다',
    ({ locale, name, introduction }) => {
      const filePath = path.join(
        process.cwd(),
        'public/about',
        `about.${locale}.mdx`,
      )
      const { content } = matter(readFileSync(filePath, 'utf8'))
      const cover = selectPortfolioCoverContent(content)

      expect(cover).toContain(name)
      expect(cover).toContain('AI Product Engineer · Full-stack Developer')
      expect(cover).toContain('GitHub:')
      expect(cover).toContain('LinkedIn:')
      expect(cover).toContain('mailto:')
      expect(cover).toContain(introduction)
      expect(cover).toContain('Coolify')
      expect(cover).not.toMatch(
        /^### (?:경력|Career|활동|Experience|학력|Education)/mu,
      )
      expect(cover).not.toContain('Ecount ERP')
    },
  )

  it('경력 제목이 누락되면 전체 경력을 표지에 출력하지 않는다', () => {
    expect(() => selectPortfolioCoverContent('# 이름')).toThrow(
      'Portfolio content must include a career section',
    )
  })
})
