import z from 'zod'

export const PostSchema = z.object({
  slug: z.string(),
  date: z.date(),
  title: z.string(),
  description: z.string(),
  image: z.string().optional(),
  tags: z.array(z.string()),
  content: z.string(),
})

export const PostMetaDataSchema = z.object({
  slug: z.string(),
  date: z.date(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
})

export type Post = z.infer<typeof PostSchema>
