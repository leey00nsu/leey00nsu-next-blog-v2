import { z } from 'zod'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'

export const CHAT_TARGET_KINDS = [
  'none',
  'current_source',
  'profile',
  'assistant',
  'named_entity',
] as const

export const CHAT_REQUESTED_FIELDS = [
  'title',
  'published_at',
  'content',
  'summary',
  'contact_methods',
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

const CHAT_PLAN_PRIMITIVE_LIMITS = {
  MAXIMUM_TARGET_SLUG_CHARACTERS: 120,
  MAXIMUM_TARGET_TITLE_CHARACTERS: 160,
  MAXIMUM_CONCEPT_CHARACTERS: 60,
} as const

export const ChatTargetKindSchema = z.enum(CHAT_TARGET_KINDS)
export const ChatRequestedFieldSchema = z.enum(CHAT_REQUESTED_FIELDS)
export const ChatMissingSlotSchema = z.enum(CHAT_MISSING_SLOTS)
export const ChatConfidenceSchema = z.enum(CHAT_CONFIDENCE_VALUES)
export const ChatContextActionSchema = z.enum(CHAT_CONTEXT_ACTIONS)

export const ChatConceptSchema = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_PLAN_PRIMITIVE_LIMITS.MAXIMUM_CONCEPT_CHARACTERS)

export const ChatTargetSchema = z.object({
  kind: ChatTargetKindSchema,
  sourceCategory: ChatSourceCategorySchema.nullable(),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_PLAN_PRIMITIVE_LIMITS.MAXIMUM_TARGET_SLUG_CHARACTERS)
    .nullable(),
  title: z
    .string()
    .trim()
    .min(1)
    .max(CHAT_PLAN_PRIMITIVE_LIMITS.MAXIMUM_TARGET_TITLE_CHARACTERS)
    .nullable(),
})

export interface ChatTarget extends z.infer<typeof ChatTargetSchema> {}
export type ChatRequestedField = z.infer<typeof ChatRequestedFieldSchema>
export type ChatMissingSlot = z.infer<typeof ChatMissingSlotSchema>
export type ChatConfidence = z.infer<typeof ChatConfidenceSchema>
export type ChatContextAction = z.infer<typeof ChatContextActionSchema>
