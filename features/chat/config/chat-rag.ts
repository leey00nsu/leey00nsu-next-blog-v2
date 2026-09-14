import {
  BLOG_CHAT,
  parseIntegerEnvironmentValue,
} from '@/features/chat/config/constants'
import { normalizeOpenAiCompatibleEmbeddingBaseUrl } from '@/features/chat/lib/normalize-openai-compatible-embedding-base-url'

function parseNumberEnvironmentValue(
  environmentValue: string | undefined,
  fallbackValue: number,
): number {
  if (!environmentValue) {
    return fallbackValue
  }

  const parsedValue = Number(environmentValue)

  return Number.isNaN(parsedValue) ? fallbackValue : parsedValue
}

const CHAT_RAG_DEFAULTS = {
  DATABASE_URL: '',
  DATABASE_SSL: false,
  DATABASE_MAXIMUM_CONNECTIONS: 10,
  EMBEDDING_MODEL_ID:
    'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2',
  EMBEDDING_PROVIDER: 'modal',
  MODAL_BASE_URL: '',
  // semantic 후보 수와 유사도 하한은 코퍼스 규모와 임베딩 모델에 따라 달라진다.
  // 기본값을 그대로 두고, 조정할 때는 BLOG_CHAT_EVALUATE_LIVE_SEMANTIC=true 평가로 전후를 비교한다.
  MAXIMUM_SEMANTIC_CANDIDATES: 8,
  MAXIMUM_EMBED_BATCH_SIZE: 20,
  MINIMUM_SIMILARITY_SCORE: 0.15,
  SEMANTIC_SCORE_MULTIPLIER: 10,
  DIRECT_ENTITY_MATCH_BOOST: 4,
  RELATED_ENTITY_MATCH_BOOST: 2,
  LEXICAL_MATCH_BOOST: 1,
  CURRENT_POST_MATCH_BOOST: 2,
  // 질의당 relation 기반 가점을 반영하는 최대 횟수. relation은 weight 내림차순으로 소비하므로
  // 같은 질의는 DB 반환 순서와 무관하게 같은 근거 순위를 만든다.
  MAXIMUM_RELATION_MATCH_COUNT: 12,
  MINIMUM_EMBEDDING_TOKEN_LENGTH: 1,
  // 임베딩 서비스가 실제로 읽는 최대 토큰 수. 서비스의 MODAL_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH와
  // 같은 값을 유지해야 하며, 다르면 벡터의 의미가 달라지므로 재색인이 필요하다.
  // 256으로 올려도 검색 지표가 좋아지지 않아 모델 학습 길이(128)를 그대로 쓴다.
  MAXIMUM_SEQUENCE_LENGTH: 128,
  // 색인 레시피 버전. 청크 경계 규칙이나 임베딩 입력 구성이 바뀌면 반드시 올린다.
  // 활성 인덱스와 값이 다르면 semantic 검색을 사용하지 않고 재색인을 요구한다.
  CHUNKING_VERSION: 'heading-window-v3-embedding-input',
} as const

const EMBEDDING_MAXIMUM_SEQUENCE_LENGTH = parseIntegerEnvironmentValue(
  process.env.BLOG_CHAT_RAG_EMBEDDING_MAXIMUM_SEQUENCE_LENGTH,
  CHAT_RAG_DEFAULTS.MAXIMUM_SEQUENCE_LENGTH,
)

// 같은 레시피라도 서비스가 읽는 토큰 수가 달라지면 벡터가 달라진다.
// 값에 토큰 수를 포함해 두면 설정을 바꿨을 때 이전 색인을 재사용하지 않고 재색인을 요구한다.
const CHAT_RAG_CHUNKING_VERSION = [
  CHAT_RAG_DEFAULTS.CHUNKING_VERSION,
  `seq${EMBEDDING_MAXIMUM_SEQUENCE_LENGTH}`,
].join('-')

const DETERMINISTIC_QUERY_PATTERNS = [
  '최신',
  '최근',
  '오래된',
  '가장 오래된',
  '첫 글',
  '처음 글',
  'latest',
  'recent',
  'oldest',
  'oldest post',
  'first post',
  '추천',
  'recommend',
  'recommended',
  '추천해줘',
  '추천해 줘',
] as const

