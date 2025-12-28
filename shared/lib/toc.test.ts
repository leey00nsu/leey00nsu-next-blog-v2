import { describe, it, expect } from 'vitest'
import { getTableOfContents } from './toc'

describe('getTableOfContents', () => {
  it('## 헤딩을 depth 2로 파싱한다', () => {
    const content = '## 제목'
    const result = getTableOfContents(content)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '제목',
      slug: '제목',
      depth: 2,
    })
  })

  it('### 헤딩을 depth 3으로 파싱한다', () => {
    const content = '### 소제목'
    const result = getTableOfContents(content)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      text: '소제목',
      slug: '소제목',
      depth: 3,
    })
  })

  it('여러 헤딩을 순서대로 파싱한다', () => {
    const content = `
## 첫 번째 섹션
본문 내용
### 하위 섹션
더 많은 내용
## 두 번째 섹션
`
    const result = getTableOfContents(content)

    expect(result).toHaveLength(3)
    expect(result[0].text).toBe('첫 번째 섹션')
    expect(result[0].depth).toBe(2)
    expect(result[1].text).toBe('하위 섹션')
    expect(result[1].depth).toBe(3)
    expect(result[2].text).toBe('두 번째 섹션')
    expect(result[2].depth).toBe(2)
  })

  it('# 헤딩(h1)은 무시한다', () => {
    const content = `
# 메인 제목
## 섹션
`
    const result = getTableOfContents(content)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('섹션')
  })

  it('#### 이상의 헤딩은 무시한다', () => {
    const content = `
## 섹션
#### 깊은 헤딩
##### 더 깊은 헤딩
`
    const result = getTableOfContents(content)

    expect(result).toHaveLength(1)
    expect(result[0].text).toBe('섹션')
  })

  it('헤딩이 없으면 빈 배열을 반환한다', () => {
    const content = '본문만 있는 내용입니다.'
    const result = getTableOfContents(content)

    expect(result).toEqual([])
  })

  it('영문 헤딩의 slug를 생성한다', () => {
    const content = '## Getting Started'
    const result = getTableOfContents(content)

    expect(result[0].slug).toBe('getting-started')
  })

  it('헤딩 텍스트의 앞뒤 공백을 제거한다', () => {
    const content = '##   공백이 있는 제목   '
    const result = getTableOfContents(content)

    expect(result[0].text).toBe('공백이 있는 제목')
  })
})
