import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'

export const CHAT_ENTITY_KINDS = [
  'post',
  'project',
  'profile',
  'assistant',
] as const

const CHAT_ENTITY_CANDIDATE_LIMITS = {
  MAXIMUM_IDENTIFIER_CHARACTERS: 180,
  MAXIMUM_TEXT_CHARACTERS: 200,
  MAXIMUM_ALIAS_COUNT: 64,
  MAXIMUM_SEARCH_TERM_COUNT: 256,
} as const

export const ChatEntityKindSchema = z.enum(CHAT_ENTITY_KINDS)

export const ChatEntityCandidateSchema = z.object({
  entityId: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_ENTITY_CANDIDATE_LIMITS.MAXIMUM_IDENTIFIER_CHARACTERS),
  kind: ChatEntityKindSchema,
  slug: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_ENTITY_CANDIDATE_LIMITS.MAXIMUM_TEXT_CHARACTERS),
  title: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_ENTITY_CANDIDATE_LIMITS.MAXIMUM_TEXT_CHARACTERS),
  aliases: z
    .array(z.string().trim().min(1))
    .max(CHAT_ENTITY_CANDIDATE_LIMITS.MAXIMUM_ALIAS_COUNT),
  searchTerms: z
    .array(z.string().trim().min(1))
    .max(CHAT_ENTITY_CANDIDATE_LIMITS.MAXIMUM_SEARCH_TERM_COUNT),
  sourceCategory: ChatSourceCategorySchema,
})

export interface ChatEntityCandidate
  extends z.infer<typeof ChatEntityCandidateSchema> {}
