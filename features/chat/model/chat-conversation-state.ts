import { z } from 'zod'
import { ChatTargetSchema } from '@/features/chat/model/chat-plan-primitives'
import { ChatQueryPlanSchema } from '@/features/chat/model/chat-query-plan'

export const CHAT_CONVERSATION_STATE_VERSION = 2 as const

const CHAT_CONVERSATION_STATE_LIMITS = {
  MAXIMUM_CLARIFICATION_CHARACTERS: 160,
} as const

export const ChatPendingClarificationSchema = z.object({
  clarificationQuestion: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_CLARIFICATION_CHARACTERS),
  suspendedQueryPlan: ChatQueryPlanSchema,
})

export const ChatConversationStateSchema = z.object({
  version: z.literal(CHAT_CONVERSATION_STATE_VERSION),
  focusedTarget: ChatTargetSchema.nullable(),
  lastQueryPlan: ChatQueryPlanSchema.nullable(),
  pendingClarification: ChatPendingClarificationSchema.nullable(),
})

export interface ChatPendingClarification
  extends z.infer<typeof ChatPendingClarificationSchema> {}
export interface ChatConversationState
  extends z.infer<typeof ChatConversationStateSchema> {}

export const EMPTY_CHAT_CONVERSATION_STATE: ChatConversationState = {
  version: CHAT_CONVERSATION_STATE_VERSION,
  focusedTarget: null,
  lastQueryPlan: null,
  pendingClarification: null,
}
