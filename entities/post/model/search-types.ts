import { z } from 'zod'
import type { SupportedLocale } from '@/shared/config/constants'

export const BlogSearchRecordSchema = z.object({
  id: z.string(),
  locale: z.enum(['ko', 'en']),
  slug: z.string(),
  title: z.string(),
  url: z.string(),
  excerpt: z.string(),
  content: z.string(),
  sectionTitle: z.string().nullable(),
  tags: z.array(z.string()),
})

export interface BlogSearchRecord
  extends z.infer<typeof BlogSearchRecordSchema> {}

export type GeneratedBlogSearchRecordMap = Record<
  SupportedLocale,
  BlogSearchRecord[]
>
