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

  it('프로젝트 source에 프로젝트 종료 시간을 명시적으로 저장한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')

    const leemageSources = curatedChatSources.filter((source) => {
      return source.sourceCategory === 'project' && source.slug === 'leemage'
    })

    expect(leemageSources.length).toBeGreaterThan(0)
    expect(
      leemageSources.every((source) => {
        return (
          source.evidenceTime?.kind === 'project_ended' &&
          source.evidenceTime.value === '2026-01-01T00:00:00.000Z' &&
          source.publishedAt === undefined
        )
      }),
    ).toBe(true)
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
    expect(profileTechStackSource?.content).toContain(
      '공통/반복 기술: TypeScript, Next.js',
    )
    expect(profileTechStackSource?.searchTerms).toEqual(
      expect.arrayContaining(['주력 기술 스택', '기술 스택', 'tech stack']),
    )
  })

  it('프로필 하위 항목에 Career와 Education 계층을 보존한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')
    const careerSource = curatedChatSources.find((source) => {
      return source.sectionTitle === 'Ecount ERP'
    })
    const educationSource = curatedChatSources.find((source) => {
      return source.sectionTitle === '삼육대학교'
    })

    expect(careerSource?.content).toContain('Career > Ecount ERP')
    expect(careerSource?.searchTerms).toContain('career')
    expect(educationSource?.content).toContain('Education > 삼육대학교')
    expect(educationSource?.searchTerms).toContain('education')
  })

  it('프로젝트 intro source에 공개 링크와 기간을 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')
    const leeSpecIntroSource = curatedChatSources.find((source) => {
      return (
        source.slug === 'lee-spec-kit' &&
        source.sourceCategory === 'project' &&
        source.sectionTitle === null
      )
    })

    expect(leeSpecIntroSource?.content).toContain(
      'https://github.com/leey00nsu/lee-spec-kit',
    )
    expect(leeSpecIntroSource?.content).toContain(
      'https://www.npmjs.com/package/lee-spec-kit',
    )
    expect(leeSpecIntroSource?.content).toContain('2025-12 ~ 2026-02')
  })

  it('배포 프로젝트 전체를 요약한 검색 근거를 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')
    const deployedProjectOverviewSource = curatedChatSources.find((source) => {
      return source.id === 'ko/project/deployed-overview'
    })

    expect(deployedProjectOverviewSource?.url).toBe('/ko/projects')
    expect(deployedProjectOverviewSource?.content).toContain('정규직까지 D-7')
    expect(deployedProjectOverviewSource?.content).toContain('Stock Aquarium')
    expect(deployedProjectOverviewSource?.content).toContain(
      '나만의 수야,수호 만들기',
    )
    expect(deployedProjectOverviewSource?.searchTerms).toEqual(
      expect.arrayContaining(['배포된 프로젝트', '운영 중인 서비스']),
    )
  })

  it('소개 목록에 없는 배포 프로젝트도 개별 근거로 포함한다', async () => {
    const curatedChatSources = await getCuratedChatSources('ko')
    const daySevenSource = curatedChatSources.find((source) => {
      return (
        source.sourceCategory === 'project' &&
        source.slug === 'day-7' &&
        source.sectionTitle === null
      )
    })

    expect(daySevenSource?.url).toBe('/ko/projects/day-7')
    expect(daySevenSource?.content).toContain('배포 상태: 운영 중')
    expect(daySevenSource?.content).toContain('https://day7.leey00nsu.com/')
  })
})
