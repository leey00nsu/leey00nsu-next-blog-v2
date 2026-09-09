import { readFileSync } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import { splitResumeContent } from '@/widgets/about/lib/split-resume-content'

const RESUME_CONTENT_CASES = [
  { locale: 'ko', career: '### 경력', education: '### 학력' },
  { locale: 'en', career: '### Career', education: '### Education' },
] as const

describe('splitResumeContent', () => {
  it.each(RESUME_CONTENT_CASES)(
    '$locale 소개는 첫 페이지, 경력부터 학력까지는 두 번째 페이지로 분리한다',
    ({ locale, career, education }) => {
      const filePath = path.join(
        process.cwd(),
        'public/about',
        `about.${locale}.mdx`,
      )
      const { content } = matter(readFileSync(filePath, 'utf8'))
      const result = splitResumeContent(content)

      expect(result.introduction).not.toContain(career)
      expect(result.careerAndEducation.startsWith(career)).toBe(true)
      expect(result.careerAndEducation).toContain(education)
      expect(`${result.introduction}\n\n${result.careerAndEducation}`).toBe(
        content.trim(),
      )
    },
  )

  it('경력 제목이 누락되면 잘못된 페이지를 생성하지 않는다', () => {
    expect(() => splitResumeContent('# 소개만 있는 문서')).toThrow(
      'Resume content must include a career section',
    )
  })
})
