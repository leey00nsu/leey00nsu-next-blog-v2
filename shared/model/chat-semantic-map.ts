import { z } from 'zod'
import { LOCALES, type SupportedLocale } from '@/shared/config/constants'

export const CHAT_SEMANTIC_SOURCE_CATEGORIES = [
  'blog',
  'profile',
  'project',
  'assistant',
] as const

export const ChatSemanticSourceCategorySchema = z.enum(
  CHAT_SEMANTIC_SOURCE_CATEGORIES,
)

export const ChatSemanticEntrySchema = z.object({
  locale: z.enum(LOCALES.SUPPORTED),
  slug: z.string(),
  sourceCategory: ChatSemanticSourceCategorySchema,
  entityNames: z.array(z.string()),
  aliases: z.array(z.string()),
  faqQueries: z.array(z.string()),
})

export interface ChatSemanticEntry
  extends z.infer<typeof ChatSemanticEntrySchema> {}

export type GeneratedChatSemanticMap = Record<SupportedLocale, ChatSemanticEntry[]>
