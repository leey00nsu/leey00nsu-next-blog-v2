import { BLOG_CHAT } from '@/features/chat/config/constants'
import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'
import type { ChatRetrievalPlan } from '@/features/chat/model/chat-retrieval-plan'
import type { SupportedLocale } from '@/shared/config/constants'

export interface ChatRetrievalCorpusEvaluationCase {
  id: string
  locale: SupportedLocale
  retrievalPlan: ChatRetrievalPlan
  expectedMatchUrls: string[]
  expectRefusal?: boolean
}

function buildLookupPlan(params: {
  question: string
  sourceCategory: ChatSourceCategory
  slug: string
  title: string
  requiredConcepts: string[]
  optionalConcepts?: string[]
  scopeToTarget?: boolean
}): ChatRetrievalPlan {
  const scopeToTarget = params.scopeToTarget ?? true

  return {
    executionKind: 'retrieve_and_generate',
    standaloneQuestion: params.question,
    operation: 'explain',
    canonicalTargets: scopeToTarget
      ? [
          {
            kind: 'named_entity',
            sourceCategory: params.sourceCategory,
            slug: params.slug,
            title: params.title,
          },
        ]
      : [],
    sourceStrategy: scopeToTarget ? 'only' : 'prefer',
    sourceCategories: [params.sourceCategory],
    temporalStrategy: 'none',
    temporalOrder: null,
    requestedFields: ['content'],
    requiredConcepts: params.requiredConcepts,
    optionalConcepts: params.optionalConcepts ?? [],
    maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
  }
}

