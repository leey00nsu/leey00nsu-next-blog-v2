import type { ChatSourceCategory } from '@/features/chat/model/chat-evidence'

export const CHAT_QUESTION_RULES = {
  GREETING_PATTERNS: [
    '안녕',
    '안녕하세요',
    'hello',
    'hi',
    '누구야',
    '뭐 하는 챗봇',
    '무슨 챗봇',
  ],
  SPLIT_PATTERNS: [' 그리고 ', ' 또 ', ' 및 ', ' 하고 ', '했고 '],
  INTENTS: {
    profile: {
      patterns: [
        '이 사람',
        '어떤 사람이야',
        '무슨 개발자',
        '어떤 개발자',
        '소개',
        '자기소개',
        '블로그 주인',
      ],
      expansionKeywords: [
        '개발자',
        '소개',
        'about',
        'profile',
        'developer',
      ],
      preferredSourceCategories: ['profile'],
    },
    education: {
      patterns: [
        '학력',
        '대학',
        '학교',
        '전공',
        '출신',
        '어느 학교',
        '어떤 대학',
      ],
      expansionKeywords: [
        '대학',
        '학교',
        '전공',
        'education',
        'university',
      ],
      preferredSourceCategories: ['profile'],
    },
    career: {
      patterns: [
        '경력',
        '커리어',
        '어디서 일',
        '회사',
        '직무',
        '업무',
        '직장',
      ],
      expansionKeywords: [
        '경력',
        '커리어',
        '회사',
        '업무',
        'career',
        'experience',
      ],
      preferredSourceCategories: ['profile'],
    },
    projects: {
      patterns: [
        '대표 프로젝트',
        '주요 프로젝트',
        '프로젝트',
        '뭘 만들었',
        '무엇을 만들었',
        '대표작',
        '사이드 프로젝트',
        '만든 서비스',
      ],
      expansionKeywords: [
        '프로젝트',
        '대표작',
        'side project',
        '만든 것',
      ],
      preferredSourceCategories: ['project'],
    },
    'tech-stack': {
      patterns: [
        '기술스택',
        '기술 스택',
        '스택',
        '주로 쓰는 기술',
        '어떤 기술',
        '주력 기술',
        '프론트엔드',
        '백엔드',
        '인프라',
        '배포',
      ],
      expansionKeywords: [
        '기술 스택',
        'react',
        'next.js',
        'typescript',
        'frontend',
        'backend',
      ],
      preferredSourceCategories: ['profile', 'project'],
    },
    'blog-purpose': {
      patterns: ['왜 블로그', '블로그 목적', '무슨 글을 쓰', '어떤 글을 쓰'],
      expansionKeywords: ['블로그', '글', 'writing', 'purpose'],
      preferredSourceCategories: ['profile', 'blog'],
    },
  },
  TERM_EXPANSIONS: {
    staletime: ['유효 기간', '유효기간', '캐시', '데이터 유효 기간'],
    cachetime: ['캐시 시간', '캐시 유지 시간'],
    querykey: ['쿼리 키', '쿼리키'],
    usequery: ['use query', 'useQuery'],
    usemutation: ['use mutation', 'useMutation'],
    harness: ['하네스', 'harness engineering'],
    하네스: ['harness', 'harness engineering'],
    reactquery: ['react query', 'react-query'],
    nextjs: ['next.js', 'next js'],
    기술스택: ['기술 스택', '주로 쓰는 기술'],
  },
  CONTEXT_QUERY_PATTERNS: [
    '이 글',
    '이 문서',
    '이 포스트',
    '이 프로젝트',
    '이 도구',
    '이 사람',
    '이 서비스',
    '이 라이브러리',
    '이거',
    '이건',
    '짧게 소개',
  ],
} as const satisfies {
  GREETING_PATTERNS: string[]
  SPLIT_PATTERNS: string[]
  INTENTS: Record<
    string,
    {
      patterns: string[]
      expansionKeywords: string[]
      preferredSourceCategories: ChatSourceCategory[]
    }
  >
  TERM_EXPANSIONS: Record<string, string[]>
  CONTEXT_QUERY_PATTERNS: string[]
}
