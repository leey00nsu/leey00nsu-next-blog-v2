import z from 'zod'

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
})

export const PostSchema = z.object({
  ...PostMetaDataSchema.shape,
  content: z.string(),
})

export type Post = z.infer<typeof PostSchema>
