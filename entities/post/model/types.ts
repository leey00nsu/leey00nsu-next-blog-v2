import z from 'zod'
import type { SupportedLocale } from '@/shared/config/constants'

export const PostMetaDataSchema = z.object({
  slug: z.string(),
  date: z.date(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  section: z.string(),
  series: z.string().nullable(),
  thumbnail: z.string().nullable(),
  draft: z.boolean().default(true),
  blurDataURL: z.string().optional(),
  writer: z.string(),
})

export const PostSchema = z.object({
  ...PostMetaDataSchema.shape,
  content: z.string(),
  width: z.number(),
  height: z.number(),
  isAnimated: z.boolean().optional(),
})

export type Post = z.infer<typeof PostSchema>

export interface GeneratedPostSerialized {
  slug: string
  date: string
  title: string
  description: string
  tags: string[]
  section: string
  series: string | null
  thumbnail: string | null
  draft: boolean
  blurDataURL?: string
  writer: string
  content: string
  width: number
  height: number
  isAnimated?: boolean
}

export type GeneratedPostsMap = Record<
  SupportedLocale,
  Record<string, GeneratedPostSerialized>
>

export interface ThumbnailMetadata {
  width: number
  height: number
  base64: string
  isAnimated?: boolean
}

export type ThumbnailMetadataMap = Record<string, ThumbnailMetadata>
