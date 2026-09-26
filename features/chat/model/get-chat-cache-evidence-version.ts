import { BLOG_CHAT } from '@/features/chat/config/constants'
import {
  getChatRagDatabasePool,
  isChatRagDatabaseConfigured,
  selectActiveChatRagIndexVersion,
} from '@/features/chat/model/chat-rag-database'

const CHAT_CACHE_EVIDENCE_VERSION = {
  UNINDEXED: 'unindexed',
  LOOKUP_FAILURE_MESSAGE:
    'Failed to resolve the active Chat RAG index for response caching.',
} as const

export async function getChatCacheEvidenceVersion(): Promise<string | null> {
  if (!isChatRagDatabaseConfigured()) {
    return BLOG_CHAT.EVIDENCE_VERSION
  }

  try {
    const databasePool = await getChatRagDatabasePool()
    const activeIndexVersion = await selectActiveChatRagIndexVersion({
      databaseClient: databasePool,
    })

    return [
      BLOG_CHAT.EVIDENCE_VERSION,
      activeIndexVersion ?? CHAT_CACHE_EVIDENCE_VERSION.UNINDEXED,
    ].join(':')
  } catch (error) {
    // A failed version lookup must never serve an answer from an unknown index.
    console.error(CHAT_CACHE_EVIDENCE_VERSION.LOOKUP_FAILURE_MESSAGE, error)
    return null
  }
}
