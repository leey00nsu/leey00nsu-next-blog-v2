import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'
import {
  ChatConfidenceSchema,
  ChatConceptSchema,
  ChatContextActionSchema,
  ChatMissingSlotSchema,
  ChatRequestedFieldSchema,
} from '@/features/chat/model/chat-intent'

export const CHAT_QUERY_OPERATIONS = [
  'lookup',
  'explain',
  'summarize',
  'compare',
  'recommend',
  'social_reply',
  'contact',
] as const

export const CHAT_SOURCE_SELECTION_MODES = ['all', 'only', 'prefer'] as const

export const CHAT_TEMPORAL_SELECTION_MODES = ['none', 'rank', 'single'] as const

export const CHAT_TEMPORAL_ORDERS = ['latest', 'oldest'] as const

const CHAT_QUERY_PLAN_LIMITS = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  MAXIMUM_SOURCE_CATEGORY_COUNT: 4,
  MAXIMUM_REQUESTED_FIELD_COUNT: 5,
  MAXIMUM_CONCEPT_COUNT: 8,
  MAXIMUM_MISSING_SLOT_COUNT: 4,
  MAXIMUM_CLARIFICATION_CHARACTERS: 160,
  MAXIMUM_REASON_CHARACTERS: 160,
  MAXIMUM_ENTITY_IDENTIFIER_CHARACTERS: 180,
} as const

function hasUniqueSourceCategories(
  sourceCategories: Array<z.infer<typeof ChatSourceCategorySchema>>,
): boolean {
  return new Set(sourceCategories).size === sourceCategories.length
}

export const ChatQueryOperationSchema = z.enum(CHAT_QUERY_OPERATIONS)

export const ChatQueryTargetSelectionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('candidate'),
      entityId: z
        .string()
        .trim()
        .min(1)
        .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_ENTITY_IDENTIFIER_CHARACTERS),
    })
    .strict(),
  z.object({ kind: z.literal('preserve') }).strict(),
  z.object({ kind: z.literal('current_source') }).strict(),
  z.object({ kind: z.literal('none') }).strict(),
])

export const ChatSourceSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('all') }).strict(),
  z
    .object({
      mode: z.enum(['only', 'prefer']),
      categories: z
        .array(ChatSourceCategorySchema)
        .min(1)
        .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_SOURCE_CATEGORY_COUNT)
        .refine(hasUniqueSourceCategories, {
          message: 'Source categories must be unique.',
        }),
    })
    .strict(),
])

export const ChatTemporalSelectionSchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('none') }).strict(),
  z
    .object({
      mode: z.enum(['rank', 'single']),
      order: z.enum(CHAT_TEMPORAL_ORDERS),
    })
    .strict(),
])

export const ChatQueryPlanSchema = z
  .object({
    standaloneQuestion: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_QUESTION_CHARACTERS),
    contextAction: ChatContextActionSchema,
    targetSelection: ChatQueryTargetSelectionSchema,
    operation: ChatQueryOperationSchema,
    sourceSelection: ChatSourceSelectionSchema,
    temporalSelection: ChatTemporalSelectionSchema,
    requestedFields: z
      .array(ChatRequestedFieldSchema)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_REQUESTED_FIELD_COUNT),
    requiredConcepts: z
      .array(ChatConceptSchema)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_CONCEPT_COUNT),
    optionalConcepts: z
      .array(ChatConceptSchema)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_CONCEPT_COUNT),
    missingSlots: z
      .array(ChatMissingSlotSchema)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_MISSING_SLOT_COUNT),
    clarificationQuestion: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_CLARIFICATION_CHARACTERS)
      .nullable(),
    confidence: ChatConfidenceSchema,
    reason: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_QUERY_PLAN_LIMITS.MAXIMUM_REASON_CHARACTERS),
  })
  .strict()

export interface ChatQueryPlan extends z.infer<typeof ChatQueryPlanSchema> {}
export type ChatQueryOperation = z.infer<typeof ChatQueryOperationSchema>
export type ChatQueryTargetSelection = z.infer<
  typeof ChatQueryTargetSelectionSchema
>
export type ChatSourceSelection = z.infer<typeof ChatSourceSelectionSchema>
export type ChatTemporalSelection = z.infer<typeof ChatTemporalSelectionSchema>