export const CHAT_RETRIEVAL_CORPUS_EVALUATION_CASES: ChatRetrievalCorpusEvaluationCase[] =
  [
    {
      id: 'ko-rag-postgresql-reason',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question: '블로그 챗봇의 벡터 저장소를 PostgreSQL로 바꾼 이유는?',
        sourceCategory: 'blog',
        slug: 'building-ai-chat-for-my-blog',
        title: '블로그 챗봇은 어떻게 RAG까지 가게 됐을까',
        requiredConcepts: ['벡터 저장소', 'PostgreSQL'],
        optionalConcepts: ['pgvector'],
      }),
      expectedMatchUrls: [
        '/ko/blog/building-ai-chat-for-my-blog#벡터-저장소를-postgresql로-바꾼-이유',
      ],
    },
    {
      id: 'ko-rag-modal-reason',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question: '임베딩 서버를 Lightning AI 대신 Modal로 옮긴 이유는?',
        sourceCategory: 'blog',
        slug: 'building-ai-chat-for-my-blog',
        title: '블로그 챗봇은 어떻게 RAG까지 가게 됐을까',
        requiredConcepts: ['Modal'],
        optionalConcepts: ['Lightning AI', '임베딩'],
      }),
      expectedMatchUrls: [
        '/ko/blog/building-ai-chat-for-my-blog#그래서-modal로-옮겼다',
      ],
    },
    {
      id: 'ko-cpu-voice-model-choice',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question:
          'CPU에서 빠른 TTS와 화자 유사도를 기준으로 어떤 모델을 골라야 해?',
        sourceCategory: 'blog',
        slug: 'running-voice-cloning-tts-without-gpu',
        title: 'GPU 없이 Voice Cloning TTS 운영하기',
        requiredConcepts: ['CPU', 'TTS'],
        optionalConcepts: ['Supertonic', 'Audio8'],
        scopeToTarget: false,
      }),
      expectedMatchUrls: [
        '/ko/blog/running-voice-cloning-tts-without-gpu#cpu-환경에서는-무엇을-선택할까',
      ],
    },
    {
      id: 'ko-interactive-movie-mobile-media',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question: '인터랙티브 무비에서 모바일 미디어 재생을 안정화한 방법은?',
        sourceCategory: 'blog',
        slug: 'building-ai-interactive-movie-d7',
        title: 'AI로 인터랙티브 무비 만들기',
        requiredConcepts: ['모바일', '미디어'],
        optionalConcepts: ['사전 다운로드', 'Blob URL'],
        scopeToTarget: false,
      }),
      expectedMatchUrls: [
        '/ko/blog/building-ai-interactive-movie-d7#모바일에서는-미디어를-먼저-내려받기',
      ],
    },
    {
      id: 'ko-leemage-presigned-upload',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question: 'Leemage가 Presigned URL로 직접 업로드하는 이유는?',
        sourceCategory: 'project',
        slug: 'leemage',
        title: 'Leemage',
        requiredConcepts: ['Presigned URL'],
        optionalConcepts: ['서버 부하'],
      }),
      expectedMatchUrls: ['/ko/projects/leemage#solution'],
    },
    {
      id: 'ko-vercel-experience',
      locale: 'ko',
      retrievalPlan: buildLookupPlan({
        question: '이윤수는 Vercel을 사용해본 적이 있어?',
        sourceCategory: 'blog',
        slug: 'why-i-do-not-use-vercel-anymore',
        title: '내가 더 이상 Vercel 호스팅을 사용하지 않는 이유',
        requiredConcepts: ['Vercel'],
        optionalConcepts: ['사용 경험'],
        scopeToTarget: false,
      }),
      expectedMatchUrls: ['/ko/blog/why-i-do-not-use-vercel-anymore'],
    },
    {
      id: 'en-react-query-shared-cache',
      locale: 'en',
      retrievalPlan: buildLookupPlan({
        question: 'How did useQuery keep two separate components synchronized?',
        sourceCategory: 'blog',
        slug: 'why-use-react-query',
        title: 'Why Should We Use React Query?',
        requiredConcepts: ['useQuery'],
        optionalConcepts: ['queryKey', 'cached data'],
        scopeToTarget: false,
      }),
      expectedMatchUrls: [
        '/en/blog/why-use-react-query#introduction-to-usequery',
      ],
    },
    {
      id: 'en-nivo-pie-chart',
      locale: 'en',
      retrievalPlan: buildLookupPlan({
        question: 'How was a pie chart created with nivo?',
        sourceCategory: 'blog',
        slug: 'nivo-chart',
        title: 'Visualizing Data with nivo Chart',
        requiredConcepts: ['pie chart', 'nivo'],
        optionalConcepts: ['ResponsivePie'],
      }),
      expectedMatchUrls: ['/en/blog/nivo-chart#creating-a-pie-chart'],
    },
    {
      id: 'en-leemage-presigned-upload',
      locale: 'en',
      retrievalPlan: buildLookupPlan({
        question: 'Why does Leemage upload files with a Presigned URL?',
        sourceCategory: 'project',
        slug: 'leemage',
        title: 'Leemage',
        requiredConcepts: ['Presigned URL'],
        optionalConcepts: ['server load'],
      }),
      expectedMatchUrls: ['/en/projects/leemage#solution'],
    },
    {
      id: 'en-leesfield-adapter',
      locale: 'en',
      retrievalPlan: buildLookupPlan({
        question:
          'How does Leesfield support extensible AI image and video generation?',
        sourceCategory: 'project',
        slug: 'leesfield',
        title: 'Leesfield',
        requiredConcepts: ['AI image/video generation'],
        optionalConcepts: ['Adapter', 'Hugging Face Space'],
      }),
      expectedMatchUrls: ['/en/projects/leesfield#key-features'],
    },
    {
      id: 'ko-unsupported-kubernetes-experience',
      locale: 'ko',
      retrievalPlan: {
        executionKind: 'retrieve_and_generate',
        standaloneQuestion:
          '이윤수의 Kubernetes 클러스터 운영 경험을 설명해줘.',
        operation: 'lookup',
        canonicalTargets: [],
        sourceStrategy: 'all',
        sourceCategories: [],
        temporalStrategy: 'none',
        temporalOrder: null,
        requestedFields: ['content'],
        requiredConcepts: ['Kubernetes'],
        optionalConcepts: [],
        maximumEvidenceCount: BLOG_CHAT.SEARCH.TOP_K,
      },
      expectedMatchUrls: [],
      expectRefusal: true,
    },
  ]
