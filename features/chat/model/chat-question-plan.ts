import { z } from 'zod'
import {
  ChatQuestionActionSchema,
  ChatQuestionScopeSchema,
} from '@/features/chat/model/chat-question-routing'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'

export const CHAT_QUESTION_DETERMINISTIC_ACTIONS = [
  'none',
  'social_reply',
  'contact',
  'latest_post',
  'oldest_post',
] as const

export const CHAT_QUESTION_RETRIEVAL_MODES = [
  'none',
  'standard',
  'corpus',
  'current_post',
] as const

export const ChatQuestionDeterministicActionSchema = z.enum(
  CHAT_QUESTION_DETERMINISTIC_ACTIONS,
)
export const ChatQuestionRetrievalModeSchema = z.enum(
  CHAT_QUESTION_RETRIEVAL_MODES,
)

export const ChatQuestionPlanSchema = z.object({
  standaloneQuestion: z.string().trim().min(1).max(300),
  socialPreamble: z.boolean(),
  action: ChatQuestionActionSchema,
  scope: ChatQuestionScopeSchema,
  deterministicAction: ChatQuestionDeterministicActionSchema,
  needsRetrieval: z.boolean(),
  retrievalMode: ChatQuestionRetrievalModeSchema,
  preferredSourceCategories: z.array(ChatSourceCategorySchema).max(4),
  additionalKeywords: z.array(z.string().trim().min(1).max(60)).max(12),
  needsClarification: z.boolean(),
  clarificationQuestion: z.string().trim().min(1).max(160).nullable(),
  reason: z.string().trim().min(1).max(160),
})

export interface ChatQuestionPlan
  extends z.infer<typeof ChatQuestionPlanSchema> {}
