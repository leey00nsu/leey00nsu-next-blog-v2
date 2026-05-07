import { describe, expect, it } from 'vitest'
import { getCuratedChatSources } from '@/features/chat/model/get-curated-chat-sources'

describe('getCuratedChatSources', () => {
  it('ko 로케일은 영어 프로필 참조 source도 함께 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')

    const englishProfileReferenceSource = curatedChatSources.find((source) => {
      return source.sourceCategory === 'profile' && source.url === '/en/about'
    })

    expect(englishProfileReferenceSource).toBeDefined()
    expect(englishProfileReferenceSource?.locale).toBe('ko')
    expect(englishProfileReferenceSource?.content).toContain('Yoonsu Lee')
    expect(englishProfileReferenceSource?.searchTerms).toEqual(
      expect.arrayContaining(['영어 이름', 'english name']),
    )
  })

  it('프로젝트와 assistant 문서를 heading section 단위로 분할한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')

    const projectSectionSource = curatedChatSources.find((source) => {
      return (
        source.sourceCategory === 'project' &&
        source.slug === 'leesfield' &&
        source.sectionTitle === '핵심 기능'
      )
    })
    const assistantSectionSource = curatedChatSources.find((source) => {
      return (
        source.sourceCategory === 'assistant' &&
        source.slug === 'assistant-profile' &&
        source.sectionTitle === '답변 근거 범위'
      )
    })

    expect(projectSectionSource).toBeDefined()
    expect(projectSectionSource?.url).toContain('#')
    expect(assistantSectionSource).toBeDefined()
    expect(assistantSectionSource?.url).toContain('#')
  })

  it('프로젝트 전체 기술 스택을 합친 profile source를 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')

    const profileTechStackSource = curatedChatSources.find((source) => {
      return source.id === 'ko/about/profile-tech-stack'
    })

    expect(profileTechStackSource).toBeDefined()
    expect(profileTechStackSource?.sourceCategory).toBe('profile')
    expect(profileTechStackSource?.url).toBe('/ko/about')
    expect(profileTechStackSource?.sectionTitle).toBe('주력 기술 스택')
    expect(profileTechStackSource?.content).toContain('Leesfield')
    expect(profileTechStackSource?.content).toContain('Leemage')
    expect(profileTechStackSource?.content).toContain('Next.js')
    expect(profileTechStackSource?.content).toContain('TypeScript')
    expect(profileTechStackSource?.searchTerms).toEqual(
      expect.arrayContaining(['주력 기술 스택', '기술 스택', 'tech stack']),
    )
  })
})
