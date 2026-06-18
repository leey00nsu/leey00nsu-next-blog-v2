import { z } from 'zod'
import {
  ChatMissingSlotSchema,
  ChatTargetSchema,
  NormalizedChatIntentSchema,
} from '@/features/chat/model/chat-intent'

export const CHAT_CONVERSATION_STATE_VERSION = 2 as const

const CHAT_CONVERSATION_STATE_LIMITS = {
  MAXIMUM_MISSING_SLOT_COUNT: 4,
  MAXIMUM_CLARIFICATION_CHARACTERS: 160,
} as const

export const ChatPendingClarificationSchema = z.object({
  missingSlots: z
    .array(ChatMissingSlotSchema)
    .min(1)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_MISSING_SLOT_COUNT),
  clarificationQuestion: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_CLARIFICATION_CHARACTERS),
  suspendedIntent: NormalizedChatIntentSchema,
})

export const ChatConversationStateSchema = z.object({
  version: z.literal(CHAT_CONVERSATION_STATE_VERSION),
  focusedTarget: ChatTargetSchema.nullable(),
  lastIntent: NormalizedChatIntentSchema.nullable(),
  pendingClarification: ChatPendingClarificationSchema.nullable(),
})

export interface ChatPendingClarification
  extends z.infer<typeof ChatPendingClarificationSchema> {}
export interface ChatConversationState
  extends z.infer<typeof ChatConversationStateSchema> {}

export const EMPTY_CHAT_CONVERSATION_STATE: ChatConversationState = {
  version: CHAT_CONVERSATION_STATE_VERSION,
  focusedTarget: null,
  lastIntent: null,
  pendingClarification: null,
}
