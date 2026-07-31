function parseIntegerEnvironmentValue(
  environmentValue: string | undefined,
  fallbackValue: number,
): number {
  if (!environmentValue) {
    return fallbackValue
  }

  const parsedValue = Number.parseInt(environmentValue, 10)

  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
}

export const BLOG_CHAT = {
  EVIDENCE_VERSION:
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.GIT_COMMIT_SHA ??
    'development',
  INPUT: {
    MAXIMUM_QUESTION_CHARACTERS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_MAXIMUM_QUESTION_CHARACTERS,
      200,
    ),
  },
  SEARCH: {
    TOP_K: parseIntegerEnvironmentValue(process.env.BLOG_CHAT_SEARCH_TOP_K, 3),
    AGGREGATE_TOP_K: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_SEARCH_AGGREGATE_TOP_K,
      6,
    ),
    MAXIMUM_MATCHES_PER_SLUG: 2,
    MAXIMUM_MATCHES_PER_SLUG_FOR_AGGREGATE: 1,
    MINIMUM_MATCHED_TOKEN_COUNT: 2,
    SOURCE_CATEGORY_BOOST: 4,
    EXACT_TITLE_MATCH_BOOST: 5,
    MINIMUM_SCORE: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_SEARCH_MINIMUM_SCORE,
      6,
    ),
    FIELD_SCORE: {
      TITLE: 4,
      SECTION: 5,
      CONTENT: 3,
      TAG: 2,
    },
  },
  PROMPT: {
    MAXIMUM_CONTEXT_RECORD_COUNT: 6,
    MAXIMUM_CONTEXT_CHARACTERS: 4800,
    MAXIMUM_QUESTION_CHARACTERS: 400,
    MODEL_TIMEOUT_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_ANSWER_MODEL_TIMEOUT_MS,
      20 * 1000,
    ),
    MAXIMUM_ATTEMPT_COUNT: 2,
  },
  PLANNER: {
    MAXIMUM_QUESTION_CHARACTERS: 300,
    MODEL_TIMEOUT_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_PLANNER_MODEL_TIMEOUT_MS,
      15 * 1000,
    ),
  },
  CACHE: {
    TTL_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_CACHE_TTL_MS,
      5 * 60 * 1000,
    ),
  },
  SEMANTIC_CACHE: {
    TTL_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_SEMANTIC_CACHE_TTL_MS,
      10 * 60 * 1000,
    ),
    MAXIMUM_ENTRY_COUNT: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_SEMANTIC_CACHE_MAXIMUM_ENTRY_COUNT,
      100,
    ),
    MINIMUM_SIMILARITY_SCORE: Number(
      process.env.BLOG_CHAT_SEMANTIC_CACHE_MINIMUM_SIMILARITY_SCORE ?? 0.92,
    ),
  },
  RERANK: {
    MAXIMUM_CANDIDATE_COUNT: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RERANK_MAXIMUM_CANDIDATE_COUNT,
      5,
    ),
    LONG_QUESTION_MINIMUM_LENGTH: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RERANK_LONG_QUESTION_MINIMUM_LENGTH,
      36,
    ),
    MINIMUM_MATCH_COUNT: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RERANK_MINIMUM_MATCH_COUNT,
      2,
    ),
  },
  FOLLOW_UP: {
    MAXIMUM_SUGGESTION_COUNT: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_MAXIMUM_FOLLOW_UP_SUGGESTIONS,
      3,
    ),
  },
  OBSERVABILITY: {
    MAXIMUM_LOGGED_MATCH_COUNT: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_MAXIMUM_LOGGED_MATCH_COUNT,
      5,
    ),
  },
  RATE_LIMIT: {
    WINDOW_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RATE_LIMIT_WINDOW_MS,
      60 * 1000,
    ),
    MAXIMUM_REQUESTS_PER_WINDOW: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RATE_LIMIT_MAXIMUM_REQUESTS,
      5,
    ),
    MAXIMUM_CONCURRENT_REQUESTS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RATE_LIMIT_MAXIMUM_CONCURRENT_REQUESTS,
      1,
    ),
  },
  LIMIT: {
    MAXIMUM_DAILY_REQUESTS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_MAXIMUM_DAILY_REQUESTS,
      100,
    ),
  },
  ACTIVITY: {
    STEP_LABELS: {
      ko: {
        understanding_question: '질문의 대상과 범위를 확인하고 있어요',
        checking_sources: '공개된 자료를 확인하고 있어요',
        searching_evidence: '관련 글과 프로젝트를 검색하고 있어요',
        selecting_evidence: '답변에 사용할 근거를 선별했어요',
        generating_answer: '근거를 바탕으로 답변을 작성하고 있어요',
        validating_answer: '답변과 출처가 일치하는지 확인하고 있어요',
      },
      en: {
        understanding_question: 'Understanding the question and its scope',
        checking_sources: 'Checking public information',
        searching_evidence: 'Searching related posts and projects',
        selecting_evidence: 'Selecting evidence for the answer',
        generating_answer: 'Writing an answer from the evidence',
        validating_answer: 'Checking the answer against its sources',
      },
    },
  },
} as const
