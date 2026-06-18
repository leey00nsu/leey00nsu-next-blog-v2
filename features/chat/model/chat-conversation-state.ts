import { z } from 'zod'
import {
  ChatConceptSchema,
  ChatEvidenceScopeSchema,
  ChatOperationSchema,
  ChatRequestedFieldSchema,
  ChatTargetSchema,
  ChatTemporalConstraintSchema,
  NormalizedChatIntentSchema,
} from '@/features/chat/model/chat-intent'

export const CHAT_CONVERSATION_STATE_VERSION = 1 as const

const CHAT_CONVERSATION_STATE_LIMITS = {
  MAXIMUM_REQUESTED_FIELD_COUNT: 5,
  MAXIMUM_CONCEPT_COUNT: 8,
  MAXIMUM_QUESTION_CHARACTERS: 300,
} as const

export const ChatPendingClarificationSchema = z.object({
  missingSlots: NormalizedChatIntentSchema.shape.missingSlots,
  clarificationQuestion:
    NormalizedChatIntentSchema.shape.clarificationQuestion.unwrap(),
  suspendedIntent: NormalizedChatIntentSchema,
})

export const ChatConversationStateSchema = z.object({
  version: z.literal(CHAT_CONVERSATION_STATE_VERSION),
  resolvedTarget: ChatTargetSchema.nullable(),
  activeOperation: ChatOperationSchema,
  temporalConstraint: ChatTemporalConstraintSchema,
  requestedFields: z
    .array(ChatRequestedFieldSchema)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_REQUESTED_FIELD_COUNT),
  requiredConcepts: z
    .array(ChatConceptSchema)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_CONCEPT_COUNT),
  optionalConcepts: z
    .array(ChatConceptSchema)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_CONCEPT_COUNT),
  evidenceScope: ChatEvidenceScopeSchema,
  pendingClarification: ChatPendingClarificationSchema.nullable(),
  lastResolvedQuestion: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_CONVERSATION_STATE_LIMITS.MAXIMUM_QUESTION_CHARACTERS)
    .nullable(),
})

export interface ChatPendingClarification
  extends z.infer<typeof ChatPendingClarificationSchema> {}
export interface ChatConversationState
  extends z.infer<typeof ChatConversationStateSchema> {}

export const EMPTY_CHAT_CONVERSATION_STATE: ChatConversationState = {
  version: CHAT_CONVERSATION_STATE_VERSION,
  resolvedTarget: null,
  activeOperation: 'answer',
  temporalConstraint: {
    order: 'none',
  },
  requestedFields: [],
  requiredConcepts: [],
  optionalConcepts: [],
  evidenceScope: 'none',
  pendingClarification: null,
  lastResolvedQuestion: null,
}
