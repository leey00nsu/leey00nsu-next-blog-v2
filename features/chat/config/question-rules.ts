export const CHAT_QUESTION_RULES = {
  SPLIT_PATTERNS: [' 그리고 ', ' 또 ', ' 및 ', ' 하고 ', '했고 '],
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
    vercel: ['버셀'],
    기술스택: ['기술 스택', '주로 쓰는 기술'],
    동아리: ['experience'],
    대화형: ['인터랙티브', 'interactive'],
    영화: ['무비', 'movie'],
  },
  CONTEXT_QUERY_PATTERNS: [
    '이 글',
    '이 문서',
    '이 포스트',
    '이 프로젝트',
    '이 도구',
    '이 서비스',
    '이 라이브러리',
    '이거',
    '이건',
    '짧게 소개',
  ],
} as const satisfies {
  SPLIT_PATTERNS: string[]
  TERM_EXPANSIONS: Record<string, string[]>
  CONTEXT_QUERY_PATTERNS: string[]
}
