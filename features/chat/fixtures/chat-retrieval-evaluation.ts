import type { ChatAssistantProfile } from '@/features/chat/model/chat-assistant'
import type { ChatContactProfile } from '@/features/chat/model/chat-contact'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'
import type { ChatQuestionRoutingResult } from '@/features/chat/model/chat-question-routing'
import type { SupportedLocale } from '@/shared/config/constants'

export interface ChatRetrievalEvaluationCase {
  id: string
  question: string
  locale: SupportedLocale
  questionRouting: ChatQuestionRoutingResult
  currentPostSlug?: string
  semanticMatches: ChatEvidenceRecord[]
  expectedTopMatchUrl?: string
  expectedMatchUrls?: string[]
}

export const CHAT_RETRIEVAL_EVALUATION_ASSISTANT_PROFILE: ChatAssistantProfile =
  {
    title: '블로그 챗봇 안내',
    description: '이 챗봇이 어떤 근거 범위에서 답하는지 설명하는 문서',
    chatbotName: '블로그 챗봇',
    ownerName: '이윤수',
    greetingAnswer:
      '안녕하세요. 저는 이윤수 님의 블로그 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
    identityAnswer:
      '저는 이윤수 님의 챗봇으로, 블로그 글과 공개된 소개 페이지를 근거로 답변하고 있어요.',
    aliases: ['이 사람 챗봇', '누구의 챗봇'],
    content:
      '저는 블로그 글과 공개된 소개 페이지를 근거로 답변합니다. 관련 글에 충분한 근거가 없으면 추측하지 않습니다.',
  }

export const CHAT_RETRIEVAL_EVALUATION_CONTACT_PROFILE: ChatContactProfile = {
  title: 'About Me',
  aboutUrl: '/ko/about',
  methods: [
    {
      label: 'GitHub',
      url: 'https://github.com/leey00nsu',
    },
  ],
}

export const CHAT_RETRIEVAL_EVALUATION_CURATED_RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/assistant/profile',
    locale: 'ko',
    slug: 'assistant-profile',
    title: '블로그 챗봇 안내',
    url: '/ko/about',
    excerpt: '이 챗봇이 어떤 근거 범위에서 답하는지 설명합니다.',
    content:
      '저는 블로그 글과 공개된 소개 페이지를 근거로 답변합니다.',
    sectionTitle: null,
    tags: ['assistant', 'chatbot'],
    searchTerms: ['블로그 챗봇', '답변 근거'],
    sourceCategory: 'assistant',
  },
  {
    id: 'ko/assistant/profile/answer-scope',
    locale: 'ko',
    slug: 'assistant-profile',
    title: '블로그 챗봇 안내',
    url: '/ko/about#answer-scope',
    excerpt: '답변 근거 범위를 설명합니다.',
    content:
      '답변 근거 범위는 블로그 글과 공개된 소개 페이지입니다. 충분한 근거가 없으면 추측하지 않습니다.',
    sectionTitle: '답변 근거 범위',
    tags: ['assistant', 'chatbot'],
    searchTerms: ['근거', '답변 근거 범위', '추측하지 않음'],
    sourceCategory: 'assistant',
  },
  {
    id: 'ko/about/profile',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/ko/about',
    excerpt: '이윤수를 소개합니다.',
    content:
      '이윤수는 React와 Next.js 중심의 사이드 프로젝트를 만들고 AI 에이전트 워크플로우를 개선하는 개발자입니다.',
    sectionTitle: null,
    tags: ['profile', 'about', 'developer'],
    searchTerms: ['이윤수', '작성자', '이름', 'yoonsu lee', 'what is his name'],
    sourceCategory: 'profile',
  },
  {
    id: 'ko/about/profile-reference-en',
    locale: 'ko',
    slug: 'about',
    title: 'About Me',
    url: '/en/about',
    excerpt: 'About this blog',
    content:
      'Yoonsu Lee is a frontend developer focused on React, Next.js, and AI-assisted workflows.',
    sectionTitle: null,
    tags: ['profile', 'about', 'canonical-reference'],
    searchTerms: [
      '영어 이름',
      'english name',
      'yoonsu lee',
      'what is his name',
    ],
    sourceCategory: 'profile',
  },
  {
    id: 'ko/project/leesfield',
    locale: 'ko',
    slug: 'leesfield',
    title: 'Leesfield',
    url: '/ko/projects/leesfield',
    excerpt: '농업 현장 기록과 운영을 돕는 서비스입니다.',
    content: 'Leesfield는 농업 현장 기록과 작업 운영을 돕는 서비스입니다.',
    sectionTitle: null,
    tags: ['project', 'agriculture'],
    searchTerms: ['leesfield', '프로젝트'],
    sourceCategory: 'project',
  },
  {
    id: 'ko/project/leesfield/key-features',
    locale: 'ko',
    slug: 'leesfield',
    title: 'Leesfield',
    url: '/ko/projects/leesfield#key-features',
    excerpt: '핵심 기능을 설명합니다.',
    content: '작물 기록, 현장 메모, 작업 상태 추적 기능을 제공합니다.',
    sectionTitle: '핵심 기능',
    tags: ['project', 'agriculture'],
    searchTerms: ['leesfield', '핵심 기능', '작물 기록'],
    sourceCategory: 'project',
  },
  {
    id: 'ko/project/lee-spec-kit',
    locale: 'ko',
    slug: 'lee-spec-kit',
    title: 'lee-spec-kit',
    url: '/ko/projects/lee-spec-kit',
    excerpt: 'AI 에이전트 기반 개발을 위한 프로젝트 문서 구조 생성 CLI입니다.',
    content:
      'lee-spec-kit은 문서 구조와 워크플로우를 표준화하는 CLI입니다.',
    sectionTitle: null,
    tags: ['project', 'cli', 'ai'],
    searchTerms: ['lee-spec-kit', 'project', 'cli', '문서 구조'],
    sourceCategory: 'project',
  },
]

