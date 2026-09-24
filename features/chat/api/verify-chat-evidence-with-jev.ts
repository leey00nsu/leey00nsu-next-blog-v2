import { TypeSafeClient } from '@typesafe-ai/sdk'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { buildChatEvidenceContext } from '@/features/chat/lib/build-chat-evidence-context'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

interface VerifyChatEvidenceWithJevParams {
  question: string
  matches: ChatEvidenceRecord[]
}

const EVIDENCE_VERIFICATION = {
  MAXIMUM_RECORD_COUNT: 3,
  MAXIMUM_CONTEXT_CHARACTERS: 2000,
  MINIMUM_SUPPORT_PROBABILITY: 0.6,
} as const

export async function verifyChatEvidenceWithJev({
  question,
  matches,
}: VerifyChatEvidenceWithJevParams): Promise<boolean> {
  const apiKey = process.env.TYPESAFE_API_KEY ?? process.env.AI_GATEWAY_API_KEY

  if (!apiKey) {
    return false
  }

  try {
    const client = new TypeSafeClient({
      apiKey,
      defaultModel: BLOG_CHAT.JEV_ROUTER.MODEL_ID,
      timeout: BLOG_CHAT.JEV_ROUTER.MODEL_TIMEOUT_MILLISECONDS,
    })
    const evidenceContext = buildChatEvidenceContext({
      question,
      matches,
      maximumRecordCount: EVIDENCE_VERIFICATION.MAXIMUM_RECORD_COUNT,
      maximumCharacters: EVIDENCE_VERIFICATION.MAXIMUM_CONTEXT_CHARACTERS,
    })
    const result = await client.systemOne({
      model: BLOG_CHAT.JEV_ROUTER.MODEL_ID,
      state: { question, evidenceContext },
      questions: {
        supportsAnswer: {
          type: 'noul',
          instructions: 'Does at least one passage establish a useful answer or correction for the actual question? A question about this chatbot may be supported by its assistant guide or an article explaining how it was built. A reasonable paraphrase, partial answer, or direct logical inference counts. But specifically named people, projects, products, and articles must be the same subject or a documented alias; similar spelling, generic topic overlap, and unrelated passages used to claim that something was not found do not count.',
        },
      },
    }, { retry: { maxRetries: 0 }, timeout: BLOG_CHAT.JEV_ROUTER.MODEL_TIMEOUT_MILLISECONDS })

    return result.answers.supportsAnswer.noul >=
      EVIDENCE_VERIFICATION.MINIMUM_SUPPORT_PROBABILITY
  } catch {
    return false
  }
}
