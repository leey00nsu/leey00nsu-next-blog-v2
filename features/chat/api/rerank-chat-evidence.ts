import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { reorderChatEvidenceMatches } from '@/features/chat/lib/reorder-chat-evidence-matches'
import type { ChatEvidenceRecord } from '@/features/chat/model/chat-evidence'

interface RerankChatEvidenceParams {
  question: string
  matches: ChatEvidenceRecord[]
}

const CHAT_RERANK_PROMPT = {
  SYSTEM:
    'You rerank grounded blog evidence. Prefer evidence that directly answers the user question. Return only URLs from the candidate list in best-first order.',
} as const

const ChatEvidenceRankingSchema = Output.object({
  schema: z.object({
    rankedUrls: z
      .array(z.string().trim().min(1))
      .max(BLOG_CHAT.RERANK.MAXIMUM_CANDIDATE_COUNT),
  }),
})

function buildCandidateContext(matches: ChatEvidenceRecord[]): string {
  return matches
    .slice(0, BLOG_CHAT.RERANK.MAXIMUM_CANDIDATE_COUNT)
    .map((match) => {
      return [
        `url=${match.url}`,
        `title=${match.title}`,
        `source=${match.sourceCategory}`,
        `excerpt=${match.excerpt}`,
        `content=${match.content}`,
      ].join('\n')
    })
    .join('\n---\n')
}

export async function rerankChatEvidence({
  question,
  matches,
}: RerankChatEvidenceParams): Promise<ChatEvidenceRecord[]> {
  if (!process.env.OPENAI_API_KEY) {
    return matches
  }

  try {
    const { output } = await generateText({
      model: openai(BLOG_CHAT.RERANK.MODEL_ID),
      temperature: 0,
      output: ChatEvidenceRankingSchema,
      system: CHAT_RERANK_PROMPT.SYSTEM,
      prompt: [
        `question=${question}`,
        `candidates=\n${buildCandidateContext(matches)}`,
      ].join('\n\n'),
    })

    return reorderChatEvidenceMatches({
      matches,
      rankedUrls: (output as { rankedUrls: string[] }).rankedUrls,
    })
  } catch {
    return matches
  }
}
