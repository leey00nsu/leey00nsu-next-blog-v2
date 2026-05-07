import { describe, expect, it } from 'vitest'
import { selectFinalChatEvidence } from '@/features/chat/lib/select-final-chat-evidence'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionPlan } from '@/features/chat/model/chat-question-plan'

const TECH_STACK_QUESTION_PLAN: ChatQuestionPlan = {
  standaloneQuestion: '이윤수의 주력 기술 스택은 무엇인가요?',
  action: 'answer',
  route: 'retrieve',
  directAction: 'none',
  retrievalScope: 'entity',
  referenceTarget: {
    kind: 'profile',
    sourceCategory: 'profile',
    slug: 'about',
    title: 'About Me',
    confidence: 'high',
  },
  preferredSourceCategories: ['profile', 'project'],
  additionalKeywords: ['주력 기술 스택', '기술 스택'],
  clarificationQuestion: null,
  reason: '사용자의 기술 스택을 묻는 프로필 질문입니다.',
}

function createEvidenceRecord(
  record: Partial<ChatEvidenceRecord> & Pick<ChatEvidenceRecord, 'id' | 'content'>,
): ChatEvidenceRecord {
  return {
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/ko/about',
    excerpt: record.content,
    sectionTitle: null,
    tags: [],
    sourceCategory: 'profile',
    ...record,
  }
}

describe('selectFinalChatEvidence', () => {
  it('semantic 후보가 있어도 질문 토큰과 강하게 맞는 lexical curated 근거를 우선한다', () => {
    const weakSemanticProfileRecord = createEvidenceRecord({
      id: 'ko/about/introduction',
      content:
        '블로그 소개 이윤수 아이디어를 빠르게 실험해 제품 형태로 구현하는 과정을 즐깁니다.',
    })
    const weakSemanticActivityRecord = createEvidenceRecord({
      id: 'ko/about/likelion',
      sectionTitle: '멋쟁이사자처럼',
      content:
        '프론트엔드 멤버와 운영진으로 활동하며 세션 강의 및 동아리 활동을 지원했습니다.',
    })
    const profileTechStackRecord = createEvidenceRecord({
      id: 'ko/about/profile-tech-stack',
      sectionTitle: '주력 기술 스택',
      content:
        '주력 기술 스택 Next.js, TypeScript, Tailwind CSS, Prisma, PostgreSQL, TanStack Query',
      searchTerms: ['주력 기술 스택', '기술 스택', 'Next.js', 'TypeScript'],
    })

    const selectedMatches = selectFinalChatEvidence({
      question: '이윤수의 주력 기술 스택은 뭐야?',
      locale: 'ko',
      questionPlan: TECH_STACK_QUESTION_PLAN,
      retrievalScope: {
        mode: 'entity',
        sourceCategory: 'profile',
        slug: 'about',
        title: 'About Me',
      },
      lexicalMatches: [profileTechStackRecord],
      semanticMatches: [weakSemanticActivityRecord, weakSemanticProfileRecord],
    })

    expect(selectedMatches[0]?.id).toBe('ko/about/profile-tech-stack')
  })
})
