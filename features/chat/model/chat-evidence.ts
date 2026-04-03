import { z } from 'zod'

export const CHAT_SOURCE_CATEGORIES = [
  'blog',
  'profile',
  'project',
] as const

export const ChatSourceCategorySchema = z.enum(CHAT_SOURCE_CATEGORIES)

export type ChatSourceCategory = z.infer<typeof ChatSourceCategorySchema>

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
  sourceCategory: ChatSourceCategory
}
