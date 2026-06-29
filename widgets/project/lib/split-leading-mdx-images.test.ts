import { describe, expect, it } from 'vitest'
import { splitLeadingMdxImages } from '@/widgets/project/lib/split-leading-mdx-images'

describe('splitLeadingMdxImages', () => {
  it('본문 앞에 연속된 이미지가 있으면 첫 이미지만 분리한다', () => {
    const result = splitLeadingMdxImages(`
![first](/first.png)

![second](/second.png)

## 프로젝트 소개

본문
`)

    expect(result.firstImageContent).toBe('![first](/first.png)')
    expect(result.remainingContent).toBe(
      '![second](/second.png)\n\n## 프로젝트 소개\n\n본문\n',
    )
  })

  it('본문 앞 이미지가 없으면 원본 내용을 유지한다', () => {
    const content = '## 프로젝트 소개\n\n본문'
    const result = splitLeadingMdxImages(content)

    expect(result.firstImageContent).toBeNull()
    expect(result.remainingContent).toBe(content)
  })
})
