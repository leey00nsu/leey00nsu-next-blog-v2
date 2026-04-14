import { z } from 'zod'
import { BLOG_CHAT } from '@/features/chat/config/constants'
import { ChatSourceCategorySchema } from '@/features/chat/model/chat-evidence'
import { LOCALES } from '@/shared/config/constants'

export const BlogChatCitationSchema = z.object({
  title: z.string(),
  url: z.string(),
  sectionTitle: z.string().nullable(),
  sourceCategory: ChatSourceCategorySchema,
})

export const BlogChatHistoryItemSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1)
    .max(BLOG_CHAT.INPUT.MAXIMUM_QUESTION_CHARACTERS),
  answer: z.string(),
  citations: z.array(BlogChatCitationSchema),
})

export const BlogChatRequestSchema = z.object({
  question: z
    .string()
    .trim()
    .min(1)
    .max(BLOG_CHAT.INPUT.MAXIMUM_QUESTION_CHARACTERS),
  locale: z.enum(LOCALES.SUPPORTED).default(LOCALES.DEFAULT),
  currentPostSlug: z.string().trim().min(1).max(200).optional(),
  conversationHistory: z
    .array(BlogChatHistoryItemSchema)
    .max(2)
    .optional()
    .default([]),
})

export const BlogChatResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(BlogChatCitationSchema),
  grounded: z.boolean(),
  followUpSuggestions: z
    .array(z.string().trim().min(1).max(120))
    .max(BLOG_CHAT.FOLLOW_UP.MAXIMUM_SUGGESTION_COUNT)
    .optional(),
  refusalReason: z
    .enum([
      'insufficient_search_match',
      'insufficient_evidence',
      'invalid_citations',
      'missing_api_key',
      'model_error',
      'rate_limited',
      'question_too_long',
      'daily_limit_exceeded',
    ])
    .optional(),
})

export const BlogChatModelDraftSchema = z.object({
  answer: z.string(),
  usedCitationUrls: z.array(z.string()).max(3),
  refusalReason: z.enum(['insufficient_evidence']).nullable(),
})

export interface BlogChatCitation
  extends z.infer<typeof BlogChatCitationSchema> {}

export interface BlogChatHistoryItem
  extends z.infer<typeof BlogChatHistoryItemSchema> {}

export interface BlogChatResponse
  extends z.infer<typeof BlogChatResponseSchema> {}

export interface BlogChatModelDraft
  extends z.infer<typeof BlogChatModelDraftSchema> {}
