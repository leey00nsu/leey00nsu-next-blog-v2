import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'
import {
  ChatConceptSchema,
  ChatRequestedFieldSchema,
  ChatTargetSchema,
} from '@/features/chat/model/chat-plan-primitives'
import { ChatQueryOperationSchema } from '@/features/chat/model/chat-query-plan'

export const CHAT_EXECUTION_KINDS = [
  'clarification',
  'direct_metadata',
  'retrieve_and_generate',
  'social_reply',
  'contact',
] as const

export const CHAT_SOURCE_STRATEGIES = ['all', 'only', 'prefer'] as const
export const CHAT_TEMPORAL_STRATEGIES = ['none', 'rank', 'single'] as const
export const CHAT_RETRIEVAL_TEMPORAL_ORDERS = ['latest', 'oldest'] as const

const CHAT_RETRIEVAL_PLAN_LIMITS = {
  MAXIMUM_QUESTION_CHARACTERS: 300,
  MAXIMUM_TARGET_COUNT: 4,
  MAXIMUM_SOURCE_CATEGORY_COUNT: 4,
  MAXIMUM_CONCEPT_COUNT: 8,
  MAXIMUM_REQUESTED_FIELD_COUNT: 5,
} as const

export const ChatExecutionKindSchema = z.enum(CHAT_EXECUTION_KINDS)

export const ChatRetrievalPlanSchema = z
  .object({
    executionKind: ChatExecutionKindSchema,
    standaloneQuestion: z
      .string()
      .trim()
      .min(1)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_QUESTION_CHARACTERS),
    operation: ChatQueryOperationSchema,
    canonicalTargets: z
      .array(ChatTargetSchema)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_TARGET_COUNT),
    sourceStrategy: z.enum(CHAT_SOURCE_STRATEGIES),
    sourceCategories: z
      .array(ChatSourceCategorySchema)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_SOURCE_CATEGORY_COUNT),
    requiredConcepts: z
      .array(ChatConceptSchema)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_CONCEPT_COUNT),
    optionalConcepts: z
      .array(ChatConceptSchema)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_CONCEPT_COUNT),
    requestedFields: z
      .array(ChatRequestedFieldSchema)
      .max(CHAT_RETRIEVAL_PLAN_LIMITS.MAXIMUM_REQUESTED_FIELD_COUNT),
    temporalStrategy: z.enum(CHAT_TEMPORAL_STRATEGIES),
    temporalOrder: z.enum(CHAT_RETRIEVAL_TEMPORAL_ORDERS).nullable(),
    maximumEvidenceCount: z.number().int().positive(),
  })
  .strict()
  .superRefine((plan, refinementContext) => {
    const requiresSourceCategories = plan.sourceStrategy !== 'all'
    const hasSourceCategories = plan.sourceCategories.length > 0

    if (requiresSourceCategories !== hasSourceCategories) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['sourceCategories'],
        message: 'only/prefer requires source categories and all forbids them.',
      })
    }

    const requiresTemporalOrder = plan.temporalStrategy !== 'none'
    const hasTemporalOrder = plan.temporalOrder !== null

    if (requiresTemporalOrder !== hasTemporalOrder) {
      refinementContext.addIssue({
        code: 'custom',
        path: ['temporalOrder'],
        message: 'rank/single requires an order and none forbids it.',
      })
    }
  })

export interface ChatRetrievalPlan
  extends z.infer<typeof ChatRetrievalPlanSchema> {}
export type ChatExecutionKind = z.infer<typeof ChatExecutionKindSchema>
