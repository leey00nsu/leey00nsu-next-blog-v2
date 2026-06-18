import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'

export const CHAT_OPERATIONS = [
  'answer',
  'summarize',
  'explain',
  'recommend',
  'compare',
  'social_reply',
  'contact',
] as const

export const CHAT_TARGET_KINDS = [
  'none',
  'current_source',
  'profile',
  'assistant',
  'named_entity',
] as const

export const CHAT_TEMPORAL_ORDERS = ['none', 'latest', 'oldest'] as const

export const CHAT_REQUESTED_FIELDS = [
  'title',
  'published_at',
  'content',
  'summary',
  'contact_methods',
] as const

export const CHAT_EVIDENCE_SCOPES = [
  'none',
  'current_source',
  'entity',
  'corpus',
] as const

export const CHAT_MISSING_SLOTS = [
  'target',
  'current_source',
  'named_entity',
  'comparison_target',
] as const

export const CHAT_CONFIDENCE_VALUES = ['low', 'medium', 'high'] as const
export const CHAT_CONTEXT_ACTIONS = [
  'continue',
  'reset',
  'resolve_clarification',
] as const

const CHAT_INTENT_LIMITS = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  MAXIMUM_TARGET_SLUG_CHARACTERS: 120,
  MAXIMUM_TARGET_TITLE_CHARACTERS: 160,
  MAXIMUM_REQUESTED_FIELD_COUNT: 5,
  MAXIMUM_CONCEPT_CHARACTERS: 60,
  MAXIMUM_CONCEPT_COUNT: 8,
  MAXIMUM_MISSING_SLOT_COUNT: 4,
  MAXIMUM_CLARIFICATION_CHARACTERS: 160,
  MAXIMUM_REASON_CHARACTERS: 160,
  MAXIMUM_ENTITY_IDENTIFIER_CHARACTERS: 180,
} as const

export const ChatOperationSchema = z.enum(CHAT_OPERATIONS)
export const ChatTargetKindSchema = z.enum(CHAT_TARGET_KINDS)
export const ChatTemporalOrderSchema = z.enum(CHAT_TEMPORAL_ORDERS)
export const ChatRequestedFieldSchema = z.enum(CHAT_REQUESTED_FIELDS)
export const ChatEvidenceScopeSchema = z.enum(CHAT_EVIDENCE_SCOPES)
export const ChatMissingSlotSchema = z.enum(CHAT_MISSING_SLOTS)
export const ChatConfidenceSchema = z.enum(CHAT_CONFIDENCE_VALUES)
export const ChatContextActionSchema = z.enum(CHAT_CONTEXT_ACTIONS)

export const ChatConceptSchema = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_INTENT_LIMITS.MAXIMUM_CONCEPT_CHARACTERS)

export const ChatTargetSchema = z.object({
  kind: ChatTargetKindSchema,
  sourceCategory: ChatSourceCategorySchema.nullable(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_TARGET_SLUG_CHARACTERS)
    .nullable(),
  title: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_TARGET_TITLE_CHARACTERS)
    .nullable(),
})

export const ChatTemporalConstraintSchema = z.object({
  order: ChatTemporalOrderSchema,
})

export const ChatTargetSelectionSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('candidate'),
    entityId: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_INTENT_LIMITS.MAXIMUM_ENTITY_IDENTIFIER_CHARACTERS),
  }),
  z.object({ kind: z.literal('preserve') }),
  z.object({ kind: z.literal('none') }),
])

const ChatIntentMeaningSchema = z.object({
  standaloneQuestion: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_QUESTION_CHARACTERS),
  operation: ChatOperationSchema,
  temporalConstraint: ChatTemporalConstraintSchema,
  requestedFields: z
    .array(ChatRequestedFieldSchema)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_REQUESTED_FIELD_COUNT),
  evidenceScope: ChatEvidenceScopeSchema,
  requiredConcepts: z
    .array(ChatConceptSchema)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_CONCEPT_COUNT),
  optionalConcepts: z
    .array(ChatConceptSchema)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_CONCEPT_COUNT),
  missingSlots: z
    .array(ChatMissingSlotSchema)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_MISSING_SLOT_COUNT),
  clarificationQuestion: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_CLARIFICATION_CHARACTERS)
    .nullable(),
  confidence: ChatConfidenceSchema,
  reason: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_INTENT_LIMITS.MAXIMUM_REASON_CHARACTERS),
})

export const ChatIntentPlanSchema = ChatIntentMeaningSchema.extend({
  contextAction: ChatContextActionSchema,
  targetSelection: ChatTargetSelectionSchema,
})

export const NormalizedChatIntentSchema = ChatIntentMeaningSchema.extend({
  target: ChatTargetSchema,
})

export interface ChatTarget extends z.infer<typeof ChatTargetSchema> {}
export interface ChatTemporalConstraint
  extends z.infer<typeof ChatTemporalConstraintSchema> {}
export interface ChatIntentPlan extends z.infer<typeof ChatIntentPlanSchema> {}
export interface NormalizedChatIntent
  extends z.infer<typeof NormalizedChatIntentSchema> {}
export type ChatOperation = z.infer<typeof ChatOperationSchema>
export type ChatRequestedField = z.infer<typeof ChatRequestedFieldSchema>
export type ChatEvidenceScope = z.infer<typeof ChatEvidenceScopeSchema>
export type ChatMissingSlot = z.infer<typeof ChatMissingSlotSchema>
export type ChatConfidence = z.infer<typeof ChatConfidenceSchema>
export type ChatContextAction = z.infer<typeof ChatContextActionSchema>
export type ChatTargetSelection = z.infer<typeof ChatTargetSelectionSchema>
