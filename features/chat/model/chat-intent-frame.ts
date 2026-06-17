import { z } from 'zod'
import {
  CHAT_REFERENCE_TARGET_CONFIDENCE_VALUES,
  ChatReferenceTargetSchema,
} from '@/features/chat/model/chat-question-plan'

export const CHAT_INTENT_DOMAINS = [
  'general',
  'blog',
  'profile',
  'project',
  'assistant',
] as const

export const CHAT_INTENT_OPERATIONS = [
  'answer',
  'summarize',
  'explain',
  'recommend',
  'compare',
  'social_reply',
  'contact',
] as const

export const CHAT_TEMPORAL_ORDERS = ['none', 'latest', 'oldest'] as const

export const CHAT_REQUESTED_FIELDS = [
  'title',
  'published_at',
  'content',
  'summary',
  'contact_methods',
] as const

export const CHAT_INTENT_EVIDENCE_SCOPES = [
  'none',
  'current_source',
  'entity',
  'corpus',
] as const

export const CHAT_INTENT_MISSING_SLOTS = [
  'target',
  'current_source',
  'named_entity',
  'comparison_target',
] as const

export const ChatIntentDomainSchema = z.enum(CHAT_INTENT_DOMAINS)
export const ChatIntentOperationSchema = z.enum(CHAT_INTENT_OPERATIONS)
export const ChatTemporalOrderSchema = z.enum(CHAT_TEMPORAL_ORDERS)
export const ChatRequestedFieldSchema = z.enum(CHAT_REQUESTED_FIELDS)
export const ChatIntentEvidenceScopeSchema = z.enum(
  CHAT_INTENT_EVIDENCE_SCOPES,
)
export const ChatIntentMissingSlotSchema = z.enum(CHAT_INTENT_MISSING_SLOTS)

export const ChatIntentFrameSchema = z.object({
  standaloneQuestion: z.string().trim().min(1).max(300),
  domain: ChatIntentDomainSchema,
  operation: ChatIntentOperationSchema,
  target: ChatReferenceTargetSchema,
  temporalConstraint: z.object({
    order: ChatTemporalOrderSchema,
  }),
  requestedFields: z.array(ChatRequestedFieldSchema).max(5),
  evidenceScope: ChatIntentEvidenceScopeSchema,
  searchConcepts: z.object({
    required: z.array(z.string().trim().min(1).max(60)).max(8),
    optional: z.array(z.string().trim().min(1).max(60)).max(8),
  }),
  missingSlots: z.array(ChatIntentMissingSlotSchema).max(4),
  clarificationQuestion: z.string().trim().min(1).max(160).nullable(),
  confidence: z.enum(CHAT_REFERENCE_TARGET_CONFIDENCE_VALUES),
  reason: z.string().trim().min(1).max(160),
})

export interface ChatIntentFrame
  extends z.infer<typeof ChatIntentFrameSchema> {}
