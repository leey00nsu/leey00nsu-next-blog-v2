import { z } from 'zod'

export const CHAT_SOURCE_CATEGORIES = [
  'blog',
  'profile',
  'project',
  'assistant',
] as const

export const ChatSourceCategorySchema = z.enum(CHAT_SOURCE_CATEGORIES)

export const CHAT_EVIDENCE_TIME_KINDS = [
  'published',
  'updated',
  'project_started',
  'project_ended',
] as const

export const ChatEvidenceTimeKindSchema = z.enum(CHAT_EVIDENCE_TIME_KINDS)
export const ChatEvidenceTimeSchema = z.object({
  kind: ChatEvidenceTimeKindSchema,
  value: z.string().datetime(),
})

export type ChatSourceCategory = z.infer<typeof ChatSourceCategorySchema>
export type ChatEvidenceTimeKind = z.infer<typeof ChatEvidenceTimeKindSchema>
export interface ChatEvidenceTime
  extends z.infer<typeof ChatEvidenceTimeSchema> {}

export interface ChatEvidenceRecord {
  id: string
  locale: 'ko' | 'en'
  slug: string
  title: string
  url: string
  excerpt: string
  content: string
  sectionTitle: string | null
  tags: string[]
  publishedAt?: string | null
  evidenceTime?: ChatEvidenceTime | null
  searchTerms?: string[]
  sourceCategory: ChatSourceCategory
}
