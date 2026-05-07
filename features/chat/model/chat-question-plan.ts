import { z } from 'zod'
import { ChatQuestionActionSchema } from '@/features/chat/model/chat-question-routing'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'

export const CHAT_QUESTION_ROUTES = ['direct', 'clarify', 'retrieve'] as const

export const CHAT_QUESTION_DIRECT_ACTIONS = [
  'none',
  'social_reply',
  'contact',
  'latest_post',
  'oldest_post',
] as const

export const CHAT_QUESTION_RETRIEVAL_SCOPES = [
  'none',
  'current_source',
  'entity',
  'corpus',
] as const

export const CHAT_REFERENCE_TARGET_KINDS = [
  'none',
  'current_source',
  'profile',
  'assistant',
  'named_entity',
] as const

export const CHAT_REFERENCE_TARGET_CONFIDENCE_VALUES = [
  'low',
  'medium',
  'high',
] as const

export const CHAT_QUESTION_PLAN_FAILURE_REASONS = [
  'missing_api_key',
  'model_error',
] as const

export const ChatQuestionRouteSchema = z.enum(CHAT_QUESTION_ROUTES)
export const ChatQuestionDirectActionSchema = z.enum(
  CHAT_QUESTION_DIRECT_ACTIONS,
)
export const ChatQuestionRetrievalScopeSchema = z.enum(
  CHAT_QUESTION_RETRIEVAL_SCOPES,
)
export const ChatReferenceTargetKindSchema = z.enum(
  CHAT_REFERENCE_TARGET_KINDS,
)
export const ChatReferenceTargetConfidenceSchema = z.enum(
  CHAT_REFERENCE_TARGET_CONFIDENCE_VALUES,
)
export const ChatQuestionPlanFailureReasonSchema = z.enum(
  CHAT_QUESTION_PLAN_FAILURE_REASONS,
)

export const ChatReferenceTargetSchema = z.object({
  kind: ChatReferenceTargetKindSchema,
  sourceCategory: ChatSourceCategorySchema.nullable(),
  slug: z.string().trim().min(1).max(120).nullable(),
  title: z.string().trim().min(1).max(160).nullable(),
  confidence: ChatReferenceTargetConfidenceSchema,
})

export const ChatQuestionPlanSchema = z.object({
  standaloneQuestion: z.string().trim().min(1).max(300),
  action: ChatQuestionActionSchema,
  route: ChatQuestionRouteSchema,
  directAction: ChatQuestionDirectActionSchema,
  retrievalScope: ChatQuestionRetrievalScopeSchema,
  referenceTarget: ChatReferenceTargetSchema,
  preferredSourceCategories: z.array(ChatSourceCategorySchema).max(4),
  additionalKeywords: z.array(z.string().trim().min(1).max(60)).max(12),
  clarificationQuestion: z.string().trim().min(1).max(160).nullable(),
  reason: z.string().trim().min(1).max(160),
})

export interface ChatQuestionPlan
  extends z.infer<typeof ChatQuestionPlanSchema> {}

export const ChatQuestionPlanSuccessResultSchema = z.object({
  ok: z.literal(true),
  questionPlan: ChatQuestionPlanSchema,
})

export const ChatQuestionPlanFailureResultSchema = z.object({
  ok: z.literal(false),
  refusalReason: ChatQuestionPlanFailureReasonSchema,
})

export const ChatQuestionPlanResultSchema = z.union([
  ChatQuestionPlanSuccessResultSchema,
  ChatQuestionPlanFailureResultSchema,
])

export interface ChatQuestionPlanSuccessResult
  extends z.infer<typeof ChatQuestionPlanSuccessResultSchema> {}

export interface ChatQuestionPlanFailureResult
  extends z.infer<typeof ChatQuestionPlanFailureResultSchema> {}

export type ChatQuestionPlanResult = z.infer<typeof ChatQuestionPlanResultSchema>
