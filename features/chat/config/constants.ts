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
  INPUT: {
    MAXIMUM_QUESTION_CHARACTERS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_MAXIMUM_QUESTION_CHARACTERS,
      200,
    ),
  },
  SEARCH: {
    TOP_K: parseIntegerEnvironmentValue(process.env.BLOG_CHAT_SEARCH_TOP_K, 3),
    MAXIMUM_MATCHES_PER_SLUG: 2,
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
    MAXIMUM_CONTEXT_RECORD_COUNT: 3,
    MAXIMUM_CONTEXT_CHARACTERS: 2400,
    MAXIMUM_QUESTION_CHARACTERS: 400,
  },
  PLANNER: {
    MAXIMUM_QUESTION_CHARACTERS: 300,
    MODEL_ID:
      process.env.OPENAI_BLOG_CHAT_ROUTER_MODEL ??
      process.env.OPENAI_BLOG_CHAT_MODEL ??
      'gpt-5.4-mini',
  },
  CACHE: {
    TTL_MILLISECONDS: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_CACHE_TTL_MS,
      5 * 60 * 1000,
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
} as const