export const CHAT_RAG = {
  DATABASE: {
    URL:
      process.env.BLOG_CHAT_RAG_DATABASE_URL ??
      process.env.DATABASE_URL ??
      CHAT_RAG_DEFAULTS.DATABASE_URL,
    SSL:
      process.env.BLOG_CHAT_RAG_DATABASE_SSL === 'true' ||
      CHAT_RAG_DEFAULTS.DATABASE_SSL,
    MAXIMUM_CONNECTIONS: Number(
      process.env.BLOG_CHAT_RAG_DATABASE_MAXIMUM_CONNECTIONS ??
        CHAT_RAG_DEFAULTS.DATABASE_MAXIMUM_CONNECTIONS,
    ),
  },
  EMBEDDING: {
    PROVIDER:
      process.env.BLOG_CHAT_RAG_EMBEDDING_PROVIDER ??
      CHAT_RAG_DEFAULTS.EMBEDDING_PROVIDER,
    MODEL_ID:
      process.env.BLOG_CHAT_RAG_EMBEDDING_MODEL ??
      CHAT_RAG_DEFAULTS.EMBEDDING_MODEL_ID,
    MODAL_BASE_URL: normalizeOpenAiCompatibleEmbeddingBaseUrl(
      process.env.MODAL_EMBEDDING_BASE_URL ?? CHAT_RAG_DEFAULTS.MODAL_BASE_URL,
    ),
    MAXIMUM_BATCH_SIZE: CHAT_RAG_DEFAULTS.MAXIMUM_EMBED_BATCH_SIZE,
    MAXIMUM_SEQUENCE_LENGTH: EMBEDDING_MAXIMUM_SEQUENCE_LENGTH,
  },
  INDEX: {
    CHUNKING_VERSION: CHAT_RAG_CHUNKING_VERSION,
  },
  SEARCH: {
    TOP_K: BLOG_CHAT.SEARCH.TOP_K,
    MAXIMUM_MATCHES_PER_SLUG: BLOG_CHAT.SEARCH.MAXIMUM_MATCHES_PER_SLUG,
    MAXIMUM_SEMANTIC_CANDIDATES: parseIntegerEnvironmentValue(
      process.env.BLOG_CHAT_RAG_MAXIMUM_SEMANTIC_CANDIDATES,
      CHAT_RAG_DEFAULTS.MAXIMUM_SEMANTIC_CANDIDATES,
    ),
    MINIMUM_SIMILARITY_SCORE: parseNumberEnvironmentValue(
      process.env.BLOG_CHAT_RAG_MINIMUM_SIMILARITY_SCORE,
      CHAT_RAG_DEFAULTS.MINIMUM_SIMILARITY_SCORE,
    ),
    SEMANTIC_SCORE_MULTIPLIER: CHAT_RAG_DEFAULTS.SEMANTIC_SCORE_MULTIPLIER,
    DIRECT_ENTITY_MATCH_BOOST: CHAT_RAG_DEFAULTS.DIRECT_ENTITY_MATCH_BOOST,
    RELATED_ENTITY_MATCH_BOOST: CHAT_RAG_DEFAULTS.RELATED_ENTITY_MATCH_BOOST,
    LEXICAL_MATCH_BOOST: CHAT_RAG_DEFAULTS.LEXICAL_MATCH_BOOST,
    CURRENT_POST_MATCH_BOOST: CHAT_RAG_DEFAULTS.CURRENT_POST_MATCH_BOOST,
    MAXIMUM_RELATION_MATCH_COUNT:
      CHAT_RAG_DEFAULTS.MAXIMUM_RELATION_MATCH_COUNT,
    MINIMUM_EMBEDDING_TOKEN_LENGTH:
      CHAT_RAG_DEFAULTS.MINIMUM_EMBEDDING_TOKEN_LENGTH,
  },
  ROUTING: {
    DETERMINISTIC_QUERY_PATTERNS,
  },
} as const