export const CHAT_RETRIEVAL_EVALUATION_BLOG_RECORDS: ChatEvidenceRecord[] = [
  {
    id: 'ko/blog/why-i-built-lee-spec-kit',
    locale: 'ko',
    slug: 'why-i-built-lee-spec-kit',
    title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다: lee-spec-kit을 만든 이유',
    url: '/ko/blog/why-i-built-lee-spec-kit',
    excerpt: 'lee-spec-kit을 만든 이유를 설명합니다.',
    content:
      'lee-spec-kit은 AI가 일하기 좋은 프로젝트 구조를 만들기 위해 시작한 도구입니다.',
    sectionTitle: null,
    tags: ['lee-spec-kit', 'ai'],
    searchTerms: ['lee-spec-kit', '만든 이유', '구조'],
    publishedAt: '2025-03-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/why-i-built-lee-spec-kit/structure',
    locale: 'ko',
    slug: 'why-i-built-lee-spec-kit',
    title: 'AI 시대의 개발 생산성은 코드보다 구조에 달려 있다: lee-spec-kit을 만든 이유',
    url: '/ko/blog/why-i-built-lee-spec-kit#structure',
    excerpt: '구조의 중요성을 설명합니다.',
    content:
      '문서 구조와 하네스가 있어야 AI 에이전트가 안정적으로 일할 수 있다고 봅니다.',
    sectionTitle: '구조가 중요한 이유',
    tags: ['lee-spec-kit', 'ai'],
    searchTerms: ['구조', '하네스', '문서 구조'],
    publishedAt: '2025-03-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
  {
    id: 'ko/blog/common-philosophy',
    locale: 'ko',
    slug: 'common-philosophy',
    title: '이 블로그 전체에서 공통된 설계 철학은 구조와 재사용성이다',
    url: '/ko/blog/common-philosophy',
    excerpt: '이 블로그 전체에서 공통된 설계 철학으로 구조와 재사용성을 강조합니다.',
    content:
      '이 블로그 전체에서 공통된 설계 철학은 구조와 재사용성이라고 설명합니다.',
    sectionTitle: null,
    tags: ['ai', 'structure'],
    searchTerms: [
      '구조',
      '재사용성',
      '설계 철학',
      '공통된 설계 철학',
      '블로그 전체',
    ],
    publishedAt: '2025-04-01T00:00:00.000Z',
    sourceCategory: 'blog',
  },
]

export const CHAT_RETRIEVAL_EVALUATION_CASES: ChatRetrievalEvaluationCase[] = [
  {
    id: 'project-name',
    question: 'leesfield 알아?',
    locale: 'ko',
    questionRouting: {
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'project entity question',
    },
    semanticMatches: [],
    expectedTopMatchUrl: '/ko/projects/leesfield',
  },
  {
    id: 'profile-english-name',
    question: '영어 이름 뭐야?',
    locale: 'ko',
    questionRouting: {
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'profile lookup',
    },
    semanticMatches: [],
    expectedTopMatchUrl: '/en/about',
  },
  {
    id: 'assistant-grounding',
    question: '블로그 챗봇 답변 근거 범위가 뭐야?',
    locale: 'ko',
    questionRouting: {
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'assistant grounding',
    },
    semanticMatches: [],
    expectedTopMatchUrl: '/ko/about#answer-scope',
  },
  {
    id: 'blog-reason',
    question: 'lee-spec-kit 만든 이유가 뭐야?',
    locale: 'ko',
    questionRouting: {
      selector: 'retrieval',
      action: 'answer',
      scope: 'global',
      reason: 'blog post lookup',
    },
    semanticMatches: [],
    expectedTopMatchUrl: '/ko/blog/why-i-built-lee-spec-kit',
  },
  {
    id: 'current-post',
    question: '이 글에서 구조가 왜 중요해?',
    locale: 'ko',
    questionRouting: {
      selector: 'current_post',
      action: 'explain',
      scope: 'current_page',
      reason: 'current post context',
    },
    currentPostSlug: 'why-i-built-lee-spec-kit',
    semanticMatches: [],
    expectedTopMatchUrl: '/ko/blog/why-i-built-lee-spec-kit',
  },
  {
    id: 'corpus-philosophy',
    question: '이 블로그 전체를 보면 공통된 설계 철학이 뭐야?',
    locale: 'ko',
    questionRouting: {
      selector: 'corpus',
      action: 'summarize',
      scope: 'global',
      reason: 'cross document synthesis',
    },
    semanticMatches: [
      {
        id: 'ko/project/lee-spec-kit',
        locale: 'ko',
        slug: 'lee-spec-kit',
        title: 'lee-spec-kit',
        url: '/ko/projects/lee-spec-kit',
        excerpt: '문서 구조와 워크플로우를 표준화하는 CLI입니다.',
        content:
          '문서 구조와 워크플로우를 표준화하는 CLI입니다.',
        sectionTitle: null,
        tags: ['project', 'cli', 'ai'],
        searchTerms: ['문서 구조', '워크플로우'],
        sourceCategory: 'project',
      },
    ],
    expectedMatchUrls: [
      '/ko/blog/common-philosophy',
      '/ko/projects/lee-spec-kit',
    ],
  },
]
